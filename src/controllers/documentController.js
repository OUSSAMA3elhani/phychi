/**
 * Contrôleur de streaming de documents PDF pour PhyChemia.
 *
 * Permet de diffuser les fichiers PDF directement au visionneur PDF.js
 * sans exposer les clés privées ni stocker inutilement les fichiers sur GoDaddy.
 */

const fs = require('node:fs');
const path = require('node:path');
const googleDriveService = require('../services/googleDriveService');
const { pool } = require('../../config/db');

const ROOT = path.resolve(__dirname, '..', '..');

/** Helper de nettoyage et sécurisation du nom de fichier PDF */
function sanitizeFileName(name) {
    return String(name || 'document')
        .replace(/[/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^[-_]+|[-_]+$/g, '')
        .trim();
}

/** Résolution du nom réel et descriptif du document pour téléchargement et SEO */
async function resolveFriendlyFileName(fileIdOrKey, fallbackName) {
    if (!fileIdOrKey) return fallbackName || 'PhyChemia_Document.pdf';
    const cleanId = path.basename(fileIdOrKey);

    try {
        // 1. Concours
        const [c] = await pool.query(
            'SELECT ecole, annee, epreuve, filiere, matiere, enonce_file, correction_file FROM concours WHERE enonce_file LIKE ? OR correction_file LIKE ? LIMIT 1',
            [`%${cleanId}%`, `%${cleanId}%`]
        );
        if (c.length > 0) {
            const item = c[0];
            const isCorr = item.correction_file && item.correction_file.includes(cleanId);
            const typeStr = isCorr ? 'Corrige' : 'Enonce';
            const name = `PhyChemia_${item.ecole}_${item.annee}_${item.epreuve}_${item.filiere}_${typeStr}.pdf`;
            return sanitizeFileName(name);
        }

        // 2. Livres
        const [b] = await pool.query(
            'SELECT titre, auteur, collection FROM books WHERE pdf_file LIKE ? LIMIT 1',
            [`%${cleanId}%`]
        );
        if (b.length > 0) {
            const item = b[0];
            const name = `PhyChemia_Livre_${item.auteur}_${item.titre}.pdf`;
            return sanitizeFileName(name);
        }

        // 3. Cours
        const [co] = await pool.query(
            'SELECT c.titre, d.nom as discipline FROM courses c LEFT JOIN chapters ch ON c.chapter_id = ch.id LEFT JOIN disciplines d ON ch.discipline_id = d.id WHERE c.course_file LIKE ? LIMIT 1',
            [`%${cleanId}%`]
        );
        if (co.length > 0) {
            const item = co[0];
            const disc = item.discipline ? `${item.discipline}_` : '';
            const name = `PhyChemia_Cours_${disc}${item.titre}.pdf`;
            return sanitizeFileName(name);
        }

        // 4. Exercices
        const [ex] = await pool.query(
            'SELECT titre, enonce_file, correction_file FROM exercises WHERE enonce_file LIKE ? OR correction_file LIKE ? LIMIT 1',
            [`%${cleanId}%`, `%${cleanId}%`]
        );
        if (ex.length > 0) {
            const item = ex[0];
            const isCorr = item.correction_file && item.correction_file.includes(cleanId);
            const name = `PhyChemia_Exercice_${item.titre}_${isCorr ? 'Corrige' : 'Enonce'}.pdf`;
            return sanitizeFileName(name);
        }
    } catch (err) {
        console.warn('[DocumentController] Erreur resolveFriendlyFileName:', err.message);
    }

    if (fallbackName && fallbackName !== 'document.pdf') {
        return sanitizeFileName(fallbackName);
    }
    return 'PhyChemia_Document.pdf';
}

const documentController = {
    /**
     * Endpoint de streaming : GET /api/documents/stream/:fileKey?
     * Paramètres acceptés :
     *   - Req.params.fileKey
     *   - Req.query.path
     *   - Req.query.fileId
     *   - Req.query.download (si 1, force le téléchargement au lieu de l'affichage inline)
     */
    async streamDocument(req, res, next) {
        try {
            const rawKey = req.params.fileKey || req.query.path || req.query.fileId || req.query.file;
            const isDownload = req.query.download === '1' || req.query.dl === '1';

            if (!rawKey) {
                return res.status(400).json({
                    error: 'Fichier non spécifié',
                    message: 'Veuillez fournir une clé de fichier, un chemin ou un fileId.'
                });
            }

            const cleanKey = decodeURIComponent(rawKey).trim();

            // 1. Tenter la résolution Google Drive API en PREMIER (Drive-first strategy)
            let fileId = googleDriveService.resolveFileId(cleanKey);
            if (!fileId) {
                fileId = await googleDriveService.searchDriveFileByName(cleanKey);
            }

            if (fileId) {
                try {
                    let metadata = { name: 'document.pdf', mimeType: 'application/pdf', size: null };
                    try {
                        metadata = await googleDriveService.getFileMetadata(fileId);
                    } catch (metaErr) {
                        console.warn(`[DocumentController] Impossible de lire les métadonnées pour ${fileId}:`, metaErr.message);
                    }

                    const rawFilename = metadata.name || path.basename(cleanKey) || 'document.pdf';
                    const filename = await resolveFriendlyFileName(fileId, rawFilename);
                    const mimeType = metadata.mimeType || 'application/pdf';
                    const disposition = isDownload ? 'attachment' : 'inline';

                    res.setHeader('Content-Type', mimeType);
                    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(filename)}"`);
                    res.setHeader('Accept-Ranges', 'bytes');
                    res.setHeader('Cache-Control', 'public, max-age=86400');

                    if (metadata.size) {
                        res.setHeader('Content-Length', metadata.size);
                    }

                    const driveStream = await googleDriveService.getFileStream(fileId);

                    driveStream.on('error', (streamErr) => {
                        console.error(`[DocumentController] Erreur pendant le streaming Drive du fichier ${fileId}:`, streamErr.message);
                        if (!res.headersSent) {
                            res.status(502).json({
                                error: 'Erreur de transmission Google Drive',
                                message: 'Impossible de diffuser le document depuis Google Drive.'
                            });
                        }
                    });

                    return driveStream.pipe(res);
                } catch (driveErr) {
                    console.warn(`[DocumentController] Échec du streaming Drive pour ${fileId}, tentative de secours local :`, driveErr.message);
                }
            }

            // 2. Repli de secours : Vérifier si le fichier existe physiquement sur le disque local
            const relativeLocalPath = cleanKey.startsWith('/') ? cleanKey.slice(1) : cleanKey;
            const localCandidate = path.join(ROOT, 'public', 'assets', 'downloads', relativeLocalPath);
            const uploadsCandidate = path.join(ROOT, 'public', relativeLocalPath);

            let localPathToServe = null;
            if (fs.existsSync(localCandidate) && fs.statSync(localCandidate).isFile()) {
                localPathToServe = localCandidate;
            } else if (fs.existsSync(uploadsCandidate) && fs.statSync(uploadsCandidate).isFile()) {
                localPathToServe = uploadsCandidate;
            }

            if (localPathToServe) {
                const stat = fs.statSync(localPathToServe);
                const rawFilename = path.basename(localPathToServe);
                const filename = await resolveFriendlyFileName(cleanKey, rawFilename);
                const disposition = isDownload ? 'attachment' : 'inline';

                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Length', stat.size);
                res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(filename)}"`);
                res.setHeader('Accept-Ranges', 'bytes');
                res.setHeader('Cache-Control', 'public, max-age=86400');

                const fileStream = fs.createReadStream(localPathToServe);
                fileStream.on('error', (err) => {
                    console.error('[DocumentController] Erreur flux local :', err);
                    if (!res.headersSent) res.status(500).send('Erreur de lecture du fichier local.');
                });
                return fileStream.pipe(res);
            }

            // 3. Ni Google Drive ni fichier local trouvé
            return res.status(404).json({
                error: 'Document introuvable',
                message: `Le fichier spécifié (${cleanKey}) n'a pas pu être localisé.`
            });

        } catch (err) {
            console.error('[DocumentController] Erreur globale de streaming :', err.message);
            if (!res.headersSent) {
                return res.status(500).json({
                    error: 'Erreur serveur',
                    message: 'Une erreur est survenue lors du chargement du document.'
                });
            }
        }
    }
};

module.exports = documentController;
