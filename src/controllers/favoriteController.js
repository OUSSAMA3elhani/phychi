/**
 * Controleur des favoris (API JSON).
 *
 * Les favoris sont polymorphes : ils designent un cours ou un exercice via
 * le couple { item_type, item_id }. Voir src/models/Favorite.js.
 */
const Favorite = require('../models/Favorite');

/** Lit et valide le couple { item_type, item_id } du corps de requete. */
function readTarget(body) {
    const itemType = String(body.item_type || '').trim();
    const itemId = Number.parseInt(body.item_id, 10);

    if (!Favorite.resolveType(itemType)) {
        return { error: "Type de ressource invalide : attendu 'course' ou 'exercise'." };
    }
    if (!Number.isInteger(itemId) || itemId <= 0) {
        return { error: 'Identifiant de ressource invalide.' };
    }
    return { itemType, itemId };
}

const favoriteController = {
    /** GET /api/favorites - cours et exercices favoris de l'utilisateur. */
    async list(req, res, next) {
        try {
            const [courses, exercises] = await Promise.all([
                Favorite.listCourses(req.session.userId),
                Favorite.listExercises(req.session.userId),
            ]);
            return res.json({
                success: true,
                data: { courses, exercises, total: courses.length + exercises.length },
            });
        } catch (err) {
            return next(err);
        }
    },

    /**
     * POST /api/favorites/toggle - ajoute le favori s'il est absent, le retire
     * sinon. Idempotent cote client : un double clic revient a l'etat initial.
     */
    async toggle(req, res, next) {
        try {
            const target = readTarget(req.body);
            if (target.error) {
                return res.status(400).json({ success: false, message: target.error });
            }

            const result = await Favorite.toggle(req.session.userId, target.itemType, target.itemId);
            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Cette ressource n existe plus.',
                });
            }

            return res.json({
                success: true,
                message: result.favorited ? 'Ajoute a vos favoris.' : 'Retire de vos favoris.',
                data: { favorited: result.favorited, item_type: target.itemType, item_id: target.itemId },
            });
        } catch (err) {
            return next(err);
        }
    },

    /**
     * DELETE /api/favorites - retire un favori, par identifiant de ligne
     * (`id`) ou par la ressource designee ({ item_type, item_id }).
     */
    async remove(req, res, next) {
        try {
            const rowId = Number.parseInt(req.body.id, 10);
            let removed;

            if (Number.isInteger(rowId) && rowId > 0) {
                removed = await Favorite.removeById(req.session.userId, rowId);
            } else {
                const target = readTarget(req.body);
                if (target.error) {
                    return res.status(400).json({
                        success: false,
                        message: 'Fournissez soit `id`, soit le couple `item_type` + `item_id`.',
                    });
                }
                removed = await Favorite.removeByItem(req.session.userId, target.itemType, target.itemId);
            }

            return res.json({
                success: removed,
                message: removed ? 'Favori retire.' : 'Favori introuvable.',
            });
        } catch (err) {
            return next(err);
        }
    },
};

module.exports = favoriteController;
