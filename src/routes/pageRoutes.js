/**
 * Routes des pages (Server-Side Rendering EJS).
 */
const express = require('express');
const pageController = require('../controllers/pageController');
const sitemapController = require('../controllers/sitemapController');
const { requireAuth, requireGuest } = require('../middlewares/auth');

const router = express.Router();

// Sitemap.xml
router.get('/sitemap.xml', sitemapController.getSitemap);

// Accueil
router.get(['/', '/index.html', '/index'], pageController.home);

// Pages d'authentification (redirection si deja connecte)
router.get(['/login', '/login.html'], requireGuest, pageController.login);
router.get(['/inscription', '/inscription.html'], requireGuest, pageController.inscription);

// Pages protegees (requierent d'etre connecte)
router.get(['/profil', '/profil.html'], requireAuth, pageController.profil);
router.get(['/favoris', '/favoris.html'], requireAuth, pageController.favoris);

// Pages publiques de contenu
router.get(['/chapitres', '/chapitres.html'], pageController.chapitres);
// Declaree apres la liste pour qu'un segment litteral ne soit pas pris pour un :id.
router.get('/chapitres/:id', pageController.chapitreDetails);
router.get(['/cours', '/cours.html'], pageController.cours);
// Section Exercices
router.get(['/exercices', '/exercices.html'], pageController.exercicesPhysique);
router.get(['/exercices-physique', '/exercices-physique.html'], pageController.exercicesPhysique);
router.get(['/exercices-chimie', '/exercices-chimie.html'], pageController.exercicesChimie);

// Section Concours & Annales
router.get(['/concours', '/concours.html'], pageController.concours);
router.get('/concours/:id', pageController.concoursDetails);

// Section Livres & Manuels CPGE
router.get(['/livres', '/livres.html'], pageController.livres);
router.get('/livres/:id', pageController.livresDetails);

// Fiche detaillee d'un exercice. Declaree apres les listes pour qu'un segment
// litteral ne soit jamais capture comme un `:id`.
router.get('/exercices/:id', pageController.exerciceDetails);
router.get(['/contact', '/contact.html'], pageController.contact);
router.get(['/apropos', '/apropos.html'], pageController.apropos);
router.get(['/faq', '/faq.html'], pageController.faq);
router.get(['/recherche', '/recherche.html'], pageController.recherche);
router.get(['/mentions-legales', '/mentions-legales.html'], pageController.mentionsLegales);
router.get(['/politique-confidentialite', '/politique-confidentialite.html'], pageController.politiqueConfidentialite);

module.exports = router;
