/**
 * Modele Discipline - acces a la table `disciplines`.
 */
const { pool } = require('../../config/db');

const Discipline = {
    async findAll() {
        const [rows] = await pool.query('SELECT * FROM disciplines ORDER BY id ASC');
        return rows;
    },

    async countAll() {
        const [rows] = await pool.query('SELECT COUNT(*) AS total FROM disciplines');
        return rows[0].total;
    },

    async findBySlug(slug) {
        const [rows] = await pool.query('SELECT * FROM disciplines WHERE slug = ? LIMIT 1', [slug]);
        return rows[0] || null;
    },

    async findById(id) {
        const [rows] = await pool.query('SELECT * FROM disciplines WHERE id = ? LIMIT 1', [id]);
        return rows[0] || null;
    },

    async create({ nom, slug, description }) {
        const safeSlug = slug || nom.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const [result] = await pool.query(
            'INSERT INTO disciplines (nom, slug, description) VALUES (?, ?, ?)',
            [nom, safeSlug, description || null]
        );
        return this.findById(result.insertId);
    },

    async update(id, { nom, slug, description }) {
        const safeSlug = slug || nom.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        await pool.query(
            'UPDATE disciplines SET nom = ?, slug = ?, description = ? WHERE id = ?',
            [nom, safeSlug, description || null, id]
        );
        return this.findById(id);
    },

    async delete(id) {
        const [result] = await pool.query('DELETE FROM disciplines WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },
};

module.exports = Discipline;
