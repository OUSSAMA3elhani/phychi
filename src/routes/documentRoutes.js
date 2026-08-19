/**
 * Routes pour le streaming de documents PDF via Google Drive & Local.
 */
const express = require('express');
const documentController = require('../controllers/documentController');

const router = express.Router();

// 1. GET /api/documents/stream/:fileKey
router.get('/stream/:fileKey(*)', documentController.streamDocument);

// 2. GET /api/documents/stream (query parameters ?path=... ou ?fileId=...)
router.get('/stream', documentController.streamDocument);

module.exports = router;
