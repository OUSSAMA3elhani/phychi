const fs = require('fs');
const path = require('path');

const physMdPath = path.join(__dirname, '..', 'public', 'assets', 'downloads', 'UPS de physique', 'concours_par_ecole_ups.md');
const chimHtmlPath = path.join(__dirname, '..', 'public', 'assets', 'downloads', 'UPS de chimie', 'tdmchimie2019.html');

function testParsePhysicsMd() {
    if (!fs.existsSync(physMdPath)) {
        console.log('Physics MD missing');
        return [];
    }
    const content = fs.readFileSync(physMdPath, 'utf8');
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

            // Check if corresponding correction file exists in p/c
            const corrPdfRel = pdfRelPath.replace('/p/e/', '/p/c/').replace('e.pdf', 'c.pdf');
            const fullCorrPath = path.join(__dirname, '..', 'public', 'assets', 'downloads', 'UPS de physique', 'fichiers', corrPdfRel);
            const corrExists = fs.existsSync(fullCorrPath);

            let ecole = ecoleMatch[1].trim();
            if (ecole.includes('Agrégation')) ecole = 'Agrégation Externe';
            else if (ecole.includes('C.A.P.E.S.')) ecole = 'CAPES & CAFEP';

            items.push({
                titre: titleMatch ? titleMatch[1].trim() : 'Concours de Physique',
                ecole,
                annee: parseInt(anneeMatch[1], 10),
                filiere: filiereMatch ? filiereMatch[1].trim() : 'Toutes',
                matiere: matiereMatch ? matiereMatch[1].trim() : 'Physique',
                epreuve: epreuveMatch ? epreuveMatch[1].trim() : 'Épreuve',
                description: themeMatch ? themeMatch[1].trim() : '',
                enonce_file: exists ? '/assets/downloads/UPS de physique/fichiers/' + pdfRelPath : null,
                correction_file: corrExists ? '/assets/downloads/UPS de physique/fichiers/' + corrPdfRel : null
            });
        }
    }
    return items;
}

function testParseChemistryHtml() {
    if (!fs.existsSync(chimHtmlPath)) {
        console.log('Chemistry HTML missing');
        return [];
    }
    const content = fs.readFileSync(chimHtmlPath, 'utf8');
    const items = [];

    // Regex to extract blocks
    const blockRegex = /<b><font color="red">Thématique : <\/font><\/b>(.*?)(?=<hr\/>|<h3>|<h2>|<div style="text-align: center;">|$)/gs;
    let match;

    while ((match = blockRegex.exec(content)) !== null) {
        const block = match[1];
        const themeText = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        // Extract PDF links
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

                items.push({
                    titre: 'Concours de Chimie ' + annee,
                    ecole: 'Concours de Chimie',
                    annee,
                    filiere: 'Toutes',
                    matiere: 'Chimie',
                    epreuve: 'Composition de Chimie',
                    description: themeText,
                    enonce_file: exists ? '/assets/downloads/UPS de chimie/' + pdfRelPath : null,
                    correction_file: corrRelPath
                });
            }
        }
    }
    return items;
}

const physItems = testParsePhysicsMd();
const chimItems = testParseChemistryHtml();

console.log(`Physics catalog items parsed: ${physItems.length}`);
console.log(`- With valid Enoncé PDF: ${physItems.filter(x => x.enonce_file).length}`);
console.log(`- With valid Corrigé PDF: ${physItems.filter(x => x.correction_file).length}`);

console.log(`\nChemistry catalog items parsed: ${chimItems.length}`);
console.log(`- With valid Enoncé PDF: ${chimItems.filter(x => x.enonce_file).length}`);
console.log(`- With valid Corrigé PDF: ${chimItems.filter(x => x.correction_file).length}`);
