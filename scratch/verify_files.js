const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

async function verifyFiles() {
    const tables = [
        { name: 'books', col: 'pdf_file' },
        { name: 'courses', col: 'course_file' },
        { name: 'exercises', col: 'enonce_file' },
        { name: 'exercises', col: 'correction_file' },
        { name: 'concours', col: 'enonce_file' },
        { name: 'concours', col: 'correction_file' }
    ];

    for (const t of tables) {
        const [rows] = await pool.query(`SELECT DISTINCT ${t.col} FROM ${t.name} WHERE ${t.col} IS NOT NULL AND ${t.col} != ''`);
        let missing = 0;
        let existing = 0;
        const missingSamples = [];

        for (const row of rows) {
            const relPath = row[t.col];
            if (relPath.startsWith('http://') || relPath.startsWith('https://')) {
                console.log(`[${t.name}.${t.col}] WARNING: Still has remote URL: ${relPath}`);
                continue;
            }
            const fullPath = path.join(publicDir, relPath.replace(/^\//, ''));
            if (fs.existsSync(fullPath)) {
                existing++;
            } else {
                missing++;
                if (missingSamples.length < 5) missingSamples.push(relPath);
            }
        }
        console.log(`[${t.name}.${t.col}] Existing: ${existing}, Missing: ${missing}`);
        if (missing > 0) {
            console.log(`   Missing samples:`, missingSamples);
        }
    }
    process.exit(0);
}

verifyFiles().catch(err => {
    console.error(err);
    process.exit(1);
});
