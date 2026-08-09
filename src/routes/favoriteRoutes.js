/**
 * Routes pour la gestion des favoris.
 */
const express = require('express');
const favoriteController = require('../controllers/favoriteController');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', favoriteController.list);
router.post('/toggle', favoriteController.toggle);
router.delete('/', favoriteController.remove);

module.exports = router;
