/**
 * Modèle Book - accès sécurisé et tolérant aux pannes à la table `books`.
 */
const { pool } = require('../../config/db');

let tableChecked = false;

async function ensureTableExists() {
    if (tableChecked) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`books\` (
              \`id\`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
              \`titre\`       VARCHAR(255) NOT NULL,
              \`collection\`  VARCHAR(100) NOT NULL,
              \`auteur\`      VARCHAR(150) NULL,
              \`discipline\`  VARCHAR(50) NOT NULL DEFAULT 'Physique',
              \`niveau\`      VARCHAR(100) NOT NULL DEFAULT 'CPGE',
              \`pdf_file\`    VARCHAR(500) NOT NULL,
              \`slug\`        VARCHAR(255) NOT NULL,
              \`created_at\`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (\`id\`),
              UNIQUE KEY \`uq_books_slug\` (\`slug\`),
              KEY \`idx_books_discipline\` (\`discipline\`),
              KEY \`idx_books_collection\` (\`collection\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        tableChecked = true;
    } catch (err) {
        console.warn('Création auto de la table books ignorée ou échouée:', err.message);
    }
}

const Book = {
    async countAll() {
        await ensureTableExists();
        try {
            const [rows] = await pool.query('SELECT COUNT(*) AS total FROM books');
            return rows[0].total;
        } catch (err) {
            return 0;
        }
    },

    async findFilters() {
        await ensureTableExists();
        try {
            const [collections] = await pool.query('SELECT DISTINCT collection FROM books ORDER BY collection ASC');
            const [disciplines] = await pool.query('SELECT DISTINCT discipline FROM books ORDER BY discipline ASC');
            const [niveaux] = await pool.query('SELECT DISTINCT niveau FROM books ORDER BY niveau ASC');

            return {
                collections: collections.map(r => r.collection),
                disciplines: disciplines.map(r => r.discipline),
                niveaux: niveaux.map(r => r.niveau)
            };
        } catch (err) {
            return { collections: [], disciplines: [], niveaux: [] };
        }
    },

    async findPage({ discipline = null, collection = null, search = null, page = 1, perPage = 12 } = {}) {
        await ensureTableExists();
        try {
            const where = ['1=1'];
            const params = [];

            if (discipline && String(discipline).trim() !== '') {
                where.push('discipline = ?');
                params.push(String(discipline).trim());
            }

            if (collection && String(collection).trim() !== '') {
                where.push('collection = ?');
                params.push(String(collection).trim());
            }

            if (search && String(search).trim() !== '') {
                where.push('(titre LIKE ? OR collection LIKE ? OR auteur LIKE ? OR niveau LIKE ?)');
                const term = `%${String(search).trim()}%`;
                params.push(term, term, term, term);
            }

            const whereSql = where.join(' AND ');

            const [countRows] = await pool.query(
                `SELECT COUNT(*) AS total FROM books WHERE ${whereSql}`,
                params
            );
            const total = countRows[0].total;

            const p = Math.max(1, Number.parseInt(page, 10) || 1);
            const limit = Math.max(1, Math.min(100, Number.parseInt(perPage, 10) || 12));
            const offset = (p - 1) * limit;

            const [rows] = await pool.query(
                `SELECT * FROM books
                 WHERE ${whereSql}
                 ORDER BY discipline ASC, collection ASC, titre ASC
                 LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );

            return { rows, total };
        } catch (err) {
            return { rows: [], total: 0 };
        }
    },

    async findById(id) {
        await ensureTableExists();
        try {
            const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [id]);
            return rows[0] || null;
        } catch (err) {
            return null;
        }
    },

    async create(data) {
        await ensureTableExists();
        const [result] = await pool.query(
            `INSERT INTO books (titre, collection, auteur, discipline, niveau, pdf_file, slug)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [data.titre, data.collection, data.auteur || null, data.discipline, data.niveau || 'CPGE', data.pdf_file, data.slug]
        );
        return result.insertId;
    },

    async update(id, data) {
        await ensureTableExists();
        await pool.query(
            `UPDATE books
             SET titre = ?, collection = ?, auteur = ?, discipline = ?, niveau = ?, pdf_file = ?, slug = ?
             WHERE id = ?`,
            [data.titre, data.collection, data.auteur || null, data.discipline, data.niveau || 'CPGE', data.pdf_file, data.slug, id]
        );
    },

    async delete(id) {
        await ensureTableExists();
        await pool.query('DELETE FROM books WHERE id = ?', [id]);
    }
};

module.exports = Book;
