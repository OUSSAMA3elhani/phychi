/**
 * PhyChemia - Script de mise à jour des identifiants et URL Google Drive dans la base de données.
 *
 * Met à jour les colonnes `course_file`, `enonce_file`, `correction_file` et `pdf_file`
 * dans les tables MySQL `courses`, `exercises`, `books` et `concours` afin qu'elles utilisent
 * les URL de streaming Google Drive (/api/documents/stream/:fileId).
 *
 * Utilisation :
 *   node tools/sync-db-drive-ids.js
 */

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../config/db');

const MAPPING_FILE_PATH = path.join(__dirname, '..', 'config', 'driveMapping.json');

async function syncDbWithDriveMapping() {
    console.log('=== MISES A JOUR DES FICHIERS EN BASE DE DONNEES VIA GOOGLE DRIVE ===\n');

    if (!fs.existsSync(MAPPING_FILE_PATH)) {
        console.error(`Erreur : Fichier de cartographie introuvable (${MAPPING_FILE_PATH}).`);
        console.error('Veuillez d\'abord exécuter : node tools/generate-drive-mapping.js');
        process.exit(1);
    }

    const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE_PATH, 'utf8'));
    const byPath = mapping.byPath || {};
    const byFilename = mapping.byFilename || {};

    let totalUpdated = 0;

    /**
     * Tente de trouver l'ID Google Drive d'un fichier local ou relatif.
     */
    function findDriveId(filePath) {
        if (!filePath || typeof filePath !== 'string') return null;
        const clean = filePath.trim();
        if (/^[a-zA-Z0-9_-]{25,}$/.test(clean) && !clean.includes('/')) return clean;

        // Extraction si c'est déjà une URL /api/documents/stream/FILE_ID
        const streamMatch = clean.match(/\/api\/documents\/stream\/([a-zA-Z0-9_-]+)/);
        if (streamMatch) return streamMatch[1];

        // Normalisation
        let relPath = clean.startsWith('/') ? clean.slice(1) : clean;
        if (relPath.startsWith('assets/downloads/')) relPath = relPath.replace(/^assets\/downloads\//, '');
        if (relPath.startsWith('public/assets/downloads/')) relPath = relPath.replace(/^public\/assets\/downloads\//, '');

        if (byPath[relPath]) return byPath[relPath].id;
        if (byPath[relPath.toLowerCase()]) return byPath[relPath.toLowerCase()].id;

        const baseName = path.basename(clean).toLowerCase();
        if (byFilename[baseName]) return byFilename[baseName].id;

        return null;
    }

    // 1. Mise à jour de la table `courses`
    console.log('1. Traitement des cours (`courses`)...');
    const [courses] = await pool.query('SELECT id, course_file, titre FROM courses');
    let coursesUpdated = 0;

    for (const c of courses) {
        if (!c.course_file) continue;
        const driveId = findDriveId(c.course_file);
        if (driveId) {
            const newUrl = `/api/documents/stream/${driveId}`;
            if (c.course_file !== newUrl) {
                await pool.query('UPDATE courses SET course_file = ? WHERE id = ?', [newUrl, c.id]);
                coursesUpdated++;
                totalUpdated++;
            }
        }
    }
    console.log(`   └─ ${coursesUpdated} cours mis à jour avec leur ID Google Drive.`);

    // 2. Mise à jour de la table `exercises`
    console.log('2. Traitement des exercices (`exercises`)...');
    const [exercises] = await pool.query('SELECT id, enonce_file, correction_file, titre FROM exercises');
    let exercisesUpdated = 0;

    for (const e of exercises) {
        let newEnonce = e.enonce_file;
        let newCorr = e.correction_file;
        let changed = false;

        if (e.enonce_file) {
            const driveId = findDriveId(e.enonce_file);
            if (driveId) {
                const target = `/api/documents/stream/${driveId}`;
                if (e.enonce_file !== target) {
                    newEnonce = target;
                    changed = true;
                }
            }
        }

        if (e.correction_file) {
            const driveId = findDriveId(e.correction_file);
            if (driveId) {
                const target = `/api/documents/stream/${driveId}`;
                if (e.correction_file !== target) {
                    newCorr = target;
                    changed = true;
                }
            }
        }

        if (changed) {
            await pool.query('UPDATE exercises SET enonce_file = ?, correction_file = ? WHERE id = ?', [newEnonce, newCorr, e.id]);
            exercisesUpdated++;
            totalUpdated++;
        }
    }
    console.log(`   └─ ${exercisesUpdated} exercices mis à jour avec leurs IDs Google Drive.`);

    // 3. Mise à jour de la table `books`
    console.log('3. Traitement des livres (`books`)...');
    const [books] = await pool.query('SELECT id, pdf_file, titre FROM books');
    let booksUpdated = 0;

    for (const b of books) {
        if (!b.pdf_file) continue;
        const driveId = findDriveId(b.pdf_file);
        if (driveId) {
            const newUrl = `/api/documents/stream/${driveId}`;
            if (b.pdf_file !== newUrl) {
                await pool.query('UPDATE books SET pdf_file = ? WHERE id = ?', [newUrl, b.id]);
                booksUpdated++;
                totalUpdated++;
            }
        }
    }
    console.log(`   └─ ${booksUpdated} livres mis à jour avec leur ID Google Drive.`);

    // 4. Mise à jour de la table `concours`
    console.log('4. Traitement des annales de concours (`concours`)...');
    const [concoursList] = await pool.query('SELECT id, enonce_file, correction_file, titre FROM concours');
    let concoursUpdated = 0;

    for (const cc of concoursList) {
        let newEnonce = cc.enonce_file;
        let newCorr = cc.correction_file;
        let changed = false;

        if (cc.enonce_file) {
            const driveId = findDriveId(cc.enonce_file);
            if (driveId) {
                const target = `/api/documents/stream/${driveId}`;
                if (cc.enonce_file !== target) {
                    newEnonce = target;
                    changed = true;
                }
            }
        }

        if (cc.correction_file) {
            const driveId = findDriveId(cc.correction_file);
            if (driveId) {
                const target = `/api/documents/stream/${driveId}`;
                if (cc.correction_file !== target) {
                    newCorr = target;
                    changed = true;
                }
            }
        }

        if (changed) {
            await pool.query('UPDATE concours SET enonce_file = ?, correction_file = ? WHERE id = ?', [newEnonce, newCorr, cc.id]);
            concoursUpdated++;
            totalUpdated++;
        }
    }
    console.log(`   └─ ${concoursUpdated} sujets de concours mis à jour avec leurs IDs Google Drive.`);

    console.log('\n=========================================================');
    console.log(`BASE DE DONNEES MISE A JOUR AVEC SUCCES (${totalUpdated} champs modifiés)`);
    console.log('=========================================================\n');

    process.exit(0);
}

syncDbWithDriveMapping().catch(err => {
    console.error('Erreur de mise à jour :', err);
    process.exit(1);
});
