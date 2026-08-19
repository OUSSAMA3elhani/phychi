/**
 * PhyChemia - Outil de separation des fichiers volumineux.
 *
 * Deplace les fichiers PDF/documents de public/assets/downloads dont la taille est >= 50 Mo
 * vers public/assets/large_files tout en conservant la structure exacte des dossiers.
 *
 * Utilisation :
 *   node tools/split-large-files.js               # Mode simulation (dry-run par defaut)
 *   node tools/split-large-files.js --dry-run     # Mode simulation explicite
 *   node tools/split-large-files.js --execute     # Execution du deplacement reel
 *   node tools/split-large-files.js --size 100    # Threshold personnalise en Mo (ex: 100 Mo)
 *   node tools/split-large-files.js --restore     # Restaure les fichiers vers downloads
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DOWNLOADS_DIR = path.join(ROOT, 'public', 'assets', 'downloads');
const LARGE_FILES_DIR = path.join(ROOT, 'public', 'assets', 'large_files');

// Parse CLI flags
const args = process.argv.slice(2);
const isExecute = args.includes('--execute') || args.includes('-e');
const isRestore = args.includes('--restore');
const isDryRun = !isExecute && !isRestore;

let sizeThresholdMb = 50;
const sizeIdx = args.indexOf('--size');
if (sizeIdx !== -1 && args[sizeIdx + 1]) {
    const parsed = parseFloat(args[sizeIdx + 1]);
    if (!isNaN(parsed) && parsed > 0) {
        sizeThresholdMb = parsed;
    }
}

const SIZE_THRESHOLD_BYTES = sizeThresholdMb * 1024 * 1024;

/**
 * Deplacement de fichier securise avec gestion du changement de point de montage (EXDEV).
 */
function safeMoveFile(srcPath, destPath) {
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    try {
        fs.renameSync(srcPath, destPath);
    } catch (err) {
        if (err.code === 'EXDEV') {
            fs.copyFileSync(srcPath, destPath);
            fs.unlinkSync(srcPath);
        } else {
            throw err;
        }
    }
}

/**
 * Parcours récursif d'un dossier.
 */
function scanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return [];
    let filesList = [];
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            filesList = filesList.concat(scanDirectory(fullPath));
        } else if (stat.isFile()) {
            filesList.push({
                fullPath,
                size: stat.size,
                sizeMb: (stat.size / (1024 * 1024)).toFixed(2),
            });
        }
    }
    return filesList;
}

function runRestore() {
    console.log('=== RESTAURATION DES FICHIERS VOLUMINEUX ===');
    console.log(`Source : ${LARGE_FILES_DIR}`);
    console.log(`Cible  : ${DOWNLOADS_DIR}\n`);

    if (!fs.existsSync(LARGE_FILES_DIR)) {
        console.log('Aucun dossier large_files trouve. Rien a restaurer.');
        return;
    }

    const allLarge = scanDirectory(LARGE_FILES_DIR);
    console.log(`Fichiers trouves dans large_files : ${allLarge.length}`);

    if (allLarge.length === 0) {
        console.log('Aucun fichier a restaurer.');
        return;
    }

    let movedCount = 0;
    let totalBytes = 0;

    for (const file of allLarge) {
        const relPath = path.relative(LARGE_FILES_DIR, file.fullPath);
        const destPath = path.join(DOWNLOADS_DIR, relPath);

        if (isExecute) {
            safeMoveFile(file.fullPath, destPath);
            console.log(`[ RESTAURE ] (${file.sizeMb} Mo) ${relPath}`);
        } else {
            console.log(`[ SIMULATION RESTORE ] (${file.sizeMb} Mo) ${relPath}`);
        }
        movedCount++;
        totalBytes += file.size;
    }

    const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
    const totalGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);

    console.log('\n---------------------------------------------------------');
    console.log(`Mode               : ${isExecute ? 'EXECUTE (Reel)' : 'DRY-RUN (Simulation - utilisez --execute pour appliquer)'}`);
    console.log(`Fichiers restaures : ${movedCount}`);
    console.log(`Volume total       : ${totalMb} Mo (${totalGb} Go)`);
    console.log('---------------------------------------------------------\n');
}

function runSplit() {
    console.log('=== SEPARATION DES FICHIERS PAR TAILLE ===');
    console.log(`Dossier downloads : ${DOWNLOADS_DIR}`);
    console.log(`Dossier cible     : ${LARGE_FILES_DIR}`);
    console.log(`Seuil de taille   : >= ${sizeThresholdMb} Mo (${SIZE_THRESHOLD_BYTES} octets)\n`);

    if (!fs.existsSync(DOWNLOADS_DIR)) {
        console.error(`Erreur : Le dossier downloads n'existe pas (${DOWNLOADS_DIR}).`);
        process.exit(1);
    }

    const allFiles = scanDirectory(DOWNLOADS_DIR);
    const lightFiles = [];
    const heavyFiles = [];

    for (const file of allFiles) {
        if (file.size >= SIZE_THRESHOLD_BYTES) {
            heavyFiles.push(file);
        } else {
            lightFiles.push(file);
        }
    }

    console.log(`Total de fichiers scannes : ${allFiles.length}`);
    console.log(`Fichiers legers (< ${sizeThresholdMb} Mo) : ${lightFiles.length}`);
    console.log(`Fichiers lourds (>= ${sizeThresholdMb} Mo) : ${heavyFiles.length}\n`);

    if (heavyFiles.length === 0) {
        console.log(`Aucun fichier ne depasse le seuil de ${sizeThresholdMb} Mo.`);
        return;
    }

    console.log('Fichiers qualifies pour deplacement vers public/assets/large_files :');
    let totalMovedBytes = 0;

    heavyFiles.forEach((file, idx) => {
        const relPath = path.relative(DOWNLOADS_DIR, file.fullPath);
        const targetPath = path.join(LARGE_FILES_DIR, relPath);
        totalMovedBytes += file.size;

        if (isExecute) {
            safeMoveFile(file.fullPath, targetPath);
            console.log(`  ${idx + 1}. [ DEPLACE ] (${file.sizeMb} Mo) ${relPath}`);
        } else {
            console.log(`  ${idx + 1}. [ SIMULATION ] (${file.sizeMb} Mo) ${relPath}`);
        }
    });

    const totalMovedMb = (totalMovedBytes / (1024 * 1024)).toFixed(2);
    const totalMovedGb = (totalMovedBytes / (1024 * 1024 * 1024)).toFixed(2);

    console.log('\n=========================================================');
    console.log(`Mode de fonctionnement  : ${isExecute ? 'EXECUTION REELLE (--execute)' : 'SIMULATION SAFE (--dry-run)'}`);
    console.log(`Nombre de fichiers       : ${heavyFiles.length}`);
    console.log(`Espace total economise   : ${totalMovedMb} Mo (${totalMovedGb} Go)`);
    if (!isExecute) {
        console.log('\n[!] Pour effectuer le deplacement reel, relancez avec la commande :');
        console.log('    node tools/split-large-files.js --execute');
    }
    console.log('=========================================================\n');
}

if (isRestore) {
    runRestore();
} else {
    runSplit();
}
