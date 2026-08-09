/**
 * Middlewares d'authentification pour PhyChi.
 *
 * `attachUser` : Charge l'utilisateur depuis MySQL et l'injecte dans res.locals.user pour EJS.
 * `requireAuth` : Bloque les requetes non authentifiees (redirection pour les pages, 401 pour l'API).
 * `requireGuest` : Redirige les utilisateurs deja connectes vers /profil.
 */
const User = require('../models/User');

async function attachUser(req, res, next) {
    // URL courante : utilisee par les vues pour construire un retour apres
    // connexion (?next=...). Definie avant tout acces a la base pour rester
    // disponible meme si le chargement de l'utilisateur echoue.
    res.locals.currentUrl = req.originalUrl;

    try {
        if (req.session && req.session.userId) {
            const user = await User.findById(req.session.userId);
            if (user) {
                res.locals.user = user;
                res.locals.userId = user.id;
            } else {
                req.session.destroy();
                res.locals.user = null;
                res.locals.userId = null;
            }
        } else {
            res.locals.user = null;
            res.locals.userId = null;
        }
    } catch (err) {
        console.error('attachUser error:', err.message);
        res.locals.user = null;
        res.locals.userId = null;
    }
    next();
}

function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({
            success: false,
            message: 'Vous devez etre connecte pour effectuer cette action.',
        });
    }
    const target = encodeURIComponent(req.originalUrl);
    return res.redirect(`/login?next=${target}`);
}

function requireGuest(req, res, next) {
    if (req.session && req.session.userId) {
        return res.redirect('/profil');
    }
    next();
}

module.exports = {
    attachUser,
    requireAuth,
    requireGuest,
};
