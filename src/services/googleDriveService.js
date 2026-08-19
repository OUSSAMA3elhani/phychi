/**
 * Google Drive API Service & Streaming Proxy for PhyChemia
 * Shared Folder ID: 1QSccuPuyRnzXO5s55bgp6g8O_U0fYtD
 */

const fs = require('node:fs');
const path = require('node:path');
const { google } = require('googleapis');
const { pool } = require('../../config/db');

const DEFAULT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID || '1QSccuPuyRnzXO5s55bgp6g8O_U0f4ytD';
const MAPPING_FILE_PATH = path.join(__dirname, '..', '..', 'config', 'driveMapping.json');

// Cache pour la cartographie
let driveMappingCache = null;

/**
 * Charge la cartographie depuis config/driveMapping.json.
 */
function loadDriveMapping() {
    if (driveMappingCache) return driveMappingCache;
    try {
        if (fs.existsSync(MAPPING_FILE_PATH)) {
            const raw = fs.readFileSync(MAPPING_FILE_PATH, 'utf8');
            driveMappingCache = JSON.parse(raw);
            return driveMappingCache;
        }
    } catch (err) {
        console.warn('[GoogleDriveService] Avertissement: Impossible de lire driveMapping.json :', err.message);
    }
    return { byPath: {}, byFilename: {}, byFileId: {} };
}

/**
 * Initialise l'authentification Google (Service Account ou Cle API).
 */
function getAuthClient() {
    // 1. Service Account via variables d'environnement (GoDaddy / Prod)
    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
        return new google.auth.JWT({
            email: process.env.GOOGLE_CLIENT_EMAIL,
            key: privateKey,
            scopes: ['https://www.googleapis.com/auth/drive.readonly']
        });
    }

    // 2. Service Account via fichier JSON
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH && fs.existsSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH)) {
        return new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
            scopes: ['https://www.googleapis.com/auth/drive.readonly']
        });
    }

    // 3. Fallback Cle API
    if (process.env.GOOGLE_DRIVE_API_KEY) {
        return process.env.GOOGLE_DRIVE_API_KEY;
    }

    return null;
}

/**
 * Obtient l'instance du client Drive API v3.
 */
function getDriveInstance() {
    const auth = getAuthClient();
    const driveOptions = { version: 'v3' };
    if (auth) driveOptions.auth = auth;
    return google.drive(driveOptions);
}

/**
 * Extrait un ID de fichier/dossier Google Drive a partir de divers formats d'URL.
 * @param {string} url 
 * @returns {string|null}
 */
function parseDriveId(url) {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) return trimmed;

    const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return fileMatch[1];

    const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch) return idParamMatch[1];

    const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return folderMatch[1];

    return null;
}

/**
 * Résout un ID de fichier Google Drive à partir d'un chemin, nom de fichier ou URL.
 * @param {string} fileKeyOrPath 
 * @returns {string|null}
 */
function resolveFileId(fileKeyOrPath) {
    if (!fileKeyOrPath || typeof fileKeyOrPath !== 'string') return null;

    // 1. Déjà un ID Google Drive direct
    const directId = parseDriveId(fileKeyOrPath);
    if (directId && directId.length >= 25 && !fileKeyOrPath.includes('/')) return directId;

    // 2. Recherche dans driveMapping.json
    const mapping = loadDriveMapping();
    const cleanKey = fileKeyOrPath.trim();
    const lowerKey = cleanKey.toLowerCase();
    const baseName = path.basename(cleanKey).toLowerCase();

    if (mapping.byPath && mapping.byPath[cleanKey]) {
        return mapping.byPath[cleanKey].id;
    }
    if (mapping.byPath && mapping.byPath[lowerKey]) {
        return mapping.byPath[lowerKey].id;
    }
    if (mapping.byFilename && mapping.byFilename[baseName]) {
        return mapping.byFilename[baseName].id;
    }

    // 3. Fallback extraction directe depuis l'URL
    return directId;
}

/**
 * Récupère les métadonnées d'un fichier Google Drive (nom, taille, mimeType).
 * @param {string} fileId 
 * @returns {Promise<{id: string, name: string, mimeType: string, size: number}>}
 */
async function getFileMetadata(fileId) {
    const drive = getDriveInstance();
    try {
        const res = await drive.files.get({
            fileId,
            fields: 'id, name, mimeType, size',
            supportsAllDrives: true
        });
        return {
            id: res.data.id,
            name: res.data.name,
            mimeType: res.data.mimeType || 'application/pdf',
            size: res.data.size ? parseInt(res.data.size, 10) : null
        };
    } catch (err) {
        console.error(`[GoogleDriveService] Erreur lors de la lecture des métadonnées du fichier ${fileId}:`, err.message);
        throw err;
    }
}

/**
 * Ouvre un flux de lecture (ReadStream) pour un fichier Google Drive.
 * @param {string} fileId 
 * @param {object} [options]
 * @returns {Promise<import('stream').Readable>}
 */
async function getFileStream(fileId, options = {}) {
    const drive = getDriveInstance();
    const reqOptions = { responseType: 'stream' };

    if (options.headers) {
        reqOptions.headers = options.headers;
    }

    try {
        const res = await drive.files.get({
            fileId,
            alt: 'media',
            supportsAllDrives: true
        }, reqOptions);

        return res.data;
    } catch (err) {
        console.error(`[GoogleDriveService] Erreur de création du flux pour le fichier ${fileId}:`, err.message);
        throw err;
    }
}

/**
 * Genere une URL d'apercu iframe pour Google Drive.
 * @param {string} fileIdOrUrl 
 * @returns {string}
 */
function getPreviewUrl(fileIdOrUrl) {
    const id = parseDriveId(fileIdOrUrl);
    if (id) {
        return `/api/documents/stream/${id}`;
    }
    return fileIdOrUrl;
}

/**
 * Genere une URL de telechargement direct pour Google Drive.
 * @param {string} fileIdOrUrl 
 * @returns {string}
 */
function getDownloadUrl(fileIdOrUrl) {
    const id = parseDriveId(fileIdOrUrl);
    if (id) {
        return `/api/documents/stream/${id}?download=1`;
    }
    return fileIdOrUrl;
}

/**
 * Liste les fichiers d'un dossier Google Drive.
 */
async function listFolderFiles(folderId = DEFAULT_FOLDER_ID, apiKey = process.env.GOOGLE_DRIVE_API_KEY) {
    const drive = getDriveInstance();
    try {
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, webViewLink, webContentLink, parents)',
            pageSize: 1000
        });
        return res.data.files || [];
    } catch (err) {
        console.error('[GoogleDriveService] Erreur de listage du dossier :', err.message);
        throw err;
    }
}

/**
 * Liste récursivement les fichiers d'un dossier Google Drive.
 */
async function listAllFilesRecursive(parentFolderId = DEFAULT_FOLDER_ID, currentPath = '') {
    const drive = getDriveInstance();
    let allFiles = [];

    async function walk(folderId, pathPrefix) {
        let nextPageToken = null;
        let items = [];

        do {
            const res = await drive.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'nextPageToken, files(id, name, mimeType, size, webViewLink, webContentLink)',
                pageSize: 1000,
                pageToken: nextPageToken || undefined
            });

            if (res.data.files && res.data.files.length > 0) {
                items.push(...res.data.files);
            }
            nextPageToken = res.data.nextPageToken;
        } while (nextPageToken);

        const subfolderPromises = [];

        for (const item of items) {
            const itemPath = pathPrefix ? `${pathPrefix}/${item.name}` : item.name;

            if (item.mimeType === 'application/vnd.google-apps.folder') {
                subfolderPromises.push(walk(item.id, itemPath));
            } else {
                allFiles.push({
                    id: item.id,
                    name: item.name,
                    path: itemPath,
                    mimeType: item.mimeType,
                    size: item.size ? parseInt(item.size, 10) : null,
                    previewUrl: `/api/documents/stream/${item.id}`,
                    downloadUrl: `/api/documents/stream/${item.id}?download=1`
                });
            }
        }

        if (subfolderPromises.length > 0) {
            await Promise.all(subfolderPromises);
        }
    }

    await walk(parentFolderId, currentPath);
    return allFiles;
}

/**
 * Synchronise les URL Google Drive dans la base de données.
 */
async function syncDriveFilesToDb(driveFiles) {
    let syncedCount = 0;

    const [courses] = await pool.query('SELECT id, course_file FROM courses');
    const [exercises] = await pool.query('SELECT id, enonce_file, correction_file FROM exercises');
    const [books] = await pool.query('SELECT id, pdf_file FROM books');
    const [concours] = await pool.query('SELECT id, enonce_file, correction_file FROM concours');

    const fileMap = new Map();
    for (const f of driveFiles) {
        if (!f.name) continue;
        const normName = f.name.trim().toLowerCase();
        fileMap.set(normName, `/api/documents/stream/${f.id}`);
    }

    for (const c of courses) {
        if (!c.course_file) continue;
        const baseName = c.course_file.split('/').pop().trim().toLowerCase();
        const streamUrl = fileMap.get(baseName);
        if (streamUrl && c.course_file !== streamUrl) {
            await pool.query('UPDATE courses SET course_file = ? WHERE id = ?', [streamUrl, c.id]);
            syncedCount++;
        }
    }

    for (const e of exercises) {
        let newEnonce = e.enonce_file;
        let newCorr = e.correction_file;
        let updated = false;

        if (e.enonce_file) {
            const base = e.enonce_file.split('/').pop().trim().toLowerCase();
            const streamUrl = fileMap.get(base);
            if (streamUrl && e.enonce_file !== streamUrl) {
                newEnonce = streamUrl;
                updated = true;
            }
        }
        if (e.correction_file) {
            const base = e.correction_file.split('/').pop().trim().toLowerCase();
            const streamUrl = fileMap.get(base);
            if (streamUrl && e.correction_file !== streamUrl) {
                newCorr = streamUrl;
                updated = true;
            }
        }
        if (updated) {
            await pool.query('UPDATE exercises SET enonce_file = ?, correction_file = ? WHERE id = ?', [newEnonce, newCorr, e.id]);
            syncedCount++;
        }
    }

    for (const b of books) {
        if (!b.pdf_file) continue;
        const baseName = b.pdf_file.split('/').pop().trim().toLowerCase();
        const streamUrl = fileMap.get(baseName);
        if (streamUrl && b.pdf_file !== streamUrl) {
            await pool.query('UPDATE books SET pdf_file = ? WHERE id = ?', [streamUrl, b.id]);
            syncedCount++;
        }
    }

    for (const cc of concours) {
        let newEnonce = cc.enonce_file;
        let newCorr = cc.correction_file;
        let updated = false;

        if (cc.enonce_file) {
            const base = cc.enonce_file.split('/').pop().trim().toLowerCase();
            const streamUrl = fileMap.get(base);
            if (streamUrl && cc.enonce_file !== streamUrl) {
                newEnonce = streamUrl;
                updated = true;
            }
        }
        if (cc.correction_file) {
            const base = cc.correction_file.split('/').pop().trim().toLowerCase();
            const streamUrl = fileMap.get(base);
            if (streamUrl && cc.correction_file !== streamUrl) {
                newCorr = streamUrl;
                updated = true;
            }
        }
        if (updated) {
            await pool.query('UPDATE concours SET enonce_file = ?, correction_file = ? WHERE id = ?', [newEnonce, newCorr, cc.id]);
            syncedCount++;
        }
    }

    return syncedCount;
}

module.exports = {
    DEFAULT_FOLDER_ID,
    parseDriveId,
    resolveFileId,
    getFileMetadata,
    getFileStream,
    getPreviewUrl,
    getDownloadUrl,
    listFolderFiles,
    listAllFilesRecursive,
    syncDriveFilesToDb
};
