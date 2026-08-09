/**
 * Prepare un artefact de deploiement pour GoDaddy Node.js Hosting.
 *
 *   npm run deploy:package
 *
 * Copie dans `deploy/` uniquement ce que la plateforme doit recevoir, en
 * excluant ce que le contrat interdit de televerser :
 *   - node_modules/  (W004 - la plateforme lance l'installation elle-meme)
 *   - .env           (W001 - les secrets passent par l'interface d'hebergement)
 *   - build/         (generateurs PowerShell : inutiles sur un hote Linux)
 *   - .git/, .github/, .claude/, *.zip
 *
 * Le dossier produit doit faire sortir le validateur en code 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'deploy');

/** Entrees copiees telles quelles quand elles existent. */
const INCLUDE_DIRS = [
    'assets',
    'config',
    'controllers',
    'database',
    'middleware',
    'models',
    'public',
    'routes',
    'services',
    'views',
];

const INCLUDE_FILES = ['package.json', 'package-lock.json', '.npmrc', 'server.js', 'script.js'];

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const from = path.join(src, entry.name);
        const to = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(from, to);
        else if (entry.isFile()) fs.copyFileSync(from, to);
    }
}

function dirSize(dir) {
    let total = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) total += dirSize(p);
        else if (entry.isFile()) total += fs.statSync(p).size;
    }
    return total;
}

// Repart d'un dossier propre : sinon un fichier supprime du projet
// survivrait dans l'artefact precedent.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let copied = 0;

for (const dir of INCLUDE_DIRS) {
    const src = path.join(ROOT, dir);
    if (!fs.existsSync(src)) continue;
    copyDir(src, path.join(OUT, dir));
    copied++;
}

for (const file of INCLUDE_FILES) {
    const src = path.join(ROOT, file);
    if (!fs.existsSync(src)) {
        if (file === 'package-lock.json') {
            console.warn(`  ! ${file} absent — lancez \`npm install\` pour le generer avant de deployer.`);
        }
        continue;
    }
    fs.copyFileSync(src, path.join(OUT, file));
    copied++;
}

// Les pages HTML generees, a la racine du projet.
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
for (const page of pages) {
    fs.copyFileSync(path.join(ROOT, page), path.join(OUT, page));
}

const bytes = dirSize(OUT);
const mb = (bytes / 1024 / 1024).toFixed(2);

console.log(`Artefact pret : ${path.relative(ROOT, OUT)}`);
console.log(`  ${copied} entrees + ${pages.length} pages HTML`);
console.log(`  taille : ${mb} Mo (limite plateforme : 100 Mo)`);
console.log('');
console.log('Verification :');
console.log('  node <skill>/scripts/validate-paas.mjs deploy');
console.log('');
console.log('Rappel : definissez SESSION_SECRET et CONTACT_FORM_RECIPIENT_EMAIL');
console.log('dans le panneau Environment Variables de Node.js Hosting.');

if (bytes > 100 * 1024 * 1024) {
    console.error('\nL artefact depasse 100 Mo : allegez-le avant de le televerser.');
    process.exit(1);
}
