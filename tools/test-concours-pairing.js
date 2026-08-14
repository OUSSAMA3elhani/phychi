const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '..', 'public', 'assets', 'downloads', 'UPS_Concours_Organises');

function cleanCategoryName(dirName) {
    return dirName.replace(/^\d+\.\s*/, '').trim();
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

function parsePdfFile(filename, ecoleDir) {
    const nameWithoutExt = filename.replace(/\.pdf$/i, '');
    
    // Detect year
    const yearMatch = nameWithoutExt.match(/\b(199[5-9]|20[0-2][0-9])\b/);
    const annee = yearMatch ? parseInt(yearMatch[1], 10) : 2020;

    // Detect filiere
    let filiere = 'Toutes';
    const filiereMatch = nameWithoutExt.match(/\b(MP|PC|PSI|PT|BCPST|TSI|TB|ATS)\b/i);
    if (filiereMatch) {
        filiere = filiereMatch[1].toUpperCase();
    }

    // Detect doc type (enonce vs corrige)
    const isCorrige = /corrige/i.test(nameWithoutExt);

    // Clean epreuve title
    let cleanEpreuve = nameWithoutExt
        .replace(/_(Enonce|Corrige|Sujet).*/i, '')
        .replace(/\b(Enonce|Corrige|Sujet)\b.*/i, '')
        .replace(/Part[1-9]/gi, '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleanEpreuve || cleanEpreuve.length < 3) {
        cleanEpreuve = 'Épreuve de Physique';
    }

    // Refine ecole category
    let ecole = cleanCategoryName(ecoleDir);
    if (ecole.includes('Agrégation') || ecole.includes('CAPES')) {
        const e = cleanEpreuve.toLowerCase();
        if (e.includes('interne') || e.includes('dossier') || e.includes('theme') || e.includes('thème')) {
            ecole = 'Agrégation Interne';
        } else if (e.includes('capes') || e.includes('cafep') || e.includes('traitement') || e.includes('documentaire')) {
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

function testPairing() {
    console.log('Testing PDF pairing across UPS Concours Organises...');
    
    let totalFiles = 0;
    const groups = new Map();

    const categoryDirs = fs.readdirSync(basePath).filter(name => {
        return fs.statSync(path.join(basePath, name)).isDirectory();
    });

    for (const catDir of categoryDirs) {
        const catPath = path.join(basePath, catDir);

        function scanFolder(folder) {
            let res = [];
            fs.readdirSync(folder).forEach(item => {
                const itemPath = path.join(folder, item);
                if (fs.statSync(itemPath).isDirectory()) {
                    res = res.concat(scanFolder(itemPath));
                } else if (item.endsWith('.pdf')) {
                    res.push({ path: itemPath, filename: item, catDir });
                }
            });
            return res;
        }

        const pdfs = scanFolder(catPath);
        totalFiles += pdfs.length;

        for (const pdf of pdfs) {
            const parsed = parsePdfFile(pdf.filename, catDir);
            const relPath = '/assets/downloads/UPS_Concours_Organises/' + path.relative(basePath, pdf.path).replace(/\\/g, '/');

            // Normalized matching key for pairing
            const normKey = parsed.epreuve.toLowerCase()
                .replace(/^(physique|chimie)\s*\d{4}\s*/i, '')
                .replace(/\s+/g, ' ');

            const groupKey = `${parsed.ecole}::${parsed.annee}::${parsed.filiere}::${normKey}`;

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    ecole: parsed.ecole,
                    annee: parsed.annee,
                    filiere: parsed.filiere,
                    epreuve: parsed.epreuve,
                    matiere: detectMatiere(parsed.epreuve),
                    enonce_file: null,
                    correction_file: null
                });
            }

            const g = groups.get(groupKey);
            if (parsed.type === 'enonce') {
                if (!g.enonce_file || !g.enonce_file.includes('Part2')) {
                    g.enonce_file = relPath;
                }
            } else {
                if (!g.correction_file || !g.correction_file.includes('Part2')) {
                    g.correction_file = relPath;
                }
            }
        }
    }

    console.log(`Total PDF files found: ${totalFiles}`);
    console.log(`Total unique concours entries: ${groups.size}`);

    let pairedWithBoth = 0;
    let onlyEnonce = 0;
    let onlyCorrige = 0;

    for (const g of groups.values()) {
        if (g.enonce_file && g.correction_file) pairedWithBoth++;
        else if (g.enonce_file) onlyEnonce++;
        else if (g.correction_file) onlyCorrige++;
    }

    console.log(`- Entries with BOTH Enoncé and Corrigé: ${pairedWithBoth}`);
    console.log(`- Entries with Enoncé only: ${onlyEnonce}`);
    console.log(`- Entries with Corrigé only: ${onlyCorrige}`);
}

testPairing();
