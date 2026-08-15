/**
 * Modèle Chapter - accès à la table `chapters`.
 */
const { pool } = require('../../config/db');

/** Niveaux acceptés : évite d'injecter une valeur arbitraire dans le filtre. */
const NIVEAUX = ['l1', 'l2', 'l3', 'master', 'autre'];

let tomeColChecked = false;
async function ensureTomeColumn() {
    if (tomeColChecked) return;
    try {
        const [cols] = await pool.query('SHOW COLUMNS FROM chapters LIKE "tome"');
        if (cols.length === 0) {
            await pool.query('ALTER TABLE chapters ADD COLUMN tome VARCHAR(255) DEFAULT NULL, ADD COLUMN order_num INT DEFAULT 0');
        }
        tomeColChecked = true;
    } catch (err) {
        console.warn('Vérification colonnes chapters:', err.message);
    }
}

const Chapter = {
    async countAll() {
        const [rows] = await pool.query('SELECT COUNT(*) AS count FROM chapters');
        return rows[0].count;
    },

    async findAll() {
        await ensureTomeColumn();
        const [rows] = await pool.query(
            `SELECT c.*, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM chapters c
             JOIN disciplines d ON c.discipline_id = d.id
             ORDER BY d.id ASC, c.order_num ASC, c.ordre ASC`
        );
        return rows;
    },

    async findPage({ discipline = null, niveau = null, page = 1, perPage = 6 } = {}) {
        await ensureTomeColumn();
        const where = [];
        const params = [];

        if (discipline && discipline !== 'toutes') {
            where.push('d.slug = ?');
            params.push(discipline);
        }
        if (niveau && niveau !== 'tous' && NIVEAUX.indexOf(niveau) !== -1) {
            where.push('c.niveau = ?');
            params.push(niveau);
        }
        const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';

        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total
             FROM chapters c
             JOIN disciplines d ON c.discipline_id = d.id
             ${clause}`,
            params
        );
        const total = countRows[0].total;

        const size = Math.max(1, Number.parseInt(perPage, 10) || 6);
        const pages = Math.max(1, Math.ceil(total / size));
        const current = Math.min(Math.max(1, Number.parseInt(page, 10) || 1), pages);
        const offset = (current - 1) * size;

        const [rows] = await pool.query(
            `SELECT c.*,
                    d.nom AS discipline_nom, d.slug AS discipline_slug,
                    (SELECT COUNT(*) FROM courses co WHERE co.chapter_id = c.id) AS courses_count,
                    (SELECT COUNT(*) FROM exercises ex WHERE ex.chapter_id = c.id) AS exercises_count
             FROM chapters c
             JOIN disciplines d ON c.discipline_id = d.id
             ${clause}
             ORDER BY c.order_num ASC, c.ordre ASC
             LIMIT ? OFFSET ?`,
            [...params, size, offset]
        );

        return { rows, total };
    },

    async findByDisciplineSlug(disciplineSlug) {
        await ensureTomeColumn();
        const [rows] = await pool.query(
            `SELECT c.*, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM chapters c
             JOIN disciplines d ON c.discipline_id = d.id
             WHERE d.slug = ?
             ORDER BY c.order_num ASC, c.ordre ASC`,
            [disciplineSlug]
        );
        return rows;
    },

    async findTomesByDiscipline(disciplineSlug) {
        await ensureTomeColumn();
        try {
            const [rows] = await pool.query(
                `SELECT c.tome
                 FROM chapters c
                 JOIN disciplines d ON c.discipline_id = d.id
                 WHERE d.slug = ? AND c.tome IS NOT NULL AND c.tome != ''
                 GROUP BY c.tome
                 ORDER BY MIN(c.order_num) ASC`,
                [disciplineSlug]
            );
            return rows.map(r => r.tome);
        } catch (err) {
            return [];
        }
    },

    async findBySlug(slug) {
        await ensureTomeColumn();
        const [rows] = await pool.query(
            `SELECT c.*, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM chapters c
             JOIN disciplines d ON c.discipline_id = d.id
             WHERE c.slug = ? LIMIT 1`,
            [slug]
        );
        return rows[0] || null;
    },

    async findByIdDetailed(id) {
        await ensureTomeColumn();
        const [rows] = await pool.query(
            `SELECT c.*, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM chapters c
             JOIN disciplines d ON c.discipline_id = d.id
             WHERE c.id = ? LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    },

    async findSiblings(chapter, limit = 6) {
        await ensureTomeColumn();
        const size = Number.parseInt(limit, 10) || 6;
        const [rows] = await pool.query(
            `SELECT c.*, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM chapters c
             JOIN disciplines d ON c.discipline_id = d.id
             WHERE c.discipline_id = ? AND c.id != ?
             ORDER BY c.order_num ASC, c.ordre ASC
             LIMIT ?`,
            [chapter.discipline_id, chapter.id, size]
        );
        return rows;
    },

    async findPrevAndNext(chapter) {
        await ensureTomeColumn();
        const [prevRows] = await pool.query(
            `SELECT c.id, c.titre, c.slug
             FROM chapters c
             WHERE c.discipline_id = ? AND (c.order_num < ? OR (c.order_num = ? AND c.id < ?))
             ORDER BY c.order_num DESC, c.id DESC LIMIT 1`,
            [chapter.discipline_id, chapter.order_num || 0, chapter.order_num || 0, chapter.id]
        );
        const [nextRows] = await pool.query(
            `SELECT c.id, c.titre, c.slug
             FROM chapters c
             WHERE c.discipline_id = ? AND (c.order_num > ? OR (c.order_num = ? AND c.id > ?))
             ORDER BY c.order_num ASC, c.id ASC LIMIT 1`,
            [chapter.discipline_id, chapter.order_num || 0, chapter.order_num || 0, chapter.id]
        );
        return {
            prev: prevRows[0] || null,
            next: nextRows[0] || null
        };
    }
};

module.exports = Chapter;
