/**
 * Routes des demandes de telechargement (cote public).
 * Une session est obligatoire : une demande est rattachee a un compte.
 */
const express = require('express');
const downloadController = require('../controllers/downloadController');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.use(requireAuth);

router.post('/request', downloadController.request);
router.get('/status', downloadController.status);

module.exports = router;
