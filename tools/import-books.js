/**
 * Ingestion Script for Physics and Chemistry Books.
 * Usage: node tools/import-books.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

const bookFolders = [
    { dir: 'garing', discipline: 'Physique', collection: 'Garing', defaultAuteur: 'Christian Garing' },
    { dir: 'H-prepa physique', discipline: 'Physique', collection: 'H-Prépa', defaultAuteur: 'Collectif H-Prépa' },
    { dir: 'Lumbroso', discipline: 'Physique', collection: 'Lumbroso', defaultAuteur: 'Hubert Lumbroso' },
    { dir: 'Nathan classe prepa', discipline: 'Physique', collection: 'Nathan CPGE', defaultAuteur: 'Éditions Nathan' },
    { dir: 'Perez', discipline: 'Physique', collection: 'Pérez', defaultAuteur: 'José-Philippe Pérez' },
    { dir: 'H-prepa chimie', discipline: 'Chimie', collection: 'H-Prépa', defaultAuteur: 'Collectif H-Prépa' },
    { dir: 'livres de chimie', discipline: 'Chimie', collection: 'Dunod & Ellipses Chimie', defaultAuteur: 'Pierre Grécias / Collectif' }
];

function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function detectNiveau(filename) {
    const f = filename.toUpperCase();
    if (f.includes('MPSI') && f.includes('PCSI')) return 'MPSI / PCSI / PTSI (1re année)';
    if (f.includes('MPSI')) return 'MPSI (1re année)';
    if (f.includes('PCSI')) return 'PCSI (1re année)';
    if (f.includes('PTSI')) return 'PTSI (1re année)';
    if (f.includes('MP')) return 'MP / MP* (2e année)';
    if (f.includes('PC')) return 'PC / PC* (2e année)';
    if (f.includes('PSI')) return 'PSI / PSI* (2e année)';
    if (f.includes('PT')) return 'PT / PT* (2e année)';
    if (f.includes('2E') || f.includes('2EME') || f.includes('2ND')) return '2e année CPGE';
    if (f.includes('1RE') || f.includes('1ERE')) return '1re année CPGE';
    if (f.includes('CAPES')) return 'CAPES & Agrégation';
    return 'Toutes filières CPGE';
}

function cleanTitle(filename) {
    return filename
        .replace(/\.pdf$/i, '')
        .replace(/\.djvu/i, '')
        .replace(/\(Proetudes\.blogspot\.com\)/gi, '')
        .replace(/\(BIBLIO-SCIENCES\.ORG\).*/gi, '')
        .replace(/\(partagecelebrale\.blogspot\.com\)/gi, '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function runBookImport() {
    console.log('Démarrage de l importation des livres de Physique et Chimie...');

    // Ensure `books` table exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS \`books\` (
          \`id\`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`titre\`       VARCHAR(255) NOT NULL,
          \`collection\`  VARCHAR(100) NOT NULL,
          \`auteur\`      VARCHAR(150) NULL,
          \`discipline\`  VARCHAR(50) NOT NULL DEFAULT 'Physique',
          \`niveau\`      VARCHAR(100) NOT NULL DEFAULT 'CPGE',
          \`pdf_file\`    VARCHAR(500) NOT NULL,
          \`slug\`        VARCHAR(255) NOT NULL,
          \`created_at\`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_books_slug\` (\`slug\`),
          KEY \`idx_books_discipline\` (\`discipline\`),
          KEY \`idx_books_collection\` (\`collection\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Clean existing entries
    await pool.query('DELETE FROM books');

    let totalBooks = 0;
    const usedSlugs = new Set();

    for (const folderConfig of bookFolders) {
        const basePath = path.join(__dirname, '..', 'public', 'assets', 'downloads', folderConfig.dir);
        if (!fs.existsSync(basePath)) continue;

        function scanFolder(dirPath) {
            let files = [];
            const items = fs.readdirSync(dirPath);
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stat = fs.statSync(itemPath);
                if (stat.isDirectory()) {
                    files = files.concat(scanFolder(itemPath));
                } else if (item.endsWith('.pdf')) {
                    files.push(itemPath);
                }
            }
            return files;
        }

        const pdfPaths = scanFolder(basePath);

        for (const fullPdfPath of pdfPaths) {
            const filename = path.basename(fullPdfPath);
            const titre = cleanTitle(filename);
            const niveau = detectNiveau(filename);
            const pdf_file = '/assets/downloads/' + folderConfig.dir + '/' + path.relative(basePath, fullPdfPath).replace(/\\/g, '/');

            let rawSlug = `${folderConfig.collection}-${folderConfig.discipline}-${titre}`;
            let slug = slugify(rawSlug);

            let counter = 1;
            while (usedSlugs.has(slug)) {
                slug = `${slugify(rawSlug)}-${counter}`;
                counter++;
            }
            usedSlugs.add(slug);

            await pool.query(
                `INSERT INTO books (titre, collection, auteur, discipline, niveau, pdf_file, slug) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [titre, folderConfig.collection, folderConfig.defaultAuteur, folderConfig.discipline, niveau, pdf_file, slug]
            );
            totalBooks++;
        }
    }

    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM books');
    console.log(`\nImportation des livres réussie ! ${totalBooks} livres enregistrés en base. Total en base : ${rows[0].total}`);
    process.exit(0);
}

runBookImport().catch(err => {
    console.error('Erreur lors de l importation des livres :', err);
    process.exit(1);
});
