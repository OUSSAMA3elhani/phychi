/**
 * Route du formulaire de contact - montee sous /api/contact.
 */
const express = require('express');
const contactController = require('../controllers/contactController');

const router = express.Router();

router.post('/', contactController.submit);

module.exports = router;
