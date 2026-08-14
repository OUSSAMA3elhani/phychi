/**
 * Controleur des demandes de telechargement (API JSON, cote public).
 *
 * L'utilisateur demande l'acces a un document ; l'administration approuve ou
 * refuse depuis /admin/downloads.
 */
const DownloadRequest = require('../models/DownloadRequest');
const Course = require('../models/Course');
const Exercise = require('../models/Exercise');
const Concours = require('../models/Concours');
const Book = require('../models/Book');

/** Lit et valide le couple { item_type, item_id }. */
function readTarget(body) {
    const itemType = String(body.item_type || '').trim();
    const itemId = Number.parseInt(body.item_id, 10);

    if (!DownloadRequest.isValidType(itemType)) {
        return { error: 'Type de ressource invalide.' };
    }
    if (!Number.isInteger(itemId) || itemId <= 0) {
        return { error: 'Identifiant de ressource invalide.' };
    }
    return { itemType, itemId };
}

const downloadController = {
    /** POST /api/downloads/request */
    async request(req, res, next) {
        try {
            const target = readTarget(req.body);
            if (target.error) {
                return res.status(400).json({ success: false, message: target.error });
            }

            // La ressource doit exister : sinon on creerait une demande
            // pointant vers un contenu supprime.
            let item = null;
            if (target.itemType === 'course') item = await Course.findById(target.itemId);
            else if (target.itemType === 'exercise') item = await Exercise.findById(target.itemId);
            else if (target.itemType === 'concours') item = await Concours.findById(target.itemId);
            else if (target.itemType === 'book') item = await Book.findById(target.itemId);

            if (!item) {
                return res.status(404).json({ success: false, message: 'Cette ressource n existe plus.' });
            }

            const result = await DownloadRequest.request(req.session.userId, target.itemType, target.itemId);

            const MESSAGES = {
                pending: result.created
                    ? 'Demande envoyée. Un administrateur va l examiner.'
                    : 'Votre demande est déjà en attente d approbation.',
                approved: 'Votre accès a déjà été approuvé : le téléchargement est disponible.',
                rejected: 'Votre demande a été refusée.',
            };

            return res.json({
                success: true,
                message: MESSAGES[result.status],
                data: { status: result.status, item_type: target.itemType, item_id: target.itemId },
            });
        } catch (err) {
            return next(err);
        }
    },

    /** GET /api/downloads/status - statuts de l'utilisateur courant. */
    async status(req, res, next) {
        try {
            const [courses, exercises] = await Promise.all([
                DownloadRequest.statusMap(req.session.userId, 'course'),
                DownloadRequest.statusMap(req.session.userId, 'exercise'),
            ]);
            return res.json({
                success: true,
                data: {
                    course: Object.fromEntries(courses),
                    exercise: Object.fromEntries(exercises),
                },
            });
        } catch (err) {
            return next(err);
        }
    },
};

module.exports = downloadController;
