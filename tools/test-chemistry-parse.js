const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'assets', 'downloads', 'UPS de chimie', 'tdmchimie2019.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function clean(str) {
    return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapEcole(raw) {
    const r = raw.toLowerCase();
    if (r.includes('polytechnique') && r.includes('normales')) return 'École Polytechnique & ENS (Conjoint)';
    if (r.includes('polytechnique')) return 'École Polytechnique (X)';
    if (r.includes('normales') || r.includes('ens')) return 'Écoles Normales Supérieures (ENS)';
    if (r.includes('mines')) return 'Concours Commun Mines-Ponts & Écoles des Mines';
    if (r.includes('centrale')) return 'Concours Centrale-Supélec';
    if (r.includes('communs inp') || r.includes('polytechniques')) return 'Concours Communs Polytechniques (CCP - CCINP)';
    if (r.includes('e3a') || r.includes('e4a')) return 'Concours e3a - e4a';
    if (r.includes('agrégation externe')) return 'Agrégation Externe';
    if (r.includes('agrégation interne')) return 'Agrégation Interne';
    if (r.includes('c.a.p.e.s')) return 'CAPES & CAFEP';
    if (r.includes('agro') || r.includes('bcpst') || r.includes('g2e')) return 'Banque Agro-Véto, BCPST & G2E';
    if (r.includes('pt') || r.includes('arts et métiers')) return 'Banque PT & Arts et Métiers';
    return clean(raw);
}

const parts = html.split(/(?=<h[123]>)/i);
let currentFiliere = 'PC';
let currentH2 = 'Concours de Chimie';
const schoolCounts = {};

parts.forEach(part => {
    const h1M = part.match(/<h1>(.*?)<\/h1>/i);
    if (h1M) currentFiliere = clean(h1M[1]).replace(/^Filière\s*/i, '');
    
    const h2M = part.match(/<h2>(.*?)<\/h2>/i);
    if (h2M) currentH2 = clean(h2M[1]);

    const mapped = mapEcole(currentH2);
    const pdfs = [...part.matchAll(/href="(bulletin\/bult\d{4}\/[^"]+\.pdf)"/gi)];
    if (pdfs.length > 0) {
        schoolCounts[mapped] = (schoolCounts[mapped] || 0) + pdfs.length;
    }
});

console.log('Chemistry Exams by Real School Category:\n', schoolCounts);
