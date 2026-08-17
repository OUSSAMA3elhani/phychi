/**
 * Agregateur de routes principal.
 */
const express = require('express');

const authRoutes = require('./authRoutes');
const contactRoutes = require('./contactRoutes');
const favoriteRoutes = require('./favoriteRoutes');
const downloadRoutes = require('./downloadRoutes');
const adminRoutes = require('./adminRoutes');
const pageRoutes = require('./pageRoutes');

const router = express.Router();

// --- API -------------------------------------------------------------------
router.use('/api/auth', authRoutes);
router.use('/api/contact', contactRoutes);
router.use('/api/favorites', favoriteRoutes);
router.use('/api/downloads', downloadRoutes);

/** Sonde de sante - utile apres un deploiement. */
router.get('/api/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'ok',
            uptime: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
        },
    });
});

/** Proxy de streaming PDF Google Drive (Evite les blocages d'iframe & CORS) */
router.get('/api/pdf-proxy', (req, res) => {
    const https = require('https');
    const { parseDriveId } = require('../services/googleDriveService');
    const rawId = req.query.id || req.query.url;
    const fileId = parseDriveId(rawId);

    if (!fileId) {
        return res.status(400).send('File ID required');
    }

    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    const driveStreamUrl = apiKey 
        ? `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`
        : `https://docs.google.com/uc?export=download&id=${fileId}`;

    function fetchStream(url) {
        https.get(url, (driveRes) => {
            if (driveRes.statusCode >= 300 && driveRes.statusCode < 400 && driveRes.headers.location) {
                return fetchStream(driveRes.headers.location);
            }
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            driveRes.pipe(res);
        }).on('error', (err) => {
            res.status(500).send('Error streaming PDF: ' + err.message);
        });
    }

    fetchStream(driveStreamUrl);
});

// --- Administration --------------------------------------------------------
router.use(['/admin', '/Admin'], adminRoutes);

// --- Pages SSR EJS ---------------------------------------------------------
router.use('/', pageRoutes);

module.exports = router;
