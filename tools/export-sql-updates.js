/**
 * PhyChemia - Exporteur de mise à jour SQL pour le serveur de production (GoDaddy/cPanel phpMyAdmin)
 *
 * Génère un fichier database/update_drive_urls.sql contenant toutes les requêtes UPDATE
 * pour basculer les chemins de fichiers vers Google Drive sur le serveur distant.
 */

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../config/db');

async function generateSqlMigration() {
    const outputPath = path.join(__dirname, '..', 'database', 'update_drive_urls.sql');
    let sql = '-- PhyChemia SQL Update: Convert document paths to Google Drive stream URLs\n\n';

    const [courses] = await pool.query("SELECT id, course_file FROM courses WHERE course_file LIKE '/api/documents/stream/%'");
    for (const c of courses) {
        sql += `UPDATE courses SET course_file = '${c.course_file}' WHERE id = ${c.id};\n`;
    }

    const [exercises] = await pool.query("SELECT id, enonce_file, correction_file FROM exercises WHERE enonce_file LIKE '/api/documents/stream/%' OR correction_file LIKE '/api/documents/stream/%'");
    for (const e of exercises) {
        sql += `UPDATE exercises SET enonce_file = '${e.enonce_file}', correction_file = '${e.correction_file}' WHERE id = ${e.id};\n`;
    }

    const [books] = await pool.query("SELECT id, pdf_file FROM books WHERE pdf_file LIKE '/api/documents/stream/%'");
    for (const b of books) {
        sql += `UPDATE books SET pdf_file = '${b.pdf_file}' WHERE id = ${b.id};\n`;
    }

    const [concours] = await pool.query("SELECT id, enonce_file, correction_file FROM concours WHERE enonce_file LIKE '/api/documents/stream/%' OR correction_file LIKE '/api/documents/stream/%'");
    for (const cc of concours) {
        sql += `UPDATE concours SET enonce_file = '${cc.enonce_file}', correction_file = '${cc.correction_file}' WHERE id = ${cc.id};\n`;
    }

    fs.writeFileSync(outputPath, sql, 'utf8');
    console.log(`Fichier SQL généré avec succès : ${outputPath}`);
    console.log(`Nombre d'instructions SQL : ${sql.split('\n').filter(l => l.startsWith('UPDATE')).length}`);
    process.exit(0);
}

generateSqlMigration().catch(err => {
    console.error('Erreur :', err);
    process.exit(1);
});
