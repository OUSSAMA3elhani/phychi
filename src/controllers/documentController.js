/**
 * Contrôleur de streaming de documents PDF pour PhyChemia.
 *
 * Permet de diffuser les fichiers PDF directement au visionneur PDF.js
 * sans exposer les clés privées ni stocker inutilement les fichiers sur GoDaddy.
 */

const fs = require('node:fs');
const path = require('node:path');
const googleDriveService = require('../services/googleDriveService');

const ROOT = path.resolve(__dirname, '..', '..');

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
            const fileId = googleDriveService.resolveFileId(cleanKey);

            if (fileId) {
                try {
                    let metadata = { name: 'document.pdf', mimeType: 'application/pdf', size: null };
                    try {
                        metadata = await googleDriveService.getFileMetadata(fileId);
                    } catch (metaErr) {
                        console.warn(`[DocumentController] Impossible de lire les métadonnées pour ${fileId}:`, metaErr.message);
                    }

                    const filename = metadata.name || path.basename(cleanKey) || 'document.pdf';
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
                const filename = path.basename(localPathToServe);
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
