/**
 * PhyChi - point d'entree du serveur Express (Architecture MVC + SSR avec EJS).
 *
 * Conforme au contrat GoDaddy Node.js Hosting :
 *   C5/C6 - ecoute sur process.env.PORT (repli 3000 en local)
 *   C7    - liaison sur 0.0.0.0
 *   C8    - toute la configuration passe par process.env
 *   C12   - MySQL via mysql2, variables DB_* lues depuis l'environnement
 */
require('dotenv').config();

const path = require('node:path');

const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet = require('helmet');
const cors = require('cors');

const routes = require('./src/routes');
const pageController = require('./src/controllers/pageController');
const { attachUser } = require('./src/middlewares/auth');
const { pool, testConnection, describeConnection } = require('./config/db');

const app = express();
const ROOT = __dirname;
const isProduction = process.env.NODE_ENV === 'production';

// -----------------------------------------------------------------------------
// Configuration du moteur de rendu EJS (SSR)
// -----------------------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(ROOT, 'src', 'views'));

// -----------------------------------------------------------------------------
// Confiance au proxy
// -----------------------------------------------------------------------------
if (isProduction) app.set('trust proxy', 1);

// -----------------------------------------------------------------------------
// Securite
// -----------------------------------------------------------------------------
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", 'https://cdn.tailwindcss.com', "'unsafe-inline'", "'unsafe-eval'"],
                styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
                fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
                imgSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"],
                objectSrc: ["'self'"],
                frameSrc: ["'self'"],
                frameAncestors: ["'self'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
            },
        },
        crossOriginEmbedderPolicy: false,
    })
);

// -----------------------------------------------------------------------------
// CORS
// -----------------------------------------------------------------------------
const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

if (corsOrigins.length > 0) {
    app.use(cors({ origin: corsOrigins, credentials: true }));
    console.log('CORS actif pour :', corsOrigins.join(', '));
}

// -----------------------------------------------------------------------------
// Analyse du corps des requetes
// -----------------------------------------------------------------------------
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// -----------------------------------------------------------------------------
// Sessions
// -----------------------------------------------------------------------------
const sessionSecret = process.env.SESSION_SECRET || 'phychemia_session_secret_default_key_2026';
if (!process.env.SESSION_SECRET && isProduction) {
    console.warn(
        'Avertissement : SESSION_SECRET n\'est pas defini. ' +
        'Une cle par defaut est utilisee pour eviter tout arret du serveur.'
    );
}

const sessionStore = new MySQLStore({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'phychi',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    createDatabaseTable: true,
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000, // 15 min
    expiration: 7 * 24 * 60 * 60 * 1000, // 7 jours
    schema: {
        tableName: 'sessions',
        columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' },
    },
});

sessionStore.on('error', (error) => {
    console.warn('MySQL Session Store connection event:', error.message);
});

app.use(
    session({
        name: 'phychi.sid',
        secret: sessionSecret || 'dev-secret-non-securise-a-remplacer',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        },
    })
);

// Injecte l'utilisateur courant (res.locals.user) pour les vues EJS
app.use(attachUser);

// -----------------------------------------------------------------------------
// Fichiers statiques
// -----------------------------------------------------------------------------
const STATIC_OPTIONS = {
    dotfiles: 'deny',
    maxAge: isProduction ? '7d' : 0,
    etag: true,
};

app.use('/assets', express.static(path.join(ROOT, 'public', 'assets'), STATIC_OPTIONS));
app.use('/uploads', express.static(path.join(ROOT, 'public', 'uploads'), STATIC_OPTIONS));
app.use(express.static(path.join(ROOT, 'public'), STATIC_OPTIONS));

// Fallback script.js legacy si demande a la racine
app.get('/script.js', (req, res) => {
    res.sendFile(path.join(ROOT, 'public', 'js', 'script.js'));
});

// -----------------------------------------------------------------------------
// Routes applicatives & EJS SSR
// -----------------------------------------------------------------------------
app.use('/', routes);

// -----------------------------------------------------------------------------
// 404 et erreurs
// -----------------------------------------------------------------------------
app.use(pageController.notFound);
app.use(pageController.serverError);

// -----------------------------------------------------------------------------
// Demarrage
// -----------------------------------------------------------------------------
const port = process.env.PORT || 3000;
const host = '0.0.0.0';

async function start() {
    const target = describeConnection();
    try {
        await testConnection();
        console.log(`Base de donnees connectee : ${target.user}@${target.host}:${target.port}/${target.database}`);
    } catch (err) {
        console.error(
            `Base de donnees injoignable (${target.host}:${target.port}/${target.database}) : ${err.message}`
        );
        if (err.code === 'ECONNREFUSED') {
            console.error('Demarrez MySQL depuis le panneau de controle XAMPP, puis lancez : npm run db:init');
        }
        console.error('Le serveur demarre quand meme : les pages restent servies, l API repondra 503.');
    }

    app.listen(port, host, () => {
        console.log(`PhyChi (MVC SSR EJS) demarre sur http://localhost:${port}`);
    });
}

start();

module.exports = app;
