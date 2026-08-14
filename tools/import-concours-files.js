/**
 * Ingestion Script: Imports and pairs all 2,500+ concours PDFs from
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

function parsePdfFile(fullPdfPath, ecoleDir) {
    const filename = path.basename(fullPdfPath);
    const nameWithoutExt = filename.replace(/\.pdf$/i, '');
    
    // Detect year in full path or filename
    const yearMatch = fullPdfPath.match(/\b(199[5-9]|20[0-2][0-9])\b/);
    const annee = yearMatch ? parseInt(yearMatch[1], 10) : 2020;

    // Detect filiere
    let filiere = 'Toutes';
    const filiereMatch = nameWithoutExt.match(/\b(MP|PC|PSI|PT|BCPST|TSI|TB|ATS)\b/i);
    if (filiereMatch) {
        filiere = filiereMatch[1].toUpperCase();
    }

    // Detect doc type (enonce vs corrige)
    const isCorrige = /corrige/i.test(nameWithoutExt);

    // Clean epreuve title without stripping physics/chemistry words
    let cleanEpreuve = filename
        .replace(/\.pdf$/i, '')
        .replace(/^(\d{4})_([A-Z0-9]+)_(\d{4})_/i, '')
        .replace(/^(\d{4})_/i, '')
        .replace(/_(Enonce|Corrige|Sujet).*/i, '')
        .replace(/\b(Enonce|Corrige|Sujet)\b.*/i, '')
        .replace(/Part[1-9]/gi, '')
        .replace(/^Autres_concours_/i, '')
        .replace(/^Concours_de_recrutement_des_enseignants_/i, '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleanEpreuve || cleanEpreuve.length < 2) {
        cleanEpreuve = 'Épreuve de Physique';
    }

    // Capitalize clean title
    cleanEpreuve = cleanEpreuve.charAt(0).toUpperCase() + cleanEpreuve.slice(1);

    // Refine ecole category using filename
    let ecole = cleanCategoryName(ecoleDir);
    const fn = filename.toLowerCase();
    if (ecoleDir.includes('Agrégation') || ecoleDir.includes('CAPES')) {
        if (fn.includes('applications') || fn.includes('probleme_de_physique') || fn.includes('probleme de physique') || fn.includes('interne')) {
            ecole = 'Agrégation Interne';
        } else if (fn.includes('dossier') || fn.includes('traitement') || fn.includes('theme') || fn.includes('thème') || fn.includes('capes') || fn.includes('cafep')) {
            ecole = 'CAPES & CAFEP';
        } else {
            ecole = 'Agrégation Externe';
        }
    }

    return {
        annee,
        filiere,
        ecole,
        epreuve: cleanEpreuve,
        type: isCorrige ? 'corrige' : 'enonce',
        filename
    };
}

async function runConcoursImport() {
    console.log('Démarrage de l importation des 2 500+ sujets de Concours...');
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

    // Clean existing entries to regenerate clean paired entries
    await pool.query('DELETE FROM concours');

    const concoursGroups = new Map();

    const categoryDirs = fs.readdirSync(basePath).filter(name => {
        return fs.statSync(path.join(basePath, name)).isDirectory();
    });

    for (const catDirName of categoryDirs) {
        const catFullPath = path.join(basePath, catDirName);

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
            const parsed = parsePdfFile(fullPdfPath, catDirName);
            const relativePath = '/assets/downloads/UPS_Concours_Organises/' + path.relative(basePath, fullPdfPath).replace(/\\/g, '/');

            const groupKey = `${parsed.ecole}::${parsed.annee}::${parsed.filiere}::${parsed.epreuve.toLowerCase()}`;

            if (!concoursGroups.has(groupKey)) {
                concoursGroups.set(groupKey, {
                    ecole: parsed.ecole,
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
                if (!group.enonce_file || !group.enonce_file.includes('Part2')) {
                    group.enonce_file = relativePath;
                }
            } else if (parsed.type === 'corrige') {
                if (!group.correction_file || !group.correction_file.includes('Part2')) {
                    group.correction_file = relativePath;
                }
            }
        }
    }

    console.log(`Nombre total de sujets de concours uniques appariés : ${concoursGroups.size}`);

    let insertedCount = 0;
    const usedSlugs = new Set();

    for (const group of concoursGroups.values()) {
        const titre = group.epreuve;
        let rawSlug = `${group.ecole}-${group.annee}-${group.filiere}-${group.epreuve}`;
        let slug = slugify(rawSlug);

        let counter = 1;
        while (usedSlugs.has(slug)) {
            slug = `${slugify(rawSlug)}-${counter}`;
            counter++;
        }
        usedSlugs.add(slug);

        await pool.query(
            `INSERT INTO concours (ecole, annee, filiere, matiere, epreuve, titre, slug, enonce_file, correction_file) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [group.ecole, group.annee, group.filiere, group.matiere, group.epreuve, titre, slug, group.enonce_file, group.correction_file]
        );
        insertedCount++;
    }

    const [totalRows] = await pool.query('SELECT COUNT(*) AS count FROM concours');
    console.log(`\nImportation réussie ! ${insertedCount} sujets enregistrés en base. Total en base : ${totalRows[0].count}`);
    process.exit(0);
}

runConcoursImport().catch(err => {
    console.error('Erreur lors de l importation des concours :', err);
    process.exit(1);
});
