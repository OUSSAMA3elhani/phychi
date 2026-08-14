/**
 * Modele Chapter - acces a la table `chapters`.
 */
const { pool } = require('../../config/db');

/** Niveaux acceptes : evite d'injecter une valeur arbitraire dans le filtre. */
const NIVEAUX = ['l1', 'l2', 'l3', 'master', 'autre'];

const Chapter = {
    async findAll() {
        const [rows] = await pool.query(
            `SELECT c.*, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM chapters c
             JOIN disciplines d ON c.discipline_id = d.id
             ORDER BY d.id ASC, c.order_num ASC, c.ordre ASC`
        );
        return rows;
    },

    /**
     * Page de chapitres filtres, avec le nombre de cours et d'exercices de
     * chacun. Renvoie { rows, total }.
     *
     * Les valeurs de filtre sont validees contre des listes blanches et
     * injectees uniquement via des placeholders.
     */
    async findPage({ discipline = null, niveau = null, page = 1, perPage = 6 } = {}) {
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
        const current = Math.max(1, Number.parseInt(page, 10) || 1);
        const offset = (current - 1) * size;

        const [rows] = await pool.query(
            `SELECT c.*, d.nom AS discipline_nom, d.slug AS discipline_slug,
                    (SELECT COUNT(*) FROM courses co WHERE co.chapter_id = c.id)   AS courses_count,
                    (SELECT COUNT(*) FROM exercises e WHERE e.chapter_id = c.id)   AS exercises_count
             FROM chapters c
             JOIN disciplines d ON c.discipline_id = d.id
             ${clause}
             ORDER BY c.order_num ASC, c.ordre ASC, c.id ASC
             LIMIT ? OFFSET ?`,
            params.concat([size, offset])
        );

        return { rows, total };
    },

    /** Chapitre unique enrichi de sa discipline. */
    async findByIdDetailed(id) {
        const [rows] = await pool.query(
            `SELECT c.*, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM chapters c
             JOIN disciplines d ON c.discipline_id = d.id
             WHERE c.id = ? LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    },

    /** Autres chapitres de la meme discipline, pour la colonne laterale. */
    async findSiblings(chapter, limit = 6) {
        const [rows] = await pool.query(
            `SELECT c.id, c.titre, c.slug, c.niveau, c.order_num,
                    (SELECT COUNT(*) FROM courses co WHERE co.chapter_id = c.id) AS courses_count
             FROM chapters c
             WHERE c.discipline_id = ? AND c.id <> ?
             ORDER BY c.order_num ASC, c.ordre ASC
             LIMIT ?`,
            [chapter.discipline_id, chapter.id, Number.parseInt(limit, 10) || 6]
        );
        return rows;
    },

    async countAll() {
        const [rows] = await pool.query('SELECT COUNT(*) AS total FROM chapters');
        return rows[0].total;
    },

    async findByDisciplineSlug(disciplineSlug) {
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
        const [rows] = await pool.query(
            `SELECT DISTINCT c.tome
             FROM chapters c
             JOIN disciplines d ON c.discipline_id = d.id
             WHERE d.slug = ? AND c.tome IS NOT NULL
             ORDER BY c.order_num ASC`,
            [disciplineSlug]
        );
        return rows.map(r => r.tome);
    },

    async findBySlug(slug) {
        const [rows] = await pool.query(
            `SELECT c.*, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM chapters c
             JOIN disciplines d ON c.discipline_id = d.id
             WHERE c.slug = ? LIMIT 1`,
            [slug]
        );
        return rows[0] || null;
    },

    async findById(id) {
        const [rows] = await pool.query('SELECT * FROM chapters WHERE id = ? LIMIT 1', [id]);
        return rows[0] || null;
    },

    // `ordre` est l'ancienne colonne d'ordonnancement, `order_num` la nouvelle.
    // Les deux sont ecrites avec la meme valeur pour qu'elles ne divergent pas
    // tant que `ordre` n'a pas ete retiree du schema.
    async create({ discipline_id, titre, slug, description, niveau = 'l1', order_num = 0 }) {
        const safeSlug = slug || titre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const rank = Number.parseInt(order_num, 10) || 0;
        const [result] = await pool.query(
            'INSERT INTO chapters (discipline_id, titre, slug, description, niveau, ordre, order_num) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [discipline_id, titre, safeSlug, description || null, niveau, rank, rank]
        );
        return this.findById(result.insertId);
    },

    async update(id, { discipline_id, titre, slug, description, niveau, order_num }) {
        const safeSlug = slug || titre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const rank = Number.parseInt(order_num, 10) || 0;
        await pool.query(
            'UPDATE chapters SET discipline_id = ?, titre = ?, slug = ?, description = ?, niveau = ?, ordre = ?, order_num = ? WHERE id = ?',
            [discipline_id, titre, safeSlug, description || null, niveau, rank, rank, id]
        );
        return this.findById(id);
    },

    async delete(id) {
        const [result] = await pool.query('DELETE FROM chapters WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },
};

module.exports = Chapter;
