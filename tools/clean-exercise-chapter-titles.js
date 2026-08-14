/**
 * Script for cleaning exercise titles and descriptions in MySQL `exercises` table:
 * Strips "Chapitre 11 - ", "Chapitre 10 - ", "Chapitre X : ", "Chapitre #" from exercise titles and descriptions.
 * Usage: node tools/clean-exercise-chapter-titles.js
 */
require('dotenv').config();
const { pool } = require('../config/db');

function cleanExerciseText(str) {
    if (!str) return '';
    return str
        .replace(/Chapitre\s*\d+\s*[\:\-\.]+\s*/gi, '')
        .replace(/Chapitre\s*\d+\s*/gi, '')
        .replace(/Exercices\s*&\s*Corrigés\s*:\s*/gi, 'Exercices & Corrigés : ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function runCleanup() {
    console.log('Démarrage du nettoyage des titres et descriptions d exercices...');

    const [rows] = await pool.query('SELECT id, titre, description FROM exercises');
    let updatedCount = 0;

    for (const exo of rows) {
        const cleanedTitre = cleanExerciseText(exo.titre);
        const cleanedDesc = cleanExerciseText(exo.description);

        if (cleanedTitre !== exo.titre || cleanedDesc !== exo.description) {
            await pool.query(
                'UPDATE exercises SET titre = ?, description = ? WHERE id = ?',
                [cleanedTitre, cleanedDesc, exo.id]
            );
            updatedCount++;
        }
    }

    console.log(`\nNettoyage terminé ! ${updatedCount} exercices mis à jour.`);
    process.exit(0);
}

runCleanup().catch(err => {
    console.error('Erreur lors du nettoyage :', err);
    process.exit(1);
});
