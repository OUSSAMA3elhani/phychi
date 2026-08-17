/**
 * Script to synchronize Google Drive shared folder (1QSccuPuyRnzXO5s55bgp6g8O_U0f4ytD)
 * with PhyChemia MySQL database records (courses, exercises, books, concours).
 * 
 * Usage:
 *   node tools/sync-google-drive.js
 */

require('dotenv').config();
const { listAllFilesRecursive, syncDriveFilesToDb, DEFAULT_FOLDER_ID } = require('../src/services/googleDriveService');

async function main() {
    console.log('====================================================');
    console.log('   PHYCHEMIA - GOOGLE DRIVE SYNC API SERVICE');
    console.log('====================================================');
    console.log('Folder ID:', DEFAULT_FOLDER_ID);
    console.log('API Key configured:', Boolean(process.env.GOOGLE_DRIVE_API_KEY));
    console.log('');

    try {
        console.log('Fetching files from Google Drive folder...');
        const files = await listAllFilesRecursive(DEFAULT_FOLDER_ID);
        console.log(`Found ${files.length} files in Google Drive shared folder.`);

        if (files.length === 0) {
            console.log('No files found or API key required for recursive folder traversal.');
            console.log('Tip: Set GOOGLE_DRIVE_API_KEY in your .env file to enable full automated crawling!');
            return;
        }

        console.log('Syncing URLs with MySQL database records...');
        const syncedCount = await syncDriveFilesToDb(files);
        console.log(`SUCCESS! Synced ${syncedCount} database records with Google Drive URLs.`);
    } catch (err) {
        console.error('SYNC ERROR:', err.message);
        console.log('\n--- INSTRUCTIONS FOR GOOGLE DRIVE API KEY ---');
        console.log('1. Go to https://console.cloud.google.com/');
        console.log('2. Enable "Google Drive API"');
        console.log('3. Create an API Key under Credentials');
        console.log('4. Add to .env: GOOGLE_DRIVE_API_KEY="your_api_key_here"');
    }
}

main().then(() => process.exit(0)).catch(() => process.exit(1));
