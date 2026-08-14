const fs = require('fs');
const path = require('path');

const folders = [
    { baseDir: 'public/assets/downloads/UPS_Concours_Organises', defaultMatiere: 'Physique' },
    { baseDir: 'public/assets/downloads/UPS_Concours_Organises_2', defaultMatiere: 'Chimie' }
];

function cleanCategoryName(dirName) {
    return dirName.replace(/^\d+\.\s*/, '').trim();
}

function detectMatiere(epreuveStr, defaultMatiere) {
    const s = epreuveStr.toLowerCase();
    if (s.includes('physique-chimie') || s.includes('physique_chimie') || s.includes('physique et chimie')) {
        return 'Physique-Chimie';
    }
    if (s.includes('chimie')) {
        return 'Chimie';
    }
    if (s.includes('physique')) {
        return 'Physique';
    }
    return defaultMatiere;
}

function parsePdfFile(fullPdfPath, ecoleDir, defaultMatiere) {
    const filename = path.basename(fullPdfPath);
    
    // Detect year
    const yearMatch = fullPdfPath.match(/\b(199[5-9]|20[0-2][0-9])\b/);
    const annee = yearMatch ? parseInt(yearMatch[1], 10) : 2020;

    // Detect filiere
    let filiere = 'Toutes';
    const filiereMatch = filename.match(/\b(MP|PC|PSI|PT|BCPST|TSI|TB|ATS)\b/i);
    if (filiereMatch) {
        filiere = filiereMatch[1].toUpperCase();
    }

    // Detect doc type
    const isCorrige = /corrige/i.test(filename);

    // Clean epreuve title
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
        cleanEpreuve = defaultMatiere === 'Chimie' ? 'Épreuve de Chimie' : 'Épreuve de Physique';
    }

    cleanEpreuve = cleanEpreuve.charAt(0).toUpperCase() + cleanEpreuve.slice(1);
    const matiere = detectMatiere(cleanEpreuve + ' ' + filename, defaultMatiere);

    // Refine ecole category
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
        matiere,
        epreuve: cleanEpreuve,
        type: isCorrige ? 'corrige' : 'enonce',
        filename
    };
}

function testFullImport() {
    console.log('Testing full import across BOTH Physics AND Chemistry UPS folders...');
    
    let totalPdfFiles = 0;
    const concoursGroups = new Map();

    for (const config of folders) {
        const basePath = path.join(__dirname, '..', config.baseDir);
        if (!fs.existsSync(basePath)) continue;

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
            totalPdfFiles += pdfPaths.length;

            for (const fullPdfPath of pdfPaths) {
                const parsed = parsePdfFile(fullPdfPath, catDirName, config.defaultMatiere);
                const relFolder = path.basename(config.baseDir);
                const relativePath = `/assets/downloads/${relFolder}/` + path.relative(basePath, fullPdfPath).replace(/\\/g, '/');

                const groupKey = `${parsed.ecole}::${parsed.annee}::${parsed.filiere}::${parsed.matiere}::${parsed.epreuve.toLowerCase()}`;

                if (!concoursGroups.has(groupKey)) {
                    concoursGroups.set(groupKey, {
                        ecole: parsed.ecole,
                        annee: parsed.annee,
                        filiere: parsed.filiere,
                        matiere: parsed.matiere,
                        epreuve: parsed.epreuve,
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
    }

    console.log(`Total PDF files processed: ${totalPdfFiles}`);
    console.log(`Total unique concours entries created: ${concoursGroups.size}`);

    let physiqueCount = 0, chimieCount = 0, pcCount = 0;
    let pairedCount = 0;

    for (const g of concoursGroups.values()) {
        if (g.matiere === 'Physique') physiqueCount++;
        else if (g.matiere === 'Chimie') chimieCount++;
        else pcCount++;

        if (g.enonce_file && g.correction_file) pairedCount++;
    }

    console.log(`- Matière Physique: ${physiqueCount}`);
    console.log(`- Matière Chimie: ${chimieCount}`);
    console.log(`- Matière Physique-Chimie: ${pcCount}`);
    console.log(`- Concours avec Énoncé ET Corrigé appariés: ${pairedCount}`);
}

testFullImport();
