/**
 * Routes d'authentification - montees sous /api/auth.
 */
const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// Publiques
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.me);

// Protegees
router.put('/profile', requireAuth, authController.updateProfile);
router.put('/password', requireAuth, authController.changePassword);

module.exports = router;
