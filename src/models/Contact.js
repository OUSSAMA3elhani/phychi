/**
 * Modele Contact - acces a la table `contacts`.
 */
const { pool } = require('../../config/db');

const Contact = {
    /** Enregistre un message. */
    async create({ nom, email, sujet, message, ip }) {
        const [result] = await pool.query(
            `INSERT INTO contacts (nom, email, sujet, message, ip)
             VALUES (?, ?, ?, ?, ?)`,
            [nom, email, sujet, message, ip || null]
        );
        return this.findById(result.insertId);
    },

    /** Recherche par identifiant. */
    async findById(id) {
        const [rows] = await pool.query(
            'SELECT * FROM contacts WHERE id = ? LIMIT 1',
            [id]
        );
        return rows[0] || null;
    },

    /** Liste l'ensemble des contacts (Admin). */
    async findAll({ limit = 100, offset = 0 } = {}) {
        const [rows] = await pool.query(
            `SELECT * FROM contacts ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [Number(limit), Number(offset)]
        );
        return rows;
    },

    /** Compte le total de contacts. */
    async countAll() {
        const [rows] = await pool.query('SELECT COUNT(*) AS total FROM contacts');
        return rows[0].total;
    },

    /** Met a jour le statut d'un contact (Admin). */
    async updateStatus(id, statut) {
        await pool.query('UPDATE contacts SET statut = ? WHERE id = ?', [statut, id]);
        return this.findById(id);
    },

    /** Supprime un message de contact (Admin). */
    async delete(id) {
        const [result] = await pool.query('DELETE FROM contacts WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    /** Nombre de messages envoyes par IP depuis N minutes. */
    async countRecentByIp(ip, minutes = 10) {
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS total FROM contacts
             WHERE ip = ? AND created_at > (NOW() - INTERVAL ? MINUTE)`,
            [ip, Number(minutes)]
        );
        return rows[0].total;
    },
};

module.exports = Contact;
