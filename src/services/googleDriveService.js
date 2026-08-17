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
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, webViewLink, webContentLink)',
            pageSize: 1000
        });

        const items = res.data.files || [];

        for (const item of items) {
            const itemPath = pathPrefix ? `${pathPrefix}/${item.name}` : item.name;

            if (item.mimeType === 'application/vnd.google-apps.folder') {
                await walk(item.id, itemPath);
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

    for (const file of driveFiles) {
        const driveUrl = file.previewUrl;
        const fileName = file.name.trim();

        // 1. Match Courses by filename
        const [courseMatches] = await pool.query(
            'SELECT id, course_file FROM courses WHERE course_file LIKE ? OR course_file LIKE ?',
            [`%${fileName}%`, `%${encodeURIComponent(fileName)}%`]
        );
        for (const c of courseMatches) {
            await pool.query('UPDATE courses SET course_file = ? WHERE id = ?', [driveUrl, c.id]);
            syncedCount++;
        }

        // 2. Match Exercises (enonce & correction) by filename
        const [exMatches] = await pool.query(
            'SELECT id, enonce_file, correction_file FROM exercises WHERE enonce_file LIKE ? OR correction_file LIKE ?',
            [`%${fileName}%`, `%${fileName}%`]
        );
        for (const e of exMatches) {
            await pool.query(
                'UPDATE exercises SET enonce_file = IF(enonce_file LIKE ?, ?, enonce_file), correction_file = IF(correction_file LIKE ?, ?, correction_file) WHERE id = ?',
                [`%${fileName}%`, driveUrl, `%${fileName}%`, driveUrl, e.id]
            );
            syncedCount++;
        }

        // 3. Match Books by filename
        const [bookMatches] = await pool.query(
            'SELECT id, pdf_file FROM books WHERE pdf_file LIKE ?',
            [`%${fileName}%`]
        );
        for (const b of bookMatches) {
            await pool.query('UPDATE books SET pdf_file = ? WHERE id = ?', [driveUrl, b.id]);
            syncedCount++;
        }

        // 4. Match Concours by filename
        const [concoursMatches] = await pool.query(
            'SELECT id FROM concours WHERE enonce_file LIKE ? OR correction_file LIKE ?',
            [`%${fileName}%`, `%${fileName}%`]
        );
        for (const cc of concoursMatches) {
            await pool.query(
                'UPDATE concours SET enonce_file = IF(enonce_file LIKE ?, ?, enonce_file), correction_file = IF(correction_file LIKE ?, ?, correction_file) WHERE id = ?',
                [`%${fileName}%`, driveUrl, `%${fileName}%`, driveUrl, cc.id]
            );
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
