/**
 * Script pour séparer les fichiers volumineux (>= 50 Mo) de public/assets/downloads
 * vers public/assets/large_files en conservant l'arborescence exacte des dossiers.
 *
 * Utilisation :
 *   - Mode Simulation (Dry Run par défaut) :
 *       node tools/split-large-files.js
 *
 *   - Mode Exécution (déplacement effectif des fichiers) :
 *       node tools/split-large-files.js --execute
 *
 * Options personnalisables :
 *   --threshold=50    Taille minimale en Mo (défaut : 50)
 *   --source=...      Dossier source (défaut : public/assets/downloads)
 *   --target=...      Dossier cible (défaut : public/assets/large_files)
 */

const fs = require('node:fs');
const path = require('node:path');

// Operational parameters
const args = process.argv.slice(2);
const isExecute = args.includes('--execute') || args.includes('--apply') || args.includes('-y');
const thresholdArg = args.find((a) => a.startsWith('--threshold='));
const thresholdMB = thresholdArg ? parseFloat(thresholdArg.split('=')[1]) : 50;
const thresholdBytes = thresholdMB * 1024 * 1024;

const rootDir = path.resolve(__dirname, '..');
const sourceArg = args.find((a) => a.startsWith('--source='));
const sourceDir = sourceArg ? path.resolve(rootDir, sourceArg.split('=')[1]) : path.join(rootDir, 'public', 'assets', 'downloads');

const targetArg = args.find((a) => a.startsWith('--target='));
const targetDir = targetArg ? path.resolve(rootDir, targetArg.split('=')[1]) : path.join(rootDir, 'public', 'assets', 'large_files');

function getFilesRecursively(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of list) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(getFilesRecursively(fullPath));
        } else if (entry.isFile()) {
            results.push(fullPath);
        }
    }
    return results;
}

function moveFileSafe(src, dest) {
    const destFolder = path.dirname(dest);
    if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
    }
    try {
        fs.renameSync(src, dest);
    } catch (err) {
        // En cas d'erreur de déplacement cross-device, repli sur copie + suppression
        if (err.code === 'EXDEV') {
            fs.copyFileSync(src, dest);
            fs.unlinkSync(src);
        } else {
            throw err;
        }
    }
}

function main() {
    console.log('================================================================');
    console.log(` Séparation des fichiers volumineux (Seuil >= ${thresholdMB} Mo)`);
    console.log('================================================================');
    console.log(`Dossier source : ${sourceDir}`);
    console.log(`Dossier cible  : ${targetDir}`);
    console.log(`Mode           : ${isExecute ? 'EXECUTION (Déplacement effectif)' : 'SIMULATION (Dry Run - aucun fichier déplacé)'}`);
    console.log('----------------------------------------------------------------\n');

    if (!fs.existsSync(sourceDir)) {
        console.error(`Erreur : Le dossier source "${sourceDir}" n'existe pas.`);
        process.exit(1);
    }

    console.log('Analyse des fichiers en cours...');
    const allFiles = getFilesRecursively(sourceDir);
    const largeFiles = [];

    for (const filePath of allFiles) {
        try {
            const stat = fs.statSync(filePath);
            if (stat.size >= thresholdBytes) {
                const relativePath = path.relative(sourceDir, filePath);
                largeFiles.push({
                    fullPath: filePath,
                    relativePath,
                    sizeBytes: stat.size,
                    sizeMB: (stat.size / (1024 * 1024)).toFixed(2),
                });
            }
        } catch (err) {
            console.warn(`Impossible de lire le fichier "${filePath}":`, err.message);
        }
    }

    console.log(`Total des fichiers scannés : ${allFiles.length}`);
    console.log(`Fichiers volumineux (>= ${thresholdMB} Mo) trouvés : ${largeFiles.length}\n`);

    if (largeFiles.length === 0) {
        console.log('Aucun fichier volumineux ne dépasse le seuil.');
        return;
    }

    let totalSizeBytes = 0;
    console.log('Liste des fichiers concernés :');
    console.log('----------------------------------------------------------------');

    largeFiles.forEach((file, index) => {
        totalSizeBytes += file.sizeBytes;
        const targetPath = path.join(targetDir, file.relativePath);
        console.log(`[${index + 1}/${largeFiles.length}] ${file.relativePath} (${file.sizeMB} Mo)`);

        if (isExecute) {
            moveFileSafe(file.fullPath, targetPath);
        }
    });

    const totalMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);
    const totalGB = (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2);

    console.log('----------------------------------------------------------------');
    console.log(`Taille totale des fichiers concernés : ${totalMB} Mo (${totalGB} Go)`);

    if (isExecute) {
        console.log(`\nSuccès ! ${largeFiles.length} fichiers ont été déplacés avec succès dans "${targetDir}".`);
    } else {
        console.log('\n[RAPPEL SIMULATION] Aucun fichier n\'a été déplacé.');
        console.log('Pour effectuer le déplacement effectif des fichiers, relancez la commande avec --execute :');
        console.log('  node tools/split-large-files.js --execute');
    }
}

main();
