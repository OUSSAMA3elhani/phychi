/**
 * Master Concours Ingestion Script:
 * Parses official master catalog files:
 * 1. `concours_par_ecole_ups.md` (UPS de physique - 1,600+ structured exams with themes)
 * 2. `tdmchimie2019.html` (UPS de chimie - 1,000+ structured exams with themes and real school categories)
 * 
 * Usage: node tools/import-official-ups-catalogs.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function cleanText(str) {
    if (!str) return '';
    return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapEcoleCategory(rawName) {
    const r = rawName.toLowerCase();
    if (r.includes('polytechnique') && (r.includes('normales') || r.includes('ens'))) return 'École Polytechnique & ENS (Conjoint)';
    if (r.includes('polytechnique')) return 'École Polytechnique (X)';
    if (r.includes('normales') || r.includes('ens')) return 'Écoles Normales Supérieures (ENS)';
    if (r.includes('mines')) return 'Concours Commun Mines-Ponts & Écoles des Mines';
    if (r.includes('centrale')) return 'Concours Centrale-Supélec';
    if (r.includes('communs inp') || r.includes('polytechniques')) return 'Concours Communs Polytechniques (CCP - CCINP)';
    if (r.includes('e3a') || r.includes('e4a')) return 'Concours e3a - e4a';
    if (r.includes('agrégation externe')) return 'Agrégation Externe';
    if (r.includes('agrégation interne') || r.includes('agrégation de sciences physiques')) return 'Agrégation Interne';
    if (r.includes('c.a.p.e.s') || r.includes('capes')) return 'CAPES & CAFEP';
    if (r.includes('agro') || r.includes('bcpst') || r.includes('g2e')) return 'Banque Agro-Véto, BCPST & G2E';
    if (r.includes('pt') || r.includes('arts et métiers') || r.includes('ensam')) return 'Banque PT & Arts et Métiers';
    if (r.includes('aviation') || r.includes('enac') || r.includes('icna') || r.includes('iessa')) return 'Aviation Civile (ENAC - ICNA - IESSA)';
    if (r.includes('air')) return "École de l'Air";
    if (r.includes('ats') || r.includes('deug')) return 'Concours ATS & DEUG';

    return cleanText(rawName);
}

function parsePhysicsCatalog() {
    const mdPath = path.join(__dirname, '..', 'public', 'assets', 'downloads', 'UPS de physique', 'concours_par_ecole_ups.md');
    if (!fs.existsSync(mdPath)) return [];

    const content = fs.readFileSync(mdPath, 'utf8');
    const sections = content.split(/### \d+\.\s+/);
    const items = [];

    for (let i = 1; i < sections.length; i++) {
        const sec = sections[i];
        const titleMatch = sec.match(/^(.*?)\s*\n/);
        const ecoleMatch = sec.match(/- \*\*École \/ Concours d'origine\*\* :\s*(.*)/);
        const anneeMatch = sec.match(/- \*\*Année\*\* :\s*(\d{4})/);
        const filiereMatch = sec.match(/- \*\*Filière \/ Spécialité\*\* :\s*(.*)/);
        const matiereMatch = sec.match(/- \*\*Matière\*\* :\s*(.*)/);
        const epreuveMatch = sec.match(/- \*\*Type d'épreuve\*\* :\s*(.*)/);
        const themeMatch = sec.match(/- \*\*Thème \/ Description du sujet\*\* :\s*(.*)/);
        const fileMatch = sec.match(/- \*\*Fichier d'origine \(PDF\)\*\* :\s*`(.*?)`/);

        if (ecoleMatch && anneeMatch && fileMatch) {
            const pdfRelPath = fileMatch[1].replace(/\\/g, '/');
            const fullPdfPath = path.join(__dirname, '..', 'public', 'assets', 'downloads', 'UPS de physique', 'fichiers', pdfRelPath);
            const exists = fs.existsSync(fullPdfPath);

            const corrPdfRel = pdfRelPath.replace('/p/e/', '/p/c/').replace('e.pdf', 'c.pdf');
            const fullCorrPath = path.join(__dirname, '..', 'public', 'assets', 'downloads', 'UPS de physique', 'fichiers', corrPdfRel);
            const corrExists = fs.existsSync(fullCorrPath);

            const ecole = mapEcoleCategory(ecoleMatch[1]);
            const rawEpreuve = epreuveMatch ? epreuveMatch[1].trim() : (titleMatch ? titleMatch[1].trim() : 'Épreuve de Physique');

            items.push({
                titre: rawEpreuve,
                ecole,
                annee: parseInt(anneeMatch[1], 10),
                filiere: filiereMatch ? filiereMatch[1].trim() : 'Toutes',
                matiere: matiereMatch ? matiereMatch[1].trim() : 'Physique',
                epreuve: rawEpreuve,
                description: themeMatch ? themeMatch[1].trim() : 'Sujet officiel du concours ' + ecole + ' (' + anneeMatch[1] + ').',
                enonce_file: exists ? '/assets/downloads/UPS de physique/fichiers/' + pdfRelPath : null,
                correction_file: corrExists ? '/assets/downloads/UPS de physique/fichiers/' + corrPdfRel : null
            });
        }
    }
    return items;
}

function parseChemistryCatalog() {
    const htmlPath = path.join(__dirname, '..', 'public', 'assets', 'downloads', 'UPS de chimie', 'tdmchimie2019.html');
    if (!fs.existsSync(htmlPath)) return [];

    const content = fs.readFileSync(htmlPath, 'utf8');
    const items = [];

    const parts = content.split(/(?=<h[123]>)/i);
    let currentFiliere = 'PC';
    let currentH2 = 'Concours de Chimie';

    parts.forEach(part => {
        const h1M = part.match(/<h1>(.*?)<\/h1>/i);
        if (h1M) currentFiliere = cleanText(h1M[1]).replace(/^Filière\s*/i, '');
        
        const h2M = part.match(/<h2>(.*?)<\/h2>/i);
        if (h2M) currentH2 = cleanText(h2M[1]);

        const mappedEcole = mapEcoleCategory(currentH2);

        const blockRegex = /<b><font color="red">Thématique : <\/font><\/b>(.*?)(?=<hr\/>|<h3>|<h2>|<div style="text-align: center;">|$)/gs;
        let match;

        while ((match = blockRegex.exec(part)) !== null) {
            const block = match[1];
            const themeText = cleanText(block);

            const pdfMatches = [...block.matchAll(/href="(bulletin\/bult\d{4}\/[^"]+\.pdf)"/gi)];
            const corrMatches = [...block.matchAll(/href="(bulletin\/corr\d{4}\/[^"]+\.pdf)"/gi)];

            if (pdfMatches.length > 0) {
                for (const pm of pdfMatches) {
                    const pdfRelPath = pm[1];
                    const fullPdfPath = path.join(__dirname, '..', 'public', 'assets', 'downloads', 'UPS de chimie', pdfRelPath);
                    const exists = fs.existsSync(fullPdfPath);

                    const yearMatch = pdfRelPath.match(/\b(199[5-9]|20[0-2][0-9])\b/);
                    const annee = yearMatch ? parseInt(yearMatch[1], 10) : 2018;

                    let corrRelPath = null;
                    if (corrMatches.length > 0) {
                        const cRel = corrMatches[0][1];
                        const fullCPath = path.join(__dirname, '..', 'public', 'assets', 'downloads', 'UPS de chimie', cRel);
                        if (fs.existsSync(fullCPath)) corrRelPath = '/assets/downloads/UPS de chimie/' + cRel;
                    }

                    // Extract epreuve title from green font or default
                    const epreuveMatch = block.match(/<b><font color="green">(.*?)<\/font><\/b>/i);
                    let epreuveTitle = epreuveMatch ? cleanText(epreuveMatch[1]) : 'Composition de Chimie';
                    epreuveTitle = epreuveTitle.replace(/\s*--.*/, '').trim() || 'Composition de Chimie';

                    items.push({
                        titre: epreuveTitle,
                        ecole: mappedEcole,
                        annee,
                        filiere: currentFiliere || 'PC',
                        matiere: 'Chimie',
                        epreuve: epreuveTitle,
                        description: themeText || 'Sujet officiel de chimie des concours d entrée aux grandes écoles.',
                        enonce_file: exists ? '/assets/downloads/UPS de chimie/' + pdfRelPath : null,
                        correction_file: corrRelPath
                    });
                }
            }
        }
    });

    return items;
}

async function runMasterImport() {
    console.log('Démarrage de l importation globale optimisée depuis les répertoires officiels UPS (Physique & Chimie)...');

    // Ensure `concours` table exists with description column
    await pool.query(`
        CREATE TABLE IF NOT EXISTS \`concours\` (
          \`id\`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`ecole\`           VARCHAR(255) NOT NULL,
          \`annee\`           INT UNSIGNED NOT NULL,
          \`filiere\`         VARCHAR(100) NOT NULL DEFAULT 'Toutes',
          \`matiere\`         VARCHAR(100) NOT NULL DEFAULT 'Physique',
          \`epreuve\`         VARCHAR(255) NOT NULL,
          \`titre\`           VARCHAR(255) NOT NULL,
          \`description\`     TEXT NULL,
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

    // Clean existing database entries
    await pool.query('DELETE FROM concours');

    const physItems = parsePhysicsCatalog();
    const chimItems = parseChemistryCatalog();
    const allItems = [...physItems, ...chimItems];

    console.log(`Total des épreuves extraites des répertoires officiels : ${allItems.length}`);

    let insertedCount = 0;
    const usedSlugs = new Set();

    for (const item of allItems) {
        if (!item.enonce_file) continue;

        let rawSlug = `${item.ecole}-${item.annee}-${item.filiere}-${item.matiere}-${item.epreuve}`;
        let slug = slugify(rawSlug);

        let counter = 1;
        while (usedSlugs.has(slug)) {
            slug = `${slugify(rawSlug)}-${counter}`;
            counter++;
        }
        usedSlugs.add(slug);

        await pool.query(
            `INSERT INTO concours (ecole, annee, filiere, matiere, epreuve, titre, description, slug, enonce_file, correction_file) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [item.ecole, item.annee, item.filiere, item.matiere, item.epreuve, item.titre, item.description, slug, item.enonce_file, item.correction_file]
        );
        insertedCount++;
    }

    const [totalRows] = await pool.query('SELECT COUNT(*) AS count FROM concours');
    console.log(`\nImportation officielle réussie ! ${insertedCount} sujets enregistrés en base. Total en base : ${totalRows[0].count}`);
    process.exit(0);
}

runMasterImport().catch(err => {
    console.error('Erreur lors de l importation officielle :', err);
    process.exit(1);
});
