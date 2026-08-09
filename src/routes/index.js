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

// --- Administration --------------------------------------------------------
router.use('/admin', adminRoutes);

// --- Pages SSR EJS ---------------------------------------------------------
router.use('/', pageRoutes);

module.exports = router;
