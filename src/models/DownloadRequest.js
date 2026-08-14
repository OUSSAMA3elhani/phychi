/**
 * Modele DownloadRequest - acces a la table `download_requests`.
 *
 * Un utilisateur demande l'acces au fichier d'un cours ou d'un exercice ;
 * un administrateur approuve ou refuse. La cible est polymorphe, comme pour
 * les favoris : { item_type, item_id }.
 *
 * Requetes parametrees exclusivement.
 */
const { pool } = require('../../config/db');

const ITEM_TYPES = ['course', 'exercise', 'concours', 'book'];
const STATUSES = ['pending', 'approved', 'rejected'];

const DownloadRequest = {
    isValidType(itemType) {
        return ITEM_TYPES.indexOf(itemType) !== -1;
    },

    isValidStatus(status) {
        return STATUSES.indexOf(status) !== -1;
    },

    /**
     * Cree la demande si elle n'existe pas encore.
     *
     * Une demande deja refusee redevient `pending` : l'utilisateur doit pouvoir
     * redemander apres un refus. Une demande deja approuvee n'est jamais
     * retrogradee, sans quoi un simple clic revoquerait un acces accorde.
     *
     * @returns {Promise<{status: string, created: boolean}>}
     */
    async request(userId, itemType, itemId) {
        const existing = await this.findOne(userId, itemType, itemId);

        if (existing) {
            if (existing.status === 'rejected') {
                await pool.query(
                    "UPDATE download_requests SET status = 'pending' WHERE id = ?",
                    [existing.id]
                );
                return { status: 'pending', created: false };
            }
            return { status: existing.status, created: false };
        }

        await pool.query(
            `INSERT INTO download_requests (user_id, item_type, item_id, status)
             VALUES (?, ?, ?, 'pending')
             ON DUPLICATE KEY UPDATE status = status`,
            [userId, itemType, itemId]
        );
        return { status: 'pending', created: true };
    },

    async findOne(userId, itemType, itemId) {
        const [rows] = await pool.query(
            'SELECT * FROM download_requests WHERE user_id = ? AND item_type = ? AND item_id = ? LIMIT 1',
            [userId, itemType, itemId]
        );
        return rows[0] || null;
    },

    /**
     * Statut des demandes d'un utilisateur pour un type donne.
     * @returns {Promise<Map<number, string>>} item_id -> statut
     */
    async statusMap(userId, itemType) {
        if (!userId) return new Map();
        const [rows] = await pool.query(
            'SELECT item_id, status FROM download_requests WHERE user_id = ? AND item_type = ?',
            [userId, itemType]
        );
        return new Map(rows.map((r) => [r.item_id, r.status]));
    },

    /** Liste des demandes, enrichie du demandeur et du titre de la ressource. */
    async findAll({ status = null, limit = 200 } = {}) {
        const params = [];
        let where = '';
        if (status) {
            where = 'WHERE dr.status = ?';
            params.push(status);
        }
        params.push(Number.parseInt(limit, 10) || 200);

        const [rows] = await pool.query(
            `SELECT dr.*,
                    u.nom AS user_nom, u.prenom AS user_prenom, u.email AS user_email,
                    COALESCE(cc.titre, b.titre, c.titre, e.titre) AS item_titre,
                    COALESCE(cc.enonce_file, b.pdf_file, c.course_file, e.enonce_file) AS item_file
             FROM download_requests dr
             JOIN users u ON u.id = dr.user_id
             LEFT JOIN concours cc ON dr.item_type = 'concours' AND cc.id = dr.item_id
             LEFT JOIN books b     ON dr.item_type = 'book'     AND b.id = dr.item_id
             LEFT JOIN courses c   ON dr.item_type = 'course'   AND c.id = dr.item_id
             LEFT JOIN exercises e ON dr.item_type = 'exercise' AND e.id = dr.item_id
             ${where}
             ORDER BY FIELD(dr.status, 'pending', 'approved', 'rejected'), dr.created_at DESC
             LIMIT ?`,
            params
        );
        return rows;
    },

    /** Compte par statut : { pending: n, approved: n, rejected: n }. */
    async countByStatus() {
        const [rows] = await pool.query(
            'SELECT status, COUNT(*) AS total FROM download_requests GROUP BY status'
        );
        const counts = { pending: 0, approved: 0, rejected: 0 };
        rows.forEach((r) => { counts[r.status] = r.total; });
        return counts;
    },

    async updateStatus(id, status) {
        if (!this.isValidStatus(status)) return false;
        const [result] = await pool.query(
            'UPDATE download_requests SET status = ? WHERE id = ?',
            [status, id]
        );
        return result.affectedRows > 0;
    },

    async delete(id) {
        const [result] = await pool.query('DELETE FROM download_requests WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },
};

module.exports = DownloadRequest;
