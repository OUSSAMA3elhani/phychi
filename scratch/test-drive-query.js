const { google } = require('googleapis');
require('dotenv').config();

const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1QSccuPuyRnzXO5s55bgp6g8O_U0f4ytD';

console.log('Testing with API Key:', apiKey);

const drive = google.drive({ version: 'v3', auth: apiKey });

async function testQuery() {
    try {
        console.log('--- TEST 1: Standard query ---');
        const r1 = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });
        console.log('Test 1 OK! Files found:', r1.data.files.length);
    } catch (e1) {
        console.error('Test 1 FAIL:', e1.message);
    }

    try {
        console.log('--- TEST 2: Get Folder metadata ---');
        const r2 = await drive.files.get({
            fileId: folderId,
            fields: 'id, name, mimeType',
            supportsAllDrives: true
        });
        console.log('Test 2 OK! Folder name:', r2.data.name);
    } catch (e2) {
        console.error('Test 2 FAIL:', e2.message);
    }
}

testQuery().then(() => process.exit(0)).catch(() => process.exit(1));
