/**
 * PhyChemia - Générateur de cartographie des fichiers Google Drive.
 *
 * Scanne récursivement le dossier racine partagé Google Drive
 * (ID: 1QSccuPuyRnzXO5s55bgp6g8O_U0fYtD par défaut)
 * et sauvegarde la cartographie dans config/driveMapping.json.
 *
 * Utilisation :
 *   node tools/generate-drive-mapping.js
 */

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { google } = require('googleapis');

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID || '1QSccuPuyRnzXO5s55bgp6g8O_U0f4ytD';
const MAPPING_FILE_PATH = path.join(__dirname, '..', 'config', 'driveMapping.json');

/**
 * Initialise le client d'authentification Google (Service Account ou Cle API).
 */
function getGoogleAuthClient() {
    // 1. Service Account via variables d'environnement
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

    console.warn('[GenerateDriveMapping] Aucun identifiant Service Account ou clé API trouvé. Essai en accès public.');
    return null;
}

async function generateMapping() {
    console.log('=== GENERATION DE LA CARTOGRAPHIE GOOGLE DRIVE ===');
    console.log(`ID du dossier racine : ${ROOT_FOLDER_ID}`);
    console.log(`Fichier cible        : ${MAPPING_FILE_PATH}\n`);

    const auth = getGoogleAuthClient();
    const driveOptions = { version: 'v3' };
    if (auth) driveOptions.auth = auth;

    const drive = google.drive(driveOptions);
    const mapping = {
        byPath: {},
        byFilename: {},
        byFileId: {},
        updatedAt: new Date().toISOString()
    };

    let totalFilesScanned = 0;
    let totalFoldersScanned = 0;

    async function scanFolder(folderId, currentPath = '') {
        totalFoldersScanned++;
        let nextPageToken = null;

        do {
            try {
                const res = await drive.files.list({
                    q: `'${folderId}' in parents and trashed = false`,
                    fields: 'nextPageToken, files(id, name, mimeType, size, webViewLink, webContentLink)',
                    pageSize: 1000,
                    pageToken: nextPageToken || undefined,
                    supportsAllDrives: true,
                    includeItemsFromAllDrives: true,
                });

                const items = res.data.files || [];
                nextPageToken = res.data.nextPageToken;

                for (const item of items) {
                    const itemRelPath = currentPath ? `${currentPath}/${item.name}` : item.name;

                    if (item.mimeType === 'application/vnd.google-apps.folder') {
                        await scanFolder(item.id, itemRelPath);
                    } else {
                        totalFilesScanned++;
                        const record = {
                            id: item.id,
                            name: item.name,
                            path: itemRelPath,
                            mimeType: item.mimeType,
                            size: item.size ? parseInt(item.size, 10) : 0,
                        };

                        mapping.byPath[itemRelPath] = record;
                        mapping.byPath[itemRelPath.toLowerCase()] = record;
                        
                        const lowerName = item.name.trim().toLowerCase();
                        mapping.byFilename[lowerName] = record;

                        mapping.byFileId[item.id] = record;

                        if (totalFilesScanned % 50 === 0) {
                            console.log(`  Scanné : ${totalFilesScanned} fichiers... (${itemRelPath})`);
                        }
                    }
                }
            } catch (err) {
                console.error(`[GenerateDriveMapping] Erreur lors du scan du dossier ${folderId} (${currentPath}):`, err.message);
                break;
            }
        } while (nextPageToken);
    }

    try {
        await scanFolder(ROOT_FOLDER_ID);

        fs.writeFileSync(MAPPING_FILE_PATH, JSON.stringify(mapping, null, 2), 'utf8');

        console.log('\n=========================================================');
        console.log('CARTOGRAPHIE GOOGLE DRIVE GENEREE AVEC SUCCES');
        console.log(`Dossiers scannés    : ${totalFoldersScanned}`);
        console.log(`Fichiers cartographiés: ${totalFilesScanned}`);
        console.log(`Fichier écrit       : ${MAPPING_FILE_PATH}`);
        console.log('=========================================================\n');
    } catch (err) {
        console.error('[GenerateDriveMapping] Échec de la génération :', err);
        process.exit(1);
    }
}

generateMapping();
