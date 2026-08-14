/**
 * Exporteur complet de la base MySQL `phychi` vers `database/PhyChemia.sql`.
 * Génère le schéma complet et le dump des données (cours, chapitres, concours, exercices).
 */
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../config/db');

async function exportDatabase() {
    console.log('Génération du dump complet SQL de PhyChemia...');

    const [tableRows] = await pool.query('SHOW TABLES');
    const dbNameKey = Object.keys(tableRows[0])[0];
    const tables = tableRows.map(r => r[dbNameKey]).filter(t => t !== 'sessions');

    let sql = `-- =============================================================================\n`;
    sql += `-- DUMP COMPLET DATABASE PHYCHEMIA (CPGE / SUPÉRIEUR)\n`;
    sql += `-- Date d'exportation : ${new Date().toISOString()}\n`;
    sql += `-- Base : phychi\n`;
    sql += `-- =============================================================================\n\n`;
    sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const table of tables) {
        // Table schema
        const [createRows] = await pool.query(`SHOW CREATE TABLE \`${table}\``);
        const createSql = createRows[0]['Create Table'];

        sql += `-- -----------------------------------------------------------------------------\n`;
        sql += `-- Table : \`${table}\`\n`;
        sql += `-- -----------------------------------------------------------------------------\n`;
        sql += `DROP TABLE IF EXISTS \`${table}\`;\n`;
        sql += `${createSql};\n\n`;

        // Data rows
        const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
        if (rows.length > 0) {
            sql += `INSERT INTO \`${table}\` VALUES\n`;
            const rowStrings = rows.map(row => {
                const values = Object.values(row).map(val => {
                    if (val === null || val === undefined) return 'NULL';
                    if (typeof val === 'number') return val;
                    if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                    const escaped = String(val)
                        .replace(/\\/g, '\\\\')
                        .replace(/'/g, "\\'")
                        .replace(/\r/g, '\\r')
                        .replace(/\n/g, '\\n');
                    return `'${escaped}'`;
                });
                return `(${values.join(', ')})`;
            });
            sql += rowStrings.join(',\n') + ';\n\n';
        }
    }

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    const targetFile = path.join(__dirname, '..', 'database', 'PhyChemia.sql');
    fs.writeFileSync(targetFile, sql, 'utf8');
    console.log(`Exportation SQL réussie vers : ${targetFile}`);
    console.log(`Taille du fichier SQL généré : ${(sql.length / 1024 / 1024).toFixed(2)} MB`);
    process.exit(0);
}

exportDatabase().catch(err => {
    console.error('Erreur lors de l export SQL:', err);
    process.exit(1);
});
