/**
 * Google Drive API & URL Resolver Service for PhyChemia
 * Shared Folder ID: 1QSccuPuyRnzXO5s55bgp6g8O_U0f4ytD
 */

const { google } = require('googleapis');
const { pool } = require('../../config/db');

const DEFAULT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1QSccuPuyRnzXO5s55bgp6g8O_U0f4ytD';

/**
 * Extracts a Google Drive File/Folder ID from various URL formats.
 * @param {string} url 
 * @returns {string|null}
 */
function parseDriveId(url) {
    if (!url || typeof url !== 'string') return null;
    if (/^[a-zA-Z0-9_-]{25,}$/.test(url.trim())) return url.trim();

    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return fileMatch[1];

    const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch) return idParamMatch[1];

    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return folderMatch[1];

    return null;
}

/**
 * Generates an embedded iframe preview URL for Google Drive files.
 * @param {string} fileIdOrUrl 
 * @returns {string}
 */
function getPreviewUrl(fileIdOrUrl) {
    const id = parseDriveId(fileIdOrUrl);
    if (id) {
        return `https://drive.google.com/file/d/${id}/preview`;
    }
    return fileIdOrUrl;
}

/**
 * Generates a direct stream/download URL for Google Drive files.
 * @param {string} fileIdOrUrl 
 * @returns {string}
 */
function getDownloadUrl(fileIdOrUrl) {
    const id = parseDriveId(fileIdOrUrl);
    if (id) {
        return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    return fileIdOrUrl;
}

/**
 * Lists all files inside a public or shared Google Drive folder using Google Drive API v3.
 * @param {string} folderId 
 * @param {string} [apiKey] 
 * @returns {Promise<Array<{id: string, name: string, mimeType: string, webViewLink: string, webContentLink: string}>>}
 */
async function listFolderFiles(folderId = DEFAULT_FOLDER_ID, apiKey = process.env.GOOGLE_DRIVE_API_KEY) {
    const key = apiKey || process.env.GOOGLE_DRIVE_API_KEY;
    
    if (!key) {
        console.warn('[GoogleDriveService] Warning: GOOGLE_DRIVE_API_KEY is not set in .env. Attempting public fetch fallback.');
    }

    const drive = google.drive({ version: 'v3', auth: key });
    
    try {
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, webViewLink, webContentLink, parents)',
            pageSize: 1000
        });

        return res.data.files || [];
    } catch (err) {
        console.error('[GoogleDriveService] Error listing Google Drive folder files:', err.message);
        throw err;
    }
}

/**
 * Recursively fetches all files and subfolders from Google Drive.
 * @param {string} parentFolderId 
 * @param {string} currentPath 
 * @param {string} apiKey 
 * @returns {Promise<Array<{id: string, name: string, path: string, webViewLink: string, previewUrl: string, downloadUrl: string}>>}
 */
async function listAllFilesRecursive(parentFolderId = DEFAULT_FOLDER_ID, currentPath = '', apiKey = process.env.GOOGLE_DRIVE_API_KEY) {
    const key = apiKey || process.env.GOOGLE_DRIVE_API_KEY;
    const drive = google.drive({ version: 'v3', auth: key });
    let allFiles = [];

    async function walk(folderId, pathPrefix) {
        let nextPageToken = null;
        let items = [];

        do {
            const res = await drive.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink)',
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
                    webViewLink: item.webViewLink,
                    previewUrl: getPreviewUrl(item.id),
                    downloadUrl: getDownloadUrl(item.id)
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
 * Automatically syncs Google Drive file URLs into MySQL database tables (courses, exercises, books, concours).
 * Matches files by name or relative path.
 * @param {Array<{id: string, name: string, previewUrl: string, downloadUrl: string}>} driveFiles 
 */
async function syncDriveFilesToDb(driveFiles) {
    let syncedCount = 0;

    console.log('Loading database records into memory...');
    const [courses] = await pool.query('SELECT id, course_file, titre FROM courses');
    const [exercises] = await pool.query('SELECT id, enonce_file, correction_file, titre FROM exercises');
    const [books] = await pool.query('SELECT id, pdf_file, titre FROM books');
    const [concours] = await pool.query('SELECT id, enonce_file, correction_file, titre FROM concours');

    const fileMap = new Map();
    for (const f of driveFiles) {
        if (!f.name) continue;
        const normName = f.name.trim().toLowerCase();
        fileMap.set(normName, f.previewUrl);
    }

    // 1. Update Courses
    for (const c of courses) {
        if (!c.course_file) continue;
        const baseName = c.course_file.split('/').pop().trim().toLowerCase();
        const driveUrl = fileMap.get(baseName);
        if (driveUrl && c.course_file !== driveUrl) {
            await pool.query('UPDATE courses SET course_file = ? WHERE id = ?', [driveUrl, c.id]);
            syncedCount++;
        }
    }

    // 2. Update Exercises
    for (const e of exercises) {
        let newEnonce = e.enonce_file;
        let newCorr = e.correction_file;
        let updated = false;

        if (e.enonce_file) {
            const base = e.enonce_file.split('/').pop().trim().toLowerCase();
            const driveUrl = fileMap.get(base);
            if (driveUrl && e.enonce_file !== driveUrl) {
                newEnonce = driveUrl;
                updated = true;
            }
        }
        if (e.correction_file) {
            const base = e.correction_file.split('/').pop().trim().toLowerCase();
            const driveUrl = fileMap.get(base);
            if (driveUrl && e.correction_file !== driveUrl) {
                newCorr = driveUrl;
                updated = true;
            }
        }
        if (updated) {
            await pool.query('UPDATE exercises SET enonce_file = ?, correction_file = ? WHERE id = ?', [newEnonce, newCorr, e.id]);
            syncedCount++;
        }
    }

    // 3. Update Books
    for (const b of books) {
        if (!b.pdf_file) continue;
        const baseName = b.pdf_file.split('/').pop().trim().toLowerCase();
        const driveUrl = fileMap.get(baseName);
        if (driveUrl && b.pdf_file !== driveUrl) {
            await pool.query('UPDATE books SET pdf_file = ? WHERE id = ?', [driveUrl, b.id]);
            syncedCount++;
        }
    }

    // 4. Update Concours
    for (const cc of concours) {
        let newEnonce = cc.enonce_file;
        let newCorr = cc.correction_file;
        let updated = false;

        if (cc.enonce_file) {
            const base = cc.enonce_file.split('/').pop().trim().toLowerCase();
            const driveUrl = fileMap.get(base);
            if (driveUrl && cc.enonce_file !== driveUrl) {
                newEnonce = driveUrl;
                updated = true;
            }
        }
        if (cc.correction_file) {
            const base = cc.correction_file.split('/').pop().trim().toLowerCase();
            const driveUrl = fileMap.get(base);
            if (driveUrl && cc.correction_file !== driveUrl) {
                newCorr = driveUrl;
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
    getPreviewUrl,
    getDownloadUrl,
    listFolderFiles,
    listAllFilesRecursive,
    syncDriveFilesToDb
};
