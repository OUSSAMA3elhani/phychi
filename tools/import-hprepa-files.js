/**
 * Ingestion Script: Imports all 10 volumes of H-Prepa Physics PDFs from
 * public/assets/downloads/H-prepa_decoupe into the MySQL database.
 * 
 * Usage: node tools/import-hprepa-files.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

const DISCIPLINE_ID_PHYSIQUE = 1;

const HPREPA_VOLUMES = [
    {
        dirName: 'H_Prepa_Mecanique_1re_annee_MPSI_PCSI_PTSI',
        tomeTitle: 'H-Prepa : Mécanique 1re année (MPSI/PCSI)',
        slugPrefix: 'hprepa-meca-1',
        niveau: 'l1'
    },
    {
        dirName: 'H_Prepa_Electromagnetisme_1re_annee_MPSI_PCSI_PTSI',
        tomeTitle: 'H-Prepa : Électromagnétisme 1re année (MPSI/PCSI)',
        slugPrefix: 'hprepa-em-1',
        niveau: 'l1'
    },
    {
        dirName: 'H_Prepa_Electromagnetisme_2e_annee_MP_PC_PSI',
        tomeTitle: 'H-Prepa : Électromagnétisme 2e année (MP/PC/PSI)',
        slugPrefix: 'hprepa-em-2',
        niveau: 'l2'
    },
    {
        dirName: 'H_Prepa_Electronique_Electrocinetique_1re_annee_MPSI',
        tomeTitle: 'H-Prepa : Électronique & Électrocinétique 1re année',
        slugPrefix: 'hprepa-elec-1',
        niveau: 'l1'
    },
    {
        dirName: 'H_Prepa_Mecanique_des_fluides_2e_annee_PC_PSI',
        tomeTitle: 'H-Prepa : Mécanique des Fluides 2e année (PC/PSI)',
        slugPrefix: 'hprepa-fluides-2',
        niveau: 'l2'
    },
    {
        dirName: 'H_Prepa_Ondes_2e_annee_MP_PC_PSI_PT',
        tomeTitle: 'H-Prepa : Ondes 2e année (MP/PC/PSI)',
        slugPrefix: 'hprepa-ondes-2',
        niveau: 'l2'
    },
    {
        dirName: 'H_Prepa_Optique_1re_Annee_MPSI_PCSI_PTSI',
        tomeTitle: 'H-Prepa : Optique Géométrique 1re année',
        slugPrefix: 'hprepa-optique-1',
        niveau: 'l1'
    },
    {
        dirName: 'H_Prepa_Thermodynamique_1re_annee_MPSI_PCSI_PTSI',
        tomeTitle: 'H-Prepa : Thermodynamique 1re année',
        slugPrefix: 'hprepa-thermo-1',
        niveau: 'l1'
    },
    {
        dirName: 'H_prepa_Exercices_problemes_physique_MPSI_PCSI_PTSI',
        tomeTitle: 'H-Prepa : Exercices & Problèmes de Physique (MPSI/PCSI)',
        slugPrefix: 'hprepa-ex-mpsi',
        niveau: 'l1'
    },
    {
        dirName: 'Physique_Pour_bien_demarrer_sa_prepa',
        tomeTitle: 'H-Prepa : Pour bien démarrer sa Prépa',
        slugPrefix: 'hprepa-demarrer',
        niveau: 'l1'
    }
];

function cleanChapterTitle(filename) {
    return filename
        .replace(/\.pdf$/i, '')
        .replace(/^00_/, '')
        .replace(/^Chapitre_\d+_/i, '')
        .replace(/_/g, ' ')
        .replace(/first/g, '1er')
        .replace(/2nd/g, '2nd')
        .trim();
}

function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

async function runHPrepaImport() {
    console.log('Starting ingestion of H-Prepa PDF files...');
    const basePath = path.join(__dirname, '..', 'public', 'assets', 'downloads', 'H-prepa_decoupe');

    // Ensure `tome` column exists in `chapters`
    const [cols] = await pool.query("SHOW COLUMNS FROM chapters LIKE 'tome'");
    if (cols.length === 0) {
        console.log('Adding tome column to chapters table...');
        await pool.query("ALTER TABLE chapters ADD COLUMN tome VARCHAR(150) NULL AFTER description");
    }

    // Ensure `course_id` and `partie_cours` columns exist in `exercises`
    const [colsCourse] = await pool.query("SHOW COLUMNS FROM exercises LIKE 'course_id'");
    if (colsCourse.length === 0) {
        console.log('Adding course_id and partie_cours columns to exercises table...');
        await pool.query("ALTER TABLE exercises ADD COLUMN course_id INT UNSIGNED NULL AFTER chapter_id, ADD COLUMN partie_cours VARCHAR(255) NULL AFTER course_id");
    }

    // Get current max order_num
    const [maxOrderRows] = await pool.query('SELECT MAX(order_num) as max_order FROM chapters');
    let currentOrder = (maxOrderRows[0].max_order || 0) + 1;

    let totalChaptersInserted = 0;
    let totalCoursesInserted = 0;
    let totalExercisesInserted = 0;

    for (const volume of HPREPA_VOLUMES) {
        const volumeDir = path.join(basePath, volume.dirName);
        if (!fs.existsSync(volumeDir)) {
            console.warn(`Directory missing: ${volumeDir}`);
            continue;
        }

        console.log(`\nProcessing volume: ${volume.tomeTitle}...`);
        const pdfFiles = fs.readdirSync(volumeDir).filter(f => f.endsWith('.pdf'));

        for (const pdfFile of pdfFiles) {
            // Ignore cover/table of contents files or solution summary files as main chapters
            if (pdfFile.startsWith('00_') || pdfFile.startsWith('Section_Corriges_')) {
                continue;
            }

            const chapMatch = pdfFile.match(/^Chapitre_(\d+)_(.*)\.pdf$/i);
            let chapNum = 1;
            if (chapMatch) {
                chapNum = parseInt(chapMatch[1], 10);
            }

            const rawCleanTitle = cleanChapterTitle(pdfFile);
            const chapterTitle = `Chapitre ${chapNum} - ${rawCleanTitle}`;
            const description = `Cours complet, méthodes et exercices corrigés pas à pas (${volume.tomeTitle}).`;
            const chapterSlug = slugify(`${volume.slugPrefix}-ch${chapNum}-${rawCleanTitle}`);
            const relPdfPath = `/assets/downloads/H-prepa_decoupe/${volume.dirName}/${pdfFile}`;

            // Check if chapter already exists by slug
            const [existingChap] = await pool.query('SELECT id FROM chapters WHERE slug = ?', [chapterSlug]);
            let chapterId;

            if (existingChap.length > 0) {
                chapterId = existingChap[0].id;
                await pool.query(
                    'UPDATE chapters SET discipline_id = ?, titre = ?, description = ?, tome = ?, niveau = ?, ordre = ?, order_num = ? WHERE id = ?',
                    [DISCIPLINE_ID_PHYSIQUE, chapterTitle, description, volume.tomeTitle, volume.niveau, currentOrder, currentOrder, chapterId]
                );
            } else {
                const [insRes] = await pool.query(
                    'INSERT INTO chapters (discipline_id, titre, slug, description, tome, niveau, ordre, order_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [DISCIPLINE_ID_PHYSIQUE, chapterTitle, chapterSlug, description, volume.tomeTitle, volume.niveau, currentOrder, currentOrder]
                );
                chapterId = insRes.insertId;
                totalChaptersInserted++;
            }
            currentOrder++;

            // Create/Update Course record for this chapter
            const courseTitle = `Fiche de cours : ${chapterTitle}`;
            const courseSlug = slugify(`cours-${chapterSlug}`);
            let courseId;

            const [existingCourse] = await pool.query('SELECT id FROM courses WHERE slug = ?', [courseSlug]);
            if (existingCourse.length > 0) {
                courseId = existingCourse[0].id;
                await pool.query(
                    'UPDATE courses SET chapter_id = ?, titre = ?, description = ?, course_file = ?, niveau = ?, order_num = 1 WHERE id = ?',
                    [chapterId, courseTitle, description, relPdfPath, volume.niveau, courseId]
                );
            } else {
                const [insCourse] = await pool.query(
                    'INSERT INTO courses (chapter_id, titre, slug, description, course_file, niveau, order_num) VALUES (?, ?, ?, ?, ?, ?, 1)',
                    [chapterId, courseTitle, courseSlug, description, relPdfPath, volume.niveau]
                );
                courseId = insCourse.insertId;
                totalCoursesInserted++;
            }

            // Create/Update Exercise record for this chapter (enonce_file and correction_file are identical)
            const exTitle = `Exercices & Corrigés : ${chapterTitle}`;
            const exSlug = slugify(`ex-${chapterSlug}`);
            const exDesc = `Série d'exercices et problèmes avec solutions détaillées pour ${chapterTitle} (${volume.tomeTitle}).`;

            let difficulte = 'moyen';
            if (volume.niveau === 'l2') difficulte = 'difficile';

            const [existingEx] = await pool.query('SELECT id FROM exercises WHERE slug = ?', [exSlug]);
            if (existingEx.length > 0) {
                await pool.query(
                    'UPDATE exercises SET chapter_id = ?, course_id = ?, partie_cours = ?, titre = ?, description = ?, enonce_file = ?, correction_file = ?, niveau = ?, difficulte = ? WHERE id = ?',
                    [chapterId, courseId, chapterTitle, exTitle, exDesc, relPdfPath, relPdfPath, volume.niveau, difficulte, existingEx[0].id]
                );
            } else {
                await pool.query(
                    'INSERT INTO exercises (chapter_id, course_id, partie_cours, titre, slug, description, enonce_file, correction_file, niveau, difficulte) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [chapterId, courseId, chapterTitle, exTitle, exSlug, exDesc, relPdfPath, relPdfPath, volume.niveau, difficulte]
                );
                totalExercisesInserted++;
            }
        }
    }

    console.log(`\nH-Prepa import completed successfully!`);
    console.log(`Chapters inserted/updated: ${totalChaptersInserted}`);
    console.log(`Courses inserted/updated: ${totalCoursesInserted}`);
    console.log(`Exercises inserted/updated: ${totalExercisesInserted}`);

    process.exit(0);
}

runHPrepaImport().catch(err => {
    console.error('H-Prepa import failed:', err);
    process.exit(1);
});
