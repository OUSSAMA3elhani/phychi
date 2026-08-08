# build/ — génération des pages PhyChi

Les 17 pages HTML à la racine sont **générées**. Ne les modifiez pas à la main :
vos changements seront écrasés à la prochaine génération.

## Régénérer le site

```powershell
.\build\build.ps1
```

Sortie attendue : `Pages generees : 17`.

## Comment ça marche

Chaque page = `_head.html` + `_header.html` + `main-<page>.html` + `_footer.html`.

| Fichier | Rôle |
| --- | --- |
| `_head.html` | `<head>` commun (placeholders `{{TITLE}}` et `{{DESC}}`), script anti-flash du thème, polices, Tailwind |
| `_header.html` | En-tête collant, navigation bureau avec menus déroulants, menu mobile |
| `_footer.html` | Pied de page 4 colonnes + barre légale |
| `main-<page>.html` | Contenu propre à chaque page (le `<main>`) |
| `build.ps1` | Assemble le tout et applique l'état actif de la navigation |

Le manifeste `$pages` dans `build.ps1` porte, pour chaque page : la clé (= nom du fichier),
le `<title>`, la meta description, et les clés de navigation à activer.

### Générateurs de contenu

Certaines pages très répétitives sont produites à partir de données plutôt qu'écrites à la main.
Modifiez le tableau de données en haut du script, relancez-le, puis relancez `build.ps1` :

| Script | Produit |
| --- | --- |
| `gen-chimie.ps1` | `main-exercices-chimie.html` |
| `gen-chapitres.ps1` | `main-chapitres.html` |
| `gen-prose.ps1` | `main-apropos.html`, `main-mentions-legales.html`, `main-politique-confidentialite.html` |
| `gen-faq.ps1` | `main-faq.html` |
| `gen-docs.ps1` | `main-solutions.html`, `main-telechargements.html` |

Les autres `main-*.html` sont écrits directement.

---

## ⚠️ Deux pièges à connaître

### 1. Les `.ps1` DOIVENT garder leur BOM UTF-8

Windows PowerShell 5.1 lit un `.ps1` **sans BOM** comme de l'ANSI. Tous les accents français
sont alors silencieusement transformés en mojibake (`Débutant` → `DÃ©butant`) et se retrouvent
tels quels dans le HTML généré — sans aucune erreur.

Les six scripts portent un BOM. **Si votre éditeur le retire, la génération corrompra le site.**

Contrôle après chaque génération (aucune sortie = tout va bien) :

```powershell
Get-ChildItem . -Filter '*.html' | ForEach-Object {
  $t = [System.IO.File]::ReadAllText($_.FullName, [Text.Encoding]::UTF8)
  $n = ([regex]::Matches($t, 'Ã|Â|â€')).Count
  if ($n) { "$($_.Name) : $n" }
}
```

Pour réparer un script dont le BOM a sauté :

```powershell
$p = '.\build\gen-faq.ps1'
$t = [System.IO.File]::ReadAllText($p, [Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding($true)))
```

### 2. Dans `_header.html`, l'attribut marqueur et `class` restent sur la même ligne

`build.ps1` repère l'élément à activer en cherchant la chaîne **contiguë**
`data-nav="cours" class="…"`. Si vous passez à la ligne entre les deux attributs, la
correspondance échoue : le lien reçoit `aria-current` mais **pas** sa mise en évidence visuelle,
sans le moindre message d'erreur.

Attributs concernés : `data-nav`, `data-mnav`, `data-navgroup`, `data-fnav`.

### 3. Contenu large dans une grille : pensez à `min-w-0`

Un enfant de `grid` ou de `flex` a `min-width: auto` par défaut : il refuse de rétrécir
sous la largeur de son contenu. Un tableau large placé dans une grille élargit donc toute la
piste et fait déborder la page horizontalement sur mobile — même si le tableau est entouré
d'un conteneur `overflow-x-auto`, qui n'a alors plus rien à contraindre.

C'est ce qui est arrivé à `.download-category` dans `gen-docs.ps1` (372 px de débordement à
390 px de large). Correctif : `min-w-0` sur l'enfant de grille.

Contrôle du débordement horizontal sur les 17 pages (à coller dans la console d'un onglet
ouvert sur `localhost`) :

```js
const pages = ['index','cours','chapitres','exercices-physique','exercices-chimie','solutions',
  'telechargements','recherche','favoris','login','inscription','profil','apropos','contact',
  'faq','mentions-legales','politique-confidentialite'];
const f = document.createElement('iframe');
f.style.cssText = 'position:fixed;left:-9999px;width:390px;height:840px;border:0';
document.body.appendChild(f);
const load = u => new Promise(r => { f.onload = () => setTimeout(r, 700); f.src = u; });
const bad = [];
for (const p of pages) {
  await load(`http://localhost/phychi/${p}.html`);
  const ov = f.contentDocument.documentElement.scrollWidth - f.contentWindow.innerWidth;
  if (ov > 1) bad.push(`${p} (+${ov}px)`);
}
f.remove(); bad.length ? bad : 'OK — aucun debordement';
```

---

## Tailwind

Tailwind est chargé via le **Play CDN** (`cdn.tailwindcss.com`), qui compile dans le navigateur.
La configuration partagée est dans `assets/theme.js`.

Choix assumé : aucune étape de build, fonctionne directement sous XAMPP. En contrepartie, une
connexion Internet est nécessaire et un bref flash peut apparaître sur connexion lente.

Pour passer en production plus tard :

1. `npm install -D tailwindcss@3` puis créer un `tailwind.config.js` reprenant `assets/theme.js`
   (avec `content: ['./*.html']`).
2. `npx tailwindcss -i ./src/input.css -o ./assets/tailwind.css --minify`
3. Dans `_head.html`, remplacer les deux balises `cdn.tailwindcss.com` + `assets/theme.js` par
   `<link rel="stylesheet" href="assets/tailwind.css">`, puis relancer `build.ps1`.

## Fichiers partagés (hors build)

- `assets/theme.js` — configuration Tailwind (palettes `brand` / `flask`, polices, ombres, animations)
- `assets/ui.css` — trame de fond, anneau de focus, accordéons, `prefers-reduced-motion`, **et les
  variables CSS héritées (`--primary`, `--primary-light`, `--accent-rose`, `--radius-md`,
  `--shadow-lg`) que `script.js` utilise encore** pour le toast et les boutons favoris. Ne les
  supprimez pas.
- `assets/ui.js` — bascule de thème, menu mobile, ombre de l'en-tête au défilement
- `script.js` — favoris, filtres, recherche en direct, validation de formulaires (inchangé)
