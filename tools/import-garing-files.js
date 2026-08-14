/**
 * Ingestion Script: Imports all physics chapters, course PDFs, and exercise PDFs
 * from public/assets/downloads/garing_decoupe into the MySQL database.
 * 
 * Usage: node tools/import-garing-files.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

// Discipline ID for Physique is 1
const DISCIPLINE_ID_PHYSIQUE = 1;

const TOMES_CONFIG = [
    {
        dirName: 'Tome_1_Ondes_Mecaniques',
        tomeTitle: 'Tome 1 : Ondes Mécaniques',
        slugPrefix: 'tome-1-ondes-mecaniques',
        niveau: 'l2',
        chapterTitles: {
            1: 'Chapitre 1 - Ondes sur une corde vibrante',
            2: 'Chapitre 2 - Ondes acoustiques dans un fluide',
            3: 'Chapitre 3 - Autres types d\'ondes 1D (Barres, Câbles, Réseaux)',
            4: 'Chapitre 4 - Ondes de gravitation dans un liquide (Houle, Vagues)',
            5: 'Chapitre 5 - Diffusion thermique et de particules'
        },
        chapterDescriptions: {
            1: 'Équation d\'Alembert, ondes progressives, réflexions aux limites, modes propres et énergie vibratoire.',
            2: 'Propagation acoustique, équations d\'état des fluides, impédance acoustique, énergie et effet Doppler.',
            3: 'Ondes longitudinales dans les barres, milieux dispersifs, vitesse de phase et vitesse de groupe.',
            4: 'Théorie de la houle, équation d\'onde en eau profonde et peu profonde, dispersion et solitons.',
            5: 'Loi de Fick, équation de la chaleur, régimes stationnaires et sinusoïdaux, marche au hasard.'
        }
    },
    {
        dirName: 'Tome_2_Ondes_EM_Vide_et_Milieux',
        tomeTitle: 'Tome 2 : Ondes Électromagnétiques dans le Vide et les Milieux',
        slugPrefix: 'tome-2-ondes-em-vide-milieux',
        niveau: 'l2',
        chapterTitles: {
            1: 'Chapitre 1 - Ondes Électromagnétiques dans le vide (OPPM)',
            2: 'Chapitre 2 - Lignes de transmission',
            3: 'Chapitre 3 - Conducteurs métalliques et guides d\'ondes',
            4: 'Chapitre 4 - Ondes électromagnétiques dans un plasma',
            5: 'Chapitre 5 - Rayonnement dipolaire et diffusion'
        },
        chapterDescriptions: {
            1: 'Équations de Maxwell dans le vide, onde plane progressive harmonique, polarisation, vecteur de Poynting et pression de radiation.',
            2: 'Équations des télégraphistes, impédance caractéristique, réflexions et régime sinusoïdal sur ligne.',
            3: 'Effet de peau, réflexion sur un conducteur parfait ou réel, propagation guidée et cavités résonantes.',
            4: 'Modèle d\'Drude-Lorentz, fréquence plasma, propagation et réflexion ionosphérique.',
            5: 'Potentiels retardés, dipôle oscillant de Hertz, puissance rayonnée et diffusion Rayleigh / Thomson.'
        }
    },
    {
        dirName: 'Tome_3_Ondes_EM_Dielectriques',
        tomeTitle: 'Tome 3 : Ondes Électromagnétiques dans les Diélectriques',
        slugPrefix: 'tome-3-ondes-em-dielectriques',
        niveau: 'l3',
        chapterTitles: {
            1: 'Chapitre 1 - Introduction aux milieux diélectriques',
            2: 'Chapitre 2 - Indice d\'un milieu et dispersion',
            3: 'Chapitre 3 - Ondes électromagnétiques dans les diélectriques isotropes',
            4: 'Chapitre 4 - Optique des milieux diélectriques anisotropes',
            5: 'Chapitre 5 - Diélectriques non linéaires et optique non linéaire'
        },
        chapterDescriptions: {
            1: 'Polarisation de la matière, vecteur déplacement électrique D, polarisabilité moléculaire et condensateurs.',
            2: 'Modèle de l\'électron lié, formule de Sellmeier, absorption et vitesses de groupe/phase.',
            3: 'Lois de Snell-Descartes, coefficients de Fresnel, réflexion totale, ondes évanescentes et fibres optiques.',
            4: 'Tenseur de permittivité, ellipsoïde des indices, biréfringence, lames retardatrices et activité optique.',
            5: 'Susceptibilité non linéaire, génération de seconde harmonique, effet Kerr et auto-focalisation.'
        }
    }
];

function cleanTitle(rawName) {
    return rawName
        .replace(/\.pdf$/i, '')
        .replace(/^Ex_\d+\.\d+_/, '')
        .replace(/^Chapitre_\d+_/, '')
        .replace(/_/g, ' ')
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

async function runImport() {
    console.log('Starting ingestion of Garing PDF files...');
    const basePath = path.join(__dirname, '..', 'public', 'assets', 'downloads', 'garing_decoupe');

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

    let totalChaptersInserted = 0;
    let totalCoursesInserted = 0;
    let totalExercisesInserted = 0;

    let overallOrder = 1;

    for (const tomeConfig of TOMES_CONFIG) {
        const tomeDir = path.join(basePath, tomeConfig.dirName);
        if (!fs.existsSync(tomeDir)) {
            console.warn(`Directory missing: ${tomeDir}`);
            continue;
        }

        console.log(`\nProcessing ${tomeConfig.tomeTitle}...`);

        const chapitresDir = path.join(tomeDir, 'Chapitres');
        const exercicesDir = path.join(tomeDir, 'Exercices');

        const chapFiles = fs.existsSync(chapitresDir) ? fs.readdirSync(chapitresDir).filter(f => f.endsWith('.pdf')) : [];
        const exFiles = fs.existsSync(exercicesDir) ? fs.readdirSync(exercicesDir).filter(f => f.endsWith('.pdf')) : [];

        // Process chapters
        for (const chapFile of chapFiles) {
            // Match Chapitre_X_...
            const match = chapFile.match(/^Chapitre_(\d+)_/i);
            if (!match) continue;

            const chapNum = parseInt(match[1], 10);
            const rawTitle = tomeConfig.chapterTitles[chapNum] || `Chapitre ${chapNum} - ${cleanTitle(chapFile)}`;
            const description = tomeConfig.chapterDescriptions[chapNum] || 'Cours détaillé et fiches d\'exercices associés.';
            const slug = slugify(`${tomeConfig.slugPrefix}-ch${chapNum}-${cleanTitle(chapFile)}`);
            const relCoursePath = `/assets/downloads/garing_decoupe/${tomeConfig.dirName}/Chapitres/${chapFile}`;

            // Check existing chapter by slug
            const [existingChap] = await pool.query('SELECT id FROM chapters WHERE slug = ?', [slug]);
            let chapterId;

            if (existingChap.length > 0) {
                chapterId = existingChap[0].id;
                await pool.query(
                    'UPDATE chapters SET discipline_id = ?, titre = ?, description = ?, tome = ?, niveau = ?, ordre = ?, order_num = ? WHERE id = ?',
                    [DISCIPLINE_ID_PHYSIQUE, rawTitle, description, tomeConfig.tomeTitle, tomeConfig.niveau, overallOrder, overallOrder, chapterId]
                );
            } else {
                const [insRes] = await pool.query(
                    'INSERT INTO chapters (discipline_id, titre, slug, description, tome, niveau, ordre, order_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [DISCIPLINE_ID_PHYSIQUE, rawTitle, slug, description, tomeConfig.tomeTitle, tomeConfig.niveau, overallOrder, overallOrder]
                );
                chapterId = insRes.insertId;
                totalChaptersInserted++;
            }
            overallOrder++;

            // Create/Update Course record for this chapter
            const courseTitle = `Cours : ${rawTitle}`;
            const courseSlug = slugify(`cours-${slug}`);
            let courseId;

            const [existingCourse] = await pool.query('SELECT id FROM courses WHERE slug = ?', [courseSlug]);
            if (existingCourse.length > 0) {
                courseId = existingCourse[0].id;
                await pool.query(
                    'UPDATE courses SET chapter_id = ?, titre = ?, description = ?, course_file = ?, niveau = ?, order_num = 1 WHERE id = ?',
                    [chapterId, courseTitle, description, relCoursePath, tomeConfig.niveau, courseId]
                );
            } else {
                const [insCourse] = await pool.query(
                    'INSERT INTO courses (chapter_id, titre, slug, description, course_file, niveau, order_num) VALUES (?, ?, ?, ?, ?, ?, 1)',
                    [chapterId, courseTitle, courseSlug, description, relCoursePath, tomeConfig.niveau]
                );
                courseId = insCourse.insertId;
                totalCoursesInserted++;
            }

            // Find matching exercises for this chapter (e.g. Ex_1.X matches Chapitre 1)
            const matchingExFiles = exFiles.filter(f => {
                const exMatch = f.match(/^Ex_(\d+)\.(\d+)_/i);
                return exMatch && parseInt(exMatch[1], 10) === chapNum;
            });

            for (const exFile of matchingExFiles) {
                const exMatch = exFile.match(/^Ex_(\d+)\.(\d+)_(.*)\.pdf$/i);
                if (!exMatch) continue;

                const exNum = `${exMatch[1]}.${exMatch[2]}`;
                const exCleanName = cleanTitle(exFile);
                const exTitle = `Exercice ${exNum} : ${exCleanName}`;
                const exSlug = slugify(`${tomeConfig.slugPrefix}-ex-${exNum}-${exCleanName}`);
                const relExPath = `/assets/downloads/garing_decoupe/${tomeConfig.dirName}/Exercices/${exFile}`;

                // Assign difficulty based on exercise number
                const subIndex = parseInt(exMatch[2], 10);
                let difficulte = 'moyen';
                if (subIndex <= 3) difficulte = 'facile';
                else if (subIndex <= 8) difficulte = 'moyen';
                else if (subIndex <= 12) difficulte = 'difficile';
                else difficulte = 'avance';

                const exDesc = `Énoncé complet et solution détaillée pour ${exTitle} (${tomeConfig.tomeTitle}).`;

                const [existingEx] = await pool.query('SELECT id FROM exercises WHERE slug = ?', [exSlug]);
                if (existingEx.length > 0) {
                    await pool.query(
                        'UPDATE exercises SET chapter_id = ?, course_id = ?, partie_cours = ?, titre = ?, description = ?, enonce_file = ?, correction_file = ?, niveau = ?, difficulte = ? WHERE id = ?',
                        [chapterId, courseId, rawTitle, exTitle, exDesc, relExPath, relExPath, tomeConfig.niveau, difficulte, existingEx[0].id]
                    );
                } else {
                    await pool.query(
                        'INSERT INTO exercises (chapter_id, course_id, partie_cours, titre, slug, description, enonce_file, correction_file, niveau, difficulte) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [chapterId, courseId, rawTitle, exTitle, exSlug, exDesc, relExPath, relExPath, tomeConfig.niveau, difficulte]
                    );
                    totalExercisesInserted++;
                }
            }
        }
    }

    console.log(`\nImport completed successfully!`);
    console.log(`Chapters inserted/updated: ${totalChaptersInserted}`);
    console.log(`Courses inserted/updated: ${totalCoursesInserted}`);
    console.log(`Exercises inserted/updated: ${totalExercisesInserted}`);

    process.exit(0);
}

runImport().catch(err => {
    console.error('Import failed:', err);
    process.exit(1);
});
