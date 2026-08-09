/**
 * Modele Exercise - acces a la table `exercises`.
 */
const { pool } = require('../../config/db');

const Exercise = {
    async findAll() {
        const [rows] = await pool.query(
            `SELECT e.*, ch.titre AS chapter_titre, ch.slug AS chapter_slug, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM exercises e
             JOIN chapters ch ON e.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             ORDER BY e.created_at DESC`
        );
        return rows;
    },

    async countAll() {
        const [rows] = await pool.query('SELECT COUNT(*) AS total FROM exercises');
        return rows[0].total;
    },

    async findByDisciplineSlug(disciplineSlug) {
        const [rows] = await pool.query(
            `SELECT e.*, ch.titre AS chapter_titre, ch.slug AS chapter_slug, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM exercises e
             JOIN chapters ch ON e.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             WHERE d.slug = ?
             ORDER BY ch.order_num ASC, e.created_at DESC`,
            [disciplineSlug]
        );
        return rows;
    },

    /**
     * Page d'exercices d'une discipline, filtres par chapitre, niveau et
     * difficulte. Renvoie { rows, total }.
     *
     * `chapitre` est compare a l'identifiant numerique du chapitre ; niveau et
     * difficulte sont valides contre des listes blanches. Toutes les valeurs
     * passent par des placeholders.
     */
    async findPage({ disciplineSlug, chapitre = null, niveau = null, difficulte = null, page = 1, perPage = 5 } = {}) {
        const NIVEAUX = ['l1', 'l2', 'l3', 'master', 'autre'];
        const DIFFICULTES = ['facile', 'moyen', 'difficile', 'avance'];

        const where = ['d.slug = ?'];
        const params = [disciplineSlug];

        const chapterId = Number.parseInt(chapitre, 10);
        if (Number.isInteger(chapterId) && chapterId > 0) {
            where.push('e.chapter_id = ?');
            params.push(chapterId);
        }
        if (niveau && niveau !== 'tous' && NIVEAUX.indexOf(niveau) !== -1) {
            where.push('e.niveau = ?');
            params.push(niveau);
        }
        if (difficulte && difficulte !== 'toutes' && DIFFICULTES.indexOf(difficulte) !== -1) {
            where.push('e.difficulte = ?');
            params.push(difficulte);
        }
        const clause = 'WHERE ' + where.join(' AND ');

        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total
             FROM exercises e
             JOIN chapters ch ON e.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             ${clause}`,
            params
        );
        const total = countRows[0].total;

        const size = Math.max(1, Number.parseInt(perPage, 10) || 5);
        const current = Math.max(1, Number.parseInt(page, 10) || 1);
        const offset = (current - 1) * size;

        const [rows] = await pool.query(
            `SELECT e.*, ch.titre AS chapter_titre, ch.slug AS chapter_slug,
                    d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM exercises e
             JOIN chapters ch ON e.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             ${clause}
             ORDER BY ch.order_num ASC, e.created_at DESC
             LIMIT ? OFFSET ?`,
            params.concat([size, offset])
        );

        return { rows, total };
    },

    /** Statistiques d'en-tete pour une discipline. */
    async stats(disciplineSlug) {
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS series,
                    COUNT(DISTINCT e.chapter_id) AS chapitres,
                    SUM(CASE WHEN e.correction_file IS NOT NULL THEN 1 ELSE 0 END) AS corriges,
                    SUM(CASE WHEN e.enonce_file IS NOT NULL THEN 1 ELSE 0 END)     AS enonces
             FROM exercises e
             JOIN chapters ch ON e.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             WHERE d.slug = ?`,
            [disciplineSlug]
        );
        const r = rows[0] || {};
        const series = Number(r.series) || 0;
        const corriges = Number(r.corriges) || 0;
        return {
            series,
            chapitres: Number(r.chapitres) || 0,
            corriges,
            enonces: Number(r.enonces) || 0,
            // Part des series disposant d'un corrige.
            corrigesPercent: series > 0 ? Math.round((corriges / series) * 100) : 0,
        };
    },

    /** Exercices d'un chapitre donne (page de detail du chapitre). */
    async findByChapter(chapterId) {
        const [rows] = await pool.query(
            'SELECT * FROM exercises WHERE chapter_id = ? ORDER BY created_at DESC',
            [chapterId]
        );
        return rows;
    },

    async findBySlug(slug) {
        const [rows] = await pool.query(
            `SELECT e.*, ch.titre AS chapter_titre, ch.slug AS chapter_slug, d.nom AS discipline_nom
             FROM exercises e
             JOIN chapters ch ON e.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             WHERE e.slug = ? LIMIT 1`,
            [slug]
        );
        return rows[0] || null;
    },

    async findById(id) {
        const [rows] = await pool.query('SELECT * FROM exercises WHERE id = ? LIMIT 1', [id]);
        return rows[0] || null;
    },

    /** Comme findById, mais avec le chapitre et la discipline joints. */
    async findByIdDetailed(id) {
        const [rows] = await pool.query(
            `SELECT e.*, ch.titre AS chapter_titre, ch.slug AS chapter_slug, ch.description AS chapter_description,
                    d.id AS discipline_id, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM exercises e
             JOIN chapters ch ON e.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             WHERE e.id = ? LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    },

    /**
     * Exercices proches : d'abord ceux du meme chapitre, puis, s'il en manque,
     * ceux de la meme discipline. L'exercice courant est toujours exclu.
     */
    async findRelated(exercise, limit = 4) {
        const max = Number.parseInt(limit, 10) || 4;
        const [rows] = await pool.query(
            `SELECT e.id, e.titre, e.slug, e.description, e.niveau, e.difficulte,
                    e.enonce_file, e.correction_file,
                    ch.titre AS chapter_titre,
                    d.nom AS discipline_nom, d.slug AS discipline_slug,
                    (ch.id = ?) AS same_chapter
             FROM exercises e
             JOIN chapters ch ON e.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             WHERE e.id <> ? AND d.slug = ?
             ORDER BY same_chapter DESC, e.created_at DESC
             LIMIT ?`,
            [exercise.chapter_id, exercise.id, exercise.discipline_slug, max]
        );
        return rows;
    },

    async create({ chapter_id, titre, slug, description, enonce_file, correction_file, niveau = 'l1', difficulte = 'moyen' }) {
        const safeSlug = slug || titre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const [result] = await pool.query(
            'INSERT INTO exercises (chapter_id, titre, slug, description, enonce_file, correction_file, niveau, difficulte) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [chapter_id, titre, safeSlug, description || null, enonce_file || null, correction_file || null, niveau, difficulte]
        );
        return this.findById(result.insertId);
    },

    async update(id, { chapter_id, titre, slug, description, enonce_file, correction_file, niveau, difficulte }) {
        const safeSlug = slug || titre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const current = await this.findById(id);
        const finalEnonce = enonce_file || current.enonce_file;
        const finalCorrection = correction_file || current.correction_file;

        await pool.query(
            'UPDATE exercises SET chapter_id = ?, titre = ?, slug = ?, description = ?, enonce_file = ?, correction_file = ?, niveau = ?, difficulte = ? WHERE id = ?',
            [chapter_id, titre, safeSlug, description || null, finalEnonce, finalCorrection, niveau, difficulte, id]
        );
        return this.findById(id);
    },

    async delete(id) {
        const [result] = await pool.query('DELETE FROM exercises WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },
};

module.exports = Exercise;
