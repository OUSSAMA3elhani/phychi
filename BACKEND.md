# PhyChi — backend Node.js / Express

API Express en architecture MVC, base MySQL, servant les 17 pages statiques
generees par le pipeline `build/`.

---

## Demarrage rapide (XAMPP)

```bash
# 1. Dependances
npm install

# 2. Configuration locale
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # -> SESSION_SECRET

# 3. Base de donnees (MySQL doit tourner dans XAMPP)
npm run db:init

# 4. Serveur
npm start          # http://localhost:3000
npm run dev        # rechargement automatique
```

> **Important** : le site se consulte desormais sur **`http://localhost:3000`**,
> servi par Node — plus sur `http://localhost/phychi` (Apache). Les appels API
> et le fichier `/js/app.js` sont resolus a la racine du domaine et ne
> fonctionnent pas depuis le sous-dossier Apache.

---

## Architecture

```
server.js              Point d'entree : securite, sessions, statique, routes
config/db.js           Pool MySQL (mysql2), variables DB_* depuis l'environnement
routes/                Definition des routes, aucune logique metier
controllers/           Logique applicative, mise en forme des reponses
models/                Acces aux donnees, requetes parametrees uniquement
middleware/            Garde d'authentification + validation des entrees
services/email.js      Helper sendEmail() de la passerelle GoDaddy (regle C13)
views/                 Pages d'erreur 404 / 500
database/              schema.sql + script d'initialisation
public/js/app.js       Liaison des formulaires HTML avec l'API
tools/                 Script de preparation de l'artefact de deploiement
```

Le flux d'une requete : `routes` → `middleware` → `controllers` → `models`.
Un controleur ne construit jamais de SQL ; un modele ne connait jamais `req`/`res`.

---

## API

| Methode | Route | Auth | Role |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | — | Creer un compte, ouvre la session |
| POST | `/api/auth/login` | — | Connexion |
| POST | `/api/auth/logout` | — | Deconnexion |
| GET | `/api/auth/me` | — | Etat de session (utilise par l'en-tete) |
| PUT | `/api/auth/profile` | oui | Mise a jour du profil |
| PUT | `/api/auth/password` | oui | Changement de mot de passe |
| POST | `/api/contact` | — | Envoi du formulaire de contact |
| GET | `/api/health` | — | Sonde de sante |

**Format de reponse**, identique partout :

```jsonc
// succes
{ "success": true,  "message": "…", "data": { } }

// echec
{ "success": false, "message": "…", "errors": { "email": "…" } }
```

`errors` associe un nom de champ a un message : `public/js/app.js` l'affiche
directement sous le champ concerne.

---

## Liaison du front

`public/js/app.js` intercepte tout formulaire portant `data-endpoint` :

```html
<form id="login-form" action="/api/auth/login" method="post"
      data-endpoint="/api/auth/login" data-method="POST" data-redirect="/profil.html">
```

| Formulaire | Page | Endpoint |
| --- | --- | --- |
| `#register-form` | inscription.html | `POST /api/auth/register` |
| `#login-form` | login.html | `POST /api/auth/login` |
| `#contact-form` | contact.html | `POST /api/contact` |
| `#profile-form` | profil.html | `PUT /api/auth/profile` |
| `#password-form` | profil.html | `PUT /api/auth/password` |
| `[data-logout]` | en-tete + profil | `POST /api/auth/logout` |

### ⚠️ Les pages HTML sont generees

Ne modifiez **jamais** `login.html`, `inscription.html`, `contact.html`… a la
main : ils sont produits par `build/build.ps1`. Editez `build/main-<page>.html`
(ou `build/_header.html` / `build/_head.html` pour les parties communes) puis :

```powershell
.\build\build.ps1
```

Details et pieges : [`build/README.md`](build/README.md).

---

## Securite

| Point | Mise en oeuvre |
| --- | --- |
| Mots de passe | bcrypt, cout 12 — jamais de stockage en clair |
| Injection SQL | requetes parametrees `?` exclusivement (regle C12) |
| Enumeration de comptes | message identique si l'e-mail est inconnu ou le mot de passe faux |
| Fixation de session | `req.session.regenerate()` a chaque connexion |
| Cookies | `httpOnly`, `sameSite=lax`, `secure` en production |
| En-tetes | `helmet` avec CSP autorisant le CDN Tailwind et Google Fonts |
| Exposition de fichiers | liste blanche : seuls `/assets`, `/public`, `/script.js` et les pages HTML sont servis — `server.js`, `config/`, `models/`, `.env` ne le sont pas |
| Abus du formulaire | 5 messages maximum par IP toutes les 10 minutes |
| Fuite d'erreurs | la trace technique est journalisee, jamais renvoyee au client |

**Limite connue** : il n'y a pas de jeton CSRF. Le cookie `sameSite=lax` combine
au `Content-Type: application/json` exige par l'API couvre les cas courants,
mais un jeton (`csurf` ou double-submit) reste souhaitable si le site accueille
un jour des donnees sensibles.

---

## Deploiement sur GoDaddy Node.js Hosting

Le projet respecte le contrat de la plateforme (`contractVersion 3`).

```bash
npm run deploy:package     # produit deploy/ sans node_modules ni .env
```

Puis publiez le contenu de `deploy/` via **Git sync ou televersement d'un zip**
dans l'interface Node.js Hosting.

### Variables a definir dans l'interface d'hebergement

| Variable | Valeur |
| --- | --- |
| `SESSION_SECRET` | chaine aleatoire longue — **obligatoire**, le serveur refuse de demarrer sans elle en production |
| `NODE_ENV` | `production` |
| `CONTACT_FORM_RECIPIENT_EMAIL` | adresse qui recoit les messages de contact |

`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` et `DB_PASSWORD` sont injectees
automatiquement par la base manageee : **ne les definissez pas a la main.**

### Base de donnees en production

`database/schema.sql` contient un `CREATE DATABASE` utile en local seulement.
Sur la plateforme, la base existe deja : n'executez que la partie **TABLES** via
le client MySQL de l'hebergement.

### E-mail

Conformement a la regle **C13**, l'envoi passe par la passerelle interne
`http://127.0.0.1:2525` via `services/email.js`. **Ni `nodemailer`, ni SMTP
externe** : le SMTP sortant n'est pas routable depuis le conteneur.

En local cette passerelle n'existe pas : l'envoi echoue silencieusement, ce qui
est sans consequence — le message est enregistre en base, qui fait foi. Les
messages restent consultables :

```sql
SELECT * FROM contacts ORDER BY created_at DESC;
```

### Validation

```bash
node <skill>/skills/godaddy-nodejs-hosting/scripts/validate-paas.mjs deploy
```

Doit sortir en code **0**. Validez `deploy/`, pas la racine du projet : celle-ci
contient `.env` et `node_modules`, qui declenchent a juste titre les
avertissements W001 et W004.

---

## Donnees de test

Deux comptes de demonstration ont ete crees pendant la mise au point :

| E-mail | Mot de passe |
| --- | --- |
| `claire.durand@example.com` | `MotDePasse123` |
| `test.etudiant@example.com` | `MotDePasse123` |

Purge avant toute mise en ligne :

```sql
DELETE FROM users WHERE email LIKE '%@example.com';
DELETE FROM contacts WHERE email LIKE '%@example.com';
```
