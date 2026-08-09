/**
 * Middlewares d'authentification et de controle d'acces pour l'administration.
 */
const User = require('../models/User');

/**
 * Exige une session authentifiee.
 */
async function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({
            success: false,
            message: 'Connexion requise.',
        });
    }
    const target = encodeURIComponent(req.originalUrl);
    return res.redirect(`/login?next=${target}`);
}

/**
 * Exige le role Administrateur (`role === 'admin'`).
 */
async function isAdmin(req, res, next) {
    try {
        if (!req.session || !req.session.userId) {
            if (req.originalUrl.startsWith('/api/')) {
                return res.status(401).json({ success: false, message: 'Connexion requise.' });
            }
            return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
        }

        const user = res.locals.user || await User.findById(req.session.userId);
        if (!user || user.role !== 'admin') {
            if (req.originalUrl.startsWith('/api/')) {
                return res.status(403).json({
                    success: false,
                    message: 'Acces refuse. Privilege Administrateur requis.',
                });
            }
            return res.status(403).render('404', {
                title: 'Acces Interdit - 403',
                message: 'Vous devez posseder un compte administrateur pour acceder a cet espace.',
            });
        }

        res.locals.user = user;
        next();
    } catch (err) {
        next(err);
    }
}

module.exports = {
    requireAuth,
    isAdmin,
};
