/**
 * Modèle Concours - accès sécurisé et tolérant aux pannes à la table `concours`.
 */
const { pool } = require('../../config/db');

let tableChecked = false;

async function ensureTableExists() {
    if (tableChecked) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`concours\` (
              \`id\`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
              \`ecole\`           VARCHAR(255) NOT NULL,
              \`annee\`           INT UNSIGNED NOT NULL,
              \`filiere\`         VARCHAR(100) NOT NULL DEFAULT 'Toutes',
              \`matiere\`         VARCHAR(100) NOT NULL DEFAULT 'Physique',
              \`epreuve\`         VARCHAR(255) NOT NULL,
              \`titre\`           VARCHAR(255) NOT NULL,
              \`slug\`            VARCHAR(255) NOT NULL,
              \`enonce_file\`     VARCHAR(500) NULL,
              \`correction_file\` VARCHAR(500) NULL,
              \`created_at\`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (\`id\`),
              UNIQUE KEY \`uq_concours_slug\` (\`slug\`),
              KEY \`idx_concours_ecole_annee\` (\`ecole\`, \`annee\`),
              KEY \`idx_concours_filiere\` (\`filiere\`),
              KEY \`idx_concours_matiere\` (\`matiere\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        tableChecked = true;
    } catch (err) {
        console.warn('Création auto de la table concours ignorée ou échouée:', err.message);
    }
}

const Concours = {
    async countAll() {
        await ensureTableExists();
        try {
            const [rows] = await pool.query('SELECT COUNT(*) AS total FROM concours');
            return rows[0].total;
        } catch (err) {
            return 0;
        }
    },

    async findFilters() {
        await ensureTableExists();
        try {
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
        } catch (err) {
            return { ecoles: [], annees: [], filieres: [], matieres: [] };
        }
    },

    async findPage({ ecole = null, annee = null, filiere = null, matiere = null, search = null, page = 1, perPage = 12 } = {}) {
        await ensureTableExists();
        try {
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
                 ORDER BY CASE WHEN correction_file IS NOT NULL AND correction_file != '' THEN 0 ELSE 1 END ASC, annee DESC, ecole ASC, filiere ASC
                 LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );

            return { rows, total };
        } catch (err) {
            console.error('Erreur Concours.findPage:', err.message);
            return { rows: [], total: 0 };
        }
    },

    async findById(id) {
        await ensureTableExists();
        try {
            const [rows] = await pool.query('SELECT * FROM concours WHERE id = ? LIMIT 1', [id]);
            return rows[0] || null;
        } catch (err) {
            return null;
        }
    },

    async findBySlug(slug) {
        await ensureTableExists();
        try {
            const [rows] = await pool.query('SELECT * FROM concours WHERE slug = ? LIMIT 1', [slug]);
            return rows[0] || null;
        } catch (err) {
            return null;
        }
    },

    async findRelated(concours, limit = 4) {
        await ensureTableExists();
        try {
            const max = Number.parseInt(limit, 10) || 4;
            const [rows] = await pool.query(
                `SELECT * FROM concours
                 WHERE (ecole = ? OR filiere = ?) AND id != ?
                 ORDER BY annee DESC LIMIT ?`,
                [concours.ecole, concours.filiere, concours.id, max]
            );
            return rows;
        } catch (err) {
            return [];
        }
    },

    async create(data) {
        await ensureTableExists();
        const [result] = await pool.query(
            `INSERT INTO concours (titre, ecole, annee, filiere, epreuve, matiere, enonce_file, correction_file, slug)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.titre, data.ecole, data.annee, data.filiere, data.epreuve, data.matiere, data.enonce_file || null, data.correction_file || null, data.slug]
        );
        return result.insertId;
    },

    async update(id, data) {
        await ensureTableExists();
        await pool.query(
            `UPDATE concours
             SET titre = ?, ecole = ?, annee = ?, filiere = ?, epreuve = ?, matiere = ?, enonce_file = ?, correction_file = ?, slug = ?
             WHERE id = ?`,
            [data.titre, data.ecole, data.annee, data.filiere, data.epreuve, data.matiere, data.enonce_file || null, data.correction_file || null, data.slug, id]
        );
    },

    async delete(id) {
        await ensureTableExists();
        await pool.query('DELETE FROM concours WHERE id = ?', [id]);
    }
};

module.exports = Concours;
