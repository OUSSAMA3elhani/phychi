/**
 * Controleur d'authentification : inscription, connexion, deconnexion,
 * profil et changement de mot de passe.
 *
 * Convention de reponse (identique pour toute l'API) :
 *   succes : { success: true,  message, data? }
 *   echec  : { success: false, message, errors? }
 * `errors` associe un nom de champ a un message, pour un affichage cote client
 * directement sous le champ fautif.
 */
const User = require('../models/User');
const {
    validateRegistration,
    validateLogin,
    validateProfileUpdate,
    validatePasswordChange,
} = require('../middlewares/validators');

/** Regenere la session pour eviter la fixation de session a la connexion. */
function establishSession(req, user) {
    return new Promise((resolve, reject) => {
        req.session.regenerate((err) => {
            if (err) return reject(err);
            req.session.userId = user.id;
            req.session.email = user.email;
            req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
        });
    });
}

const authController = {
    /** POST /api/auth/register */
    async register(req, res, next) {
        try {
            const { valid, errors, data } = validateRegistration(req.body);
            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Veuillez corriger les champs indiques.',
                    errors,
                });
            }

            if (await User.emailExists(data.email)) {
                return res.status(409).json({
                    success: false,
                    message: 'Un compte existe deja avec cette adresse e-mail.',
                    errors: { email: 'Cette adresse e-mail est deja utilisee.' },
                });
            }

            const user = await User.create(data);
            await establishSession(req, user);

            return res.status(201).json({
                success: true,
                message: 'Votre compte a bien ete cree.',
                data: { user, redirect: '/profil.html' },
            });
        } catch (err) {
            // Course entre le controle d'unicite et l'INSERT : l'index unique
            // de la table tranche. On renvoie le meme message que ci-dessus.
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Un compte existe deja avec cette adresse e-mail.',
                    errors: { email: 'Cette adresse e-mail est deja utilisee.' },
                });
            }
            return next(err);
        }
    },

    /** POST /api/auth/login */
    async login(req, res, next) {
        try {
            const { valid, errors, data } = validateLogin(req.body);
            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Veuillez renseigner votre e-mail et votre mot de passe.',
                    errors,
                });
            }

            const user = await User.findByEmailWithHash(data.email);

            // Message identique que l'e-mail soit inconnu ou le mot de passe
            // faux : ne pas reveler quels comptes existent.
            const invalid = {
                success: false,
                message: 'Adresse e-mail ou mot de passe incorrect.',
            };

            if (!user) return res.status(401).json(invalid);

            const ok = await User.verifyPassword(data.password, user.password_hash);
            if (!ok) return res.status(401).json(invalid);

            delete user.password_hash;
            await establishSession(req, user);

            return res.json({
                success: true,
                message: 'Connexion reussie.',
                data: { user, redirect: '/profil.html' },
            });
        } catch (err) {
            return next(err);
        }
    },

    /** POST /api/auth/logout */
    logout(req, res, next) {
        if (!req.session) {
            return res.json({ success: true, message: 'Vous etes deconnecte.' });
        }
        req.session.destroy((err) => {
            if (err) return next(err);
            res.clearCookie('phychi.sid');
            return res.json({
                success: true,
                message: 'Vous etes deconnecte.',
                data: { redirect: '/login.html' },
            });
        });
    },

    /** GET /api/auth/me - utilise par le front pour adapter l'en-tete. */
    async me(req, res, next) {
        try {
            if (!req.session || !req.session.userId) {
                return res.json({ success: true, data: { authenticated: false, user: null } });
            }
            const user = await User.findById(req.session.userId);
            if (!user) {
                // Compte supprime alors que la session vivait encore.
                return req.session.destroy(() =>
                    res.json({ success: true, data: { authenticated: false, user: null } })
                );
            }
            return res.json({ success: true, data: { authenticated: true, user } });
        } catch (err) {
            return next(err);
        }
    },

    /** PUT /api/auth/profile */
    async updateProfile(req, res, next) {
        try {
            const { valid, errors, data } = validateProfileUpdate(req.body);
            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Veuillez corriger les champs indiques.',
                    errors,
                });
            }

            const existing = await User.findByEmail(data.email);
            if (existing && existing.id !== req.session.userId) {
                return res.status(409).json({
                    success: false,
                    message: 'Cette adresse e-mail est deja utilisee par un autre compte.',
                    errors: { email: 'Cette adresse e-mail est deja utilisee.' },
                });
            }

            const user = await User.updateProfile(req.session.userId, data);
            req.session.email = user.email;

            return res.json({
                success: true,
                message: 'Vos informations ont bien ete mises a jour.',
                data: { user },
            });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Cette adresse e-mail est deja utilisee par un autre compte.',
                    errors: { email: 'Cette adresse e-mail est deja utilisee.' },
                });
            }
            return next(err);
        }
    },

    /** PUT /api/auth/password */
    async changePassword(req, res, next) {
        try {
            const { valid, errors, data } = validatePasswordChange(req.body);
            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Veuillez corriger les champs indiques.',
                    errors,
                });
            }

            const user = await User.findByEmailWithHash(req.session.email);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Session invalide.' });
            }

            const ok = await User.verifyPassword(data.currentPassword, user.password_hash);
            if (!ok) {
                return res.status(401).json({
                    success: false,
                    message: 'Le mot de passe actuel est incorrect.',
                    errors: { current_password: 'Mot de passe actuel incorrect.' },
                });
            }

            await User.updatePassword(user.id, data.newPassword);

            return res.json({
                success: true,
                message: 'Votre mot de passe a bien ete modifie.',
            });
        } catch (err) {
            return next(err);
        }
    },
};

module.exports = authController;
