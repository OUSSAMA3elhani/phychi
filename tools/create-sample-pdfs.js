const fs = require('fs');
const path = require('path');

const downloadsDir = path.join(__dirname, '..', 'public', 'assets', 'downloads');
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

fs.writeFileSync(path.join(downloadsDir, '.gitkeep'), '');
fs.writeFileSync(path.join(uploadsDir, '.gitkeep'), '');

const pdfHeader = '%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n2 0 obj <</Type /Pages /Kinds [3 0 R] /Count 1>> endobj\n3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>> >> endobj\n4 0 obj <</Length 60>> stream\nBT /F1 24 Tf 100 700 Td (PhyChi - Fiche de cours / Exercice PDF) Tj ET\nendstream endobj\n5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000246 00000 n \n0000000356 00000 n \ntrailer <</Size 6 /Root 1 0 R>>\nstartxref\n428\n%%EOF';

fs.writeFileSync(path.join(downloadsDir, 'formulaire-thermo.pdf'), pdfHeader);
fs.writeFileSync(path.join(downloadsDir, 'fiches-orga-mecanismes.pdf'), pdfHeader);

console.log('✅ Sample PDF files and .gitkeep generated in public/assets/downloads and public/uploads');
