/**
 * Ingestion Script: Imports and pairs all 2,900+ concours PDFs from
 * public/assets/downloads/UPS_Concours_Organises into the MySQL database.
 * 
 * Usage: node tools/import-concours-files.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

function cleanCategoryName(dirName) {
    return dirName.replace(/^\d+\.\s*/, '').trim();
}

function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function detectMatiere(epreuveStr) {
    const s = epreuveStr.toLowerCase();
    if (s.includes('physique-chimie') || s.includes('physique_chimie') || s.includes('physique et chimie')) {
        return 'Physique-Chimie';
    }
    if (s.includes('chimie')) {
        return 'Chimie';
    }
    return 'Physique';
}

function parseFilename(filename) {
    // Expected pattern: [YEAR]_[FILIERE]_[EPREUVE]_[Enonce|Corrige...].pdf
    const nameWithoutExt = filename.replace(/\.pdf$/i, '');
    const match = nameWithoutExt.match(/^(\d{4})_([^_]+)_(.*)_(Enonce|Corrige.*)$/i);

    if (!match) {
        // Fallback for non-standard filenames
        const fallbackYearMatch = nameWithoutExt.match(/^(\d{4})_(.*)$/);
        if (fallbackYearMatch) {
            const isCorr = nameWithoutExt.toLowerCase().includes('corrige');
            const isEnonce = nameWithoutExt.toLowerCase().includes('enonce');
            return {
                annee: parseInt(fallbackYearMatch[1], 10),
                filiere: 'Toutes',
                epreuve: fallbackYearMatch[2].replace(/_(Enonce|Corrige.*)$/i, '').replace(/_/g, ' '),
                type: isCorr ? 'corrige' : 'enonce',
                isPart2Plus: nameWithoutExt.toLowerCase().includes('part2') || nameWithoutExt.toLowerCase().includes('part3')
            };
        }
        return null;
    }

    const annee = parseInt(match[1], 10);
    const filiere = match[2].replace(/_/g, ' ');
    const rawEpreuve = match[3].replace(/_/g, ' ');
    const docTag = match[4];

    const isCorrige = /^Corrige/i.test(docTag);
    const isPart2Plus = /Part[2-9]/i.test(docTag);

    return {
        annee,
        filiere,
        epreuve: rawEpreuve,
        type: isCorrige ? 'corrige' : 'enonce',
        isPart2Plus
    };
}

async function runConcoursImport() {
    console.log('Starting ingestion of UPS Concours PDF files...');
    const basePath = path.join(__dirname, '..', 'public', 'assets', 'downloads', 'UPS_Concours_Organises');

    if (!fs.existsSync(basePath)) {
        console.error(`Base path missing: ${basePath}`);
        process.exit(1);
    }

    // Ensure `concours` table exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS \`concours\` (
          \`id\`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`ecole\`           VARCHAR(255) NOT NULL,
          \`annee\`           INT UNSIGNED NOT NULL,
          \`filiere\`         VARCHAR(100) NOT NULL DEFAULT 'Toutes',
          \`matiere\`         VARCHAR(100) NOT NULL DEFAULT 'Physique',
          \`epreuve\`         VARCHAR(255) NOT NULL,
          \`titre\`           VARCHAR(255) NOT NULL,
          \`slug\`            VARCHAR(255) NOT NULL,
          \`enonce_file\`     VARCHAR(500) NULL,
          \`correction_file\` VARCHAR(500) NULL,
          \`created_at\`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_concours_slug\` (\`slug\`),
          KEY \`idx_concours_ecole_annee\` (\`ecole\`, \`annee\`),
          KEY \`idx_concours_filiere\` (\`filiere\`),
          KEY \`idx_concours_matiere\` (\`matiere\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const concoursGroups = new Map();

    const categoryDirs = fs.readdirSync(basePath).filter(name => {
        const fullPath = path.join(basePath, name);
        return fs.statSync(fullPath).isDirectory();
    });

    console.log(`Found ${categoryDirs.length} concours categories.`);

    for (const catDirName of categoryDirs) {
        const ecoleName = cleanCategoryName(catDirName);
        const catFullPath = path.join(basePath, catDirName);

        // Recursively find all PDF files in this category
        function scanFolder(folderPath) {
            let files = [];
            const items = fs.readdirSync(folderPath);
            for (const item of items) {
                const itemPath = path.join(folderPath, item);
                const stat = fs.statSync(itemPath);
                if (stat.isDirectory()) {
                    files = files.concat(scanFolder(itemPath));
                } else if (item.endsWith('.pdf')) {
                    files.push(itemPath);
                }
            }
            return files;
        }

        const pdfPaths = scanFolder(catFullPath);

        for (const fullPdfPath of pdfPaths) {
            const filename = path.basename(fullPdfPath);
            const parsed = parseFilename(filename);

            if (!parsed) {
                continue;
            }

            const relativePath = '/assets/downloads/UPS_Concours_Organises/' + path.relative(basePath, fullPdfPath).replace(/\\/g, '/');
            const groupKey = `${ecoleName}::${parsed.annee}::${parsed.filiere}::${parsed.epreuve}`;

            if (!concoursGroups.has(groupKey)) {
                concoursGroups.set(groupKey, {
                    ecole: ecoleName,
                    annee: parsed.annee,
                    filiere: parsed.filiere,
                    epreuve: parsed.epreuve,
                    matiere: detectMatiere(parsed.epreuve),
                    enonce_file: null,
                    correction_file: null
                });
            }

            const group = concoursGroups.get(groupKey);

            if (parsed.type === 'enonce') {
                group.enonce_file = relativePath;
            } else if (parsed.type === 'corrige') {
                // If correction_file is not set yet or this is part 1, set it as primary correction file
                if (!group.correction_file || !parsed.isPart2Plus) {
                    group.correction_file = relativePath;
                }
            }
        }
    }

    console.log(`Total paired concours exam entries created: ${concoursGroups.size}`);

    let insertedCount = 0;
    let updatedCount = 0;

    for (const group of concoursGroups.values()) {
        const titre = `${group.ecole} ${group.annee} — ${group.filiere} (${group.epreuve})`;
        const rawSlug = `${group.ecole}-${group.annee}-${group.filiere}-${group.epreuve}`;
        const slug = slugify(rawSlug);

        const [existing] = await pool.query('SELECT id FROM concours WHERE slug = ? LIMIT 1', [slug]);

        if (existing.length > 0) {
            await pool.query(
                `UPDATE concours SET ecole = ?, annee = ?, filiere = ?, matiere = ?, epreuve = ?, titre = ?, enonce_file = ?, correction_file = ? WHERE id = ?`,
                [group.ecole, group.annee, group.filiere, group.matiere, group.epreuve, titre, group.enonce_file, group.correction_file, existing[0].id]
            );
            updatedCount++;
        } else {
            await pool.query(
                `INSERT INTO concours (ecole, annee, filiere, matiere, epreuve, titre, slug, enonce_file, correction_file) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [group.ecole, group.annee, group.filiere, group.matiere, group.epreuve, titre, slug, group.enonce_file, group.correction_file]
            );
            insertedCount++;
        }
    }

    console.log(`\nUPS Concours import finished successfully!`);
    console.log(`Inserted entries: ${insertedCount}`);
    console.log(`Updated entries: ${updatedCount}`);
    console.log(`Total active concours exams in database: ${insertedCount + updatedCount}`);

    process.exit(0);
}

runConcoursImport().catch(err => {
    console.error('UPS Concours import failed:', err);
    process.exit(1);
});
