const https = require('https');
const { pool } = require('../config/db');

const folderUrl = 'https://drive.google.com/drive/folders/1QSccuPuyRnzXO5s55bgp6g8O_U0f4ytD';

https.get(folderUrl, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', async () => {
        console.log('HTML Length:', body.length);
        
        // Find file ID and title patterns in Google Drive HTML payload
        const regex = /"([a-zA-Z0-9_-]{28,35})",\["([^"]+)"/g;
        let match;
        let found = 0;

        while ((match = regex.exec(body)) !== null) {
            const id = match[1];
            const name = match[2];

            if (name.endsWith('.pdf') || name.includes('Chapitre') || name.includes('Theme')) {
                console.log(`FOUND DRIVE FILE -> ID: ${id} | NAME: ${name}`);
                found++;

                const drivePreviewUrl = `https://drive.google.com/file/d/${id}/preview`;

                // Update courses matching this name
                await pool.query(
                    'UPDATE courses SET course_file = ? WHERE course_file LIKE ? OR titre LIKE ?',
                    [drivePreviewUrl, `%${name}%`, `%${name}%`]
                );
                // Update exercises matching this name
                await pool.query(
                    'UPDATE exercises SET enonce_file = IF(enonce_file LIKE ?, ?, enonce_file), correction_file = IF(correction_file LIKE ?, ?, correction_file) WHERE enonce_file LIKE ? OR correction_file LIKE ? OR titre LIKE ?',
                    [`%${name}%`, drivePreviewUrl, `%${name}%`, drivePreviewUrl, `%${name}%`, `%${name}%`, `%${name}%`]
                );
                // Update books matching this name
                await pool.query(
                    'UPDATE books SET pdf_file = ? WHERE pdf_file LIKE ? OR titre LIKE ?',
                    [drivePreviewUrl, `%${name}%`, `%${name}%`]
                );
                // Update concours matching this name
                await pool.query(
                    'UPDATE concours SET enonce_file = IF(enonce_file LIKE ?, ?, enonce_file), correction_file = IF(correction_file LIKE ?, ?, correction_file) WHERE enonce_file LIKE ? OR correction_file LIKE ? OR titre LIKE ?',
                    [`%${name}%`, drivePreviewUrl, `%${name}%`, drivePreviewUrl, `%${name}%`, `%${name}%`, `%${name}%`]
                );
            }
        }

        console.log(`TOTAL DRIVE FILES MATCHED: ${found}`);
        process.exit(0);
    });
}).on('error', err => {
    console.error(err);
    process.exit(1);
});
