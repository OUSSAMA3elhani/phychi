/**
 * Modele Concours - acces a la table `concours`.
 */
const { pool } = require('../../config/db');

const Concours = {
    async countAll() {
        const [rows] = await pool.query('SELECT COUNT(*) AS total FROM concours');
        return rows[0].total;
    },

    async findFilters() {
        const [ecoles] = await pool.query('SELECT DISTINCT ecole FROM concours ORDER BY ecole ASC');
        const [annees] = await pool.query('SELECT DISTINCT annee FROM concours ORDER BY annee DESC');
        const [filieres] = await pool.query('SELECT DISTINCT filiere FROM concours ORDER BY filiere ASC');
        const [matieres] = await pool.query('SELECT DISTINCT matiere FROM concours ORDER BY matiere ASC');

        return {
            ecoles: ecoles.map(r => r.ecole),
            annees: annees.map(r => r.annee),
            filieres: filieres.map(r => r.filiere),
            matieres: matieres.map(r => r.matiere),
        };
    },

    async findPage({ ecole = null, annee = null, filiere = null, matiere = null, search = null, page = 1, perPage = 12 } = {}) {
        const where = ['1=1'];
        const params = [];

        if (ecole && String(ecole).trim() !== '') {
            where.push('ecole = ?');
            params.push(String(ecole).trim());
        }

        if (annee && !isNaN(parseInt(annee, 10))) {
            where.push('annee = ?');
            params.push(parseInt(annee, 10));
        }

        if (filiere && String(filiere).trim() !== '') {
            where.push('filiere = ?');
            params.push(String(filiere).trim());
        }

        if (matiere && String(matiere).trim() !== '') {
            where.push('matiere = ?');
            params.push(String(matiere).trim());
        }

        if (search && String(search).trim() !== '') {
            where.push('(ecole LIKE ? OR epreuve LIKE ? OR titre LIKE ?)');
            const term = `%${String(search).trim()}%`;
            params.push(term, term, term);
        }

        const whereSql = where.join(' AND ');

        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total FROM concours WHERE ${whereSql}`,
            params
        );
        const total = countRows[0].total;

        const p = Math.max(1, Number.parseInt(page, 10) || 1);
        const limit = Math.max(1, Math.min(100, Number.parseInt(perPage, 10) || 12));
        const offset = (p - 1) * limit;

        const [rows] = await pool.query(
            `SELECT * FROM concours
             WHERE ${whereSql}
             ORDER BY annee DESC, ecole ASC, filiere ASC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return { rows, total };
    },

    async findById(id) {
        const [rows] = await pool.query('SELECT * FROM concours WHERE id = ? LIMIT 1', [id]);
        return rows[0] || null;
    },

    async findBySlug(slug) {
        const [rows] = await pool.query('SELECT * FROM concours WHERE slug = ? LIMIT 1', [slug]);
        return rows[0] || null;
    },

    async findRelated(concours, limit = 4) {
        const max = Number.parseInt(limit, 10) || 4;
        const [rows] = await pool.query(
            `SELECT * FROM concours
             WHERE (ecole = ? OR filiere = ?) AND id != ?
             ORDER BY annee DESC LIMIT ?`,
            [concours.ecole, concours.filiere, concours.id, max]
        );
        return rows;
    }
};

module.exports = Concours;
