/**
 * PhyChi - Serveur Backend Principal (Node.js / Express)
 * Application : Plateforme de Physique & Chimie pour l'Enseignement Supérieur
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// Initialisation de l'application Express
const app = express();
const PORT = process.env.PORT || 5000;

/* ==========================================================================
   1. MIDDLEWARES GLOBAUX
   ========================================================================== */

// Configurer CORS pour autoriser la communication avec le Frontend
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parsing des données JSON et URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Service des fichiers statiques du Frontend (HTML, CSS, JS, Images)
app.use(express.static(path.join(__dirname, '../')));

/* ==========================================================================
   2. BASE DE DONNÉES SIMULÉE / EN MÉMOIRE
   ========================================================================== */

const users = [];
const favorisStorage = {};
const messagesContact = [];

/* ==========================================================================
   3. ROUTES API REST
   ========================================================================== */

// --- Route Santé API ---
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'API PhyChi opérationnelle.' });
});

// --- Auth Routes ---
app.post('/api/auth/register', (req, res) => {
    const { nom, prenom, email, niveau, password } = req.body;

    if (!email || !password || !nom || !prenom) {
        return res.status(400).json({ error: 'Veuillez remplir tous les champs obligatoires.' });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ error: 'Un compte existe déjà avec cet email.' });
    }

    const newUser = { id: users.length + 1, nom, prenom, email, niveau, password };
    users.push(newUser);

    res.status(201).json({
        message: 'Inscription réussie !',
        user: { id: newUser.id, nom, prenom, email, niveau }
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    res.status(200).json({
        message: 'Connexion réussie !',
        token: `mock-jwt-token-user-${user.id}`,
        user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, niveau: user.niveau }
    });
});

// --- Favoris Routes ---
app.get('/api/favoris/:userId', (req, res) => {
    const { userId } = req.params;
    const userFavs = favorisStorage[userId] || [];
    res.status(200).json(userFavs);
});

app.post('/api/favoris/:userId', (req, res) => {
    const { userId } = req.params;
    const { title, url } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Titre de la ressource requis.' });
    }

    if (!favorisStorage[userId]) {
        favorisStorage[userId] = [];
    }

    const exists = favorisStorage[userId].some(f => f.title === title);
    if (exists) {
        favorisStorage[userId] = favorisStorage[userId].filter(f => f.title !== title);
        return res.status(200).json({ message: 'Retiré des favoris', favoris: favorisStorage[userId] });
    }

    const newFav = { id: Date.now(), title, url, date: new Date().toLocaleDateString('fr-FR') };
    favorisStorage[userId].push(newFav);

    res.status(201).json({ message: 'Ajouté aux favoris', favoris: favorisStorage[userId] });
});

// --- Formulaire de Contact Route ---
app.post('/api/contact', (req, res) => {
    const { nom, email, sujet, message } = req.body;

    if (!nom || !email || !message) {
        return res.status(400).json({ error: 'Champs nom, email et message requis.' });
    }

    const newMessage = { id: messagesContact.length + 1, nom, email, sujet, message, date: new Date() };
    messagesContact.push(newMessage);

    res.status(200).json({ message: 'Votre message a bien été transmis au support.' });
});

/* ==========================================================================
   4. ROUTAGE DU FRONTEND (SPA / PAGE DÉFAUT)
   ========================================================================== */

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

/* ==========================================================================
   5. GESTION CENTRALISÉE DES ERREURS
   ========================================================================== */

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Une erreur interne est survenue sur le serveur.' });
});

/* ==========================================================================
   6. DÉMARRAGE DU SERVEUR
   ========================================================================== */

app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 Serveur PhyChi démarré sur : http://localhost:${PORT}`);
    console.log(`==================================================`);
});