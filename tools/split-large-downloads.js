/**
 * Script de separation des fichiers lourds (>= 10 Mo) dans public/assets/downloads.
 *
 * Usage :
 *   node tools/split-large-downloads.js             (Mode Dry-Run par defaut)
 *   node tools/split-large-downloads.js --dry-run   (Mode Dry-Run explicite)
 *   node tools/split-large-downloads.js --execute   (Mode execution : deplace reellement les fichiers)
 *   node tools/split-large-downloads.js --threshold=5 (Seuil personnalise en Mo, ex: 5 Mo)
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DOWNLOADS_DIR = path.join(ROOT_DIR, 'public', 'assets', 'downloads');
const LARGE_FILES_DIR = path.join(ROOT_DIR, 'public', 'assets', 'large_files');

// Evaluation des arguments CLI
const args = process.argv.slice(2);
const isExecuteMode = args.includes('--execute') || args.includes('-e');
const isDryRunMode = !isExecuteMode || args.includes('--dry-run') || args.includes('-d');

// Seuil par defaut : 10 Mo (10 * 1024 * 1024 octets)
let thresholdMb = 10;
const thresholdArg = args.find((a) => a.startsWith('--threshold='));
if (thresholdArg) {
    const parsedMb = parseFloat(thresholdArg.split('=')[1]);
    if (!isNaN(parsedMb) && parsedMb > 0) {
        thresholdMb = parsedMb;
    }
}
const THRESHOLD_BYTES = thresholdMb * 1024 * 1024;

/**
 * Parcours récursif d'un dossier.
 */
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

function formatMb(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2);
}

function formatGb(bytes) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2);
}

function run() {
    console.log('================================================================');
    console.log('   Séparation des Fichiers Lourds - PhyChemia Assets Manager    ');
    console.log('================================================================');
    console.log(`Dossier source downloads  : ${DOWNLOADS_DIR}`);
    console.log(`Dossier cible large_files : ${LARGE_FILES_DIR}`);
    console.log(`Seuil de taille           : ${thresholdMb} Mo (${THRESHOLD_BYTES.toLocaleString()} octets)`);
    console.log(`Mode de fonctionnement    : ${isExecuteMode ? '⚡ EXECUTION REELLE' : '🔍 DRY-RUN (Simulation sans modification)'}`);
    console.log('----------------------------------------------------------------\n');

    if (!fs.existsSync(DOWNLOADS_DIR)) {
        console.error(`❌ Erreur : Le dossier source "${DOWNLOADS_DIR}" n'existe pas.`);
        process.exit(1);
    }

    console.log('🔍 Analyse et calcul des tailles de fichiers en cours...');
    const allFiles = getFilesRecursively(DOWNLOADS_DIR);

    const largeFiles = [];
    const lightFiles = [];

    let totalSizeBytes = 0;
    let largeSizeBytes = 0;
    let lightSizeBytes = 0;

    for (const filePath of allFiles) {
        try {
            const stat = fs.statSync(filePath);
            const size = stat.size;
            totalSizeBytes += size;

            const relativePath = path.relative(DOWNLOADS_DIR, filePath);
            const targetPath = path.join(LARGE_FILES_DIR, relativePath);

            const fileInfo = {
                sourcePath: filePath,
                targetPath,
                relativePath,
                sizeBytes: size,
                sizeMb: formatMb(size)
            };

            if (size >= THRESHOLD_BYTES) {
                largeFiles.push(fileInfo);
                largeSizeBytes += size;
            } else {
                lightFiles.push(fileInfo);
                lightSizeBytes += size;
            }
        } catch (err) {
            console.warn(`⚠️ Impossible de lire le fichier "${filePath}" :`, err.message);
        }
    }

    console.log(`\n📊 RAPPORT D'ANALYSE :`);
    console.log(`- Fichiers totaux analysés : ${allFiles.length.toLocaleString()}`);
    console.log(`- Taille totale du dossier : ${formatGb(totalSizeBytes)} Go (${totalSizeBytes.toLocaleString()} octets)`);
    console.log(`- Fichiers légers (< ${thresholdMb} Mo)   : ${lightFiles.length.toLocaleString()} fichiers (${formatGb(lightSizeBytes)} Go / ${lightSizeBytes.toLocaleString()} octets)`);
    console.log(`- Fichiers lourds (>= ${thresholdMb} Mo)  : ${largeFiles.length.toLocaleString()} fichiers (${formatGb(largeSizeBytes)} Go / ${largeSizeBytes.toLocaleString()} octets)`);
    console.log('----------------------------------------------------------------\n');

    if (largeFiles.length === 0) {
        console.log(`✅ Aucun fichier >= ${thresholdMb} Mo trouvé dans ${DOWNLOADS_DIR}.`);
        return;
    }

    // Tri des fichiers lourds par taille décroissante
    largeFiles.sort((a, b) => b.sizeBytes - a.sizeBytes);

    console.log(`📋 LISTE DES FICHIERS LOURDS (>= ${thresholdMb} Mo) :`);
    largeFiles.forEach((file, index) => {
        console.log(`  ${(index + 1).toString().padStart(3, ' ')}. [${file.sizeMb.padStart(7, ' ')} Mo] ${file.relativePath}`);
    });

    console.log('\n----------------------------------------------------------------');

    if (!isExecuteMode) {
        console.log('\n💡 REMARQUE : Vous êtes en mode simulation (DRY-RUN). Aucun fichier n\'a été déplacé.');
        console.log('   Pour exécuter le déplacement réel des fichiers, lancez la commande :');
        console.log('   node tools/split-large-downloads.js --execute\n');
        return;
    }

    // Execution reelle
    console.log('\n🚀 DEPLACEMENT DES FICHIERS LOURDS EN COURS...');
    let movedCount = 0;
    let errorCount = 0;

    for (const file of largeFiles) {
        try {
            const targetDir = path.dirname(file.targetPath);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            // Tentative de deplacement direct (rename)
            try {
                fs.renameSync(file.sourcePath, file.targetPath);
            } catch (err) {
                // Repli en cas de systeme de fichiers different (copy + unlink)
                fs.copyFileSync(file.sourcePath, file.targetPath);
                fs.unlinkSync(file.sourcePath);
            }

            movedCount++;
            console.log(`  ✅ Déplacé [${file.sizeMb} Mo] : ${file.relativePath}`);
        } catch (err) {
            errorCount++;
            console.error(`  ❌ Erreur de déplacement pour "${file.relativePath}" :`, err.message);
        }
    }

    console.log('\n================================================================');
    console.log('   BILAN DE L\'EXECUTION DE SEPARATION                          ');
    console.log('================================================================');
    console.log(`- Fichiers déplacés avec succès : ${movedCount} / ${largeFiles.length}`);
    if (errorCount > 0) {
        console.log(`- Erreurs lors du déplacement    : ${errorCount}`);
    }
    console.log(`- Espace libéré dans downloads  : ${formatGb(largeSizeBytes)} Go (${largeSizeBytes.toLocaleString()} octets)`);
    console.log(`- Destination des fichiers      : ${LARGE_FILES_DIR}`);
    console.log('================================================================\n');
}

run();
