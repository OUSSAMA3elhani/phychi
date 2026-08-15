/**
 * Modele Course - acces a la table `courses`.
 */
const { pool } = require('../../config/db');

const Course = {
    async findAll() {
        const [rows] = await pool.query(
            `SELECT co.*, ch.titre AS chapter_titre, ch.slug AS chapter_slug, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM courses co
             JOIN chapters ch ON co.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             ORDER BY co.created_at DESC`
        );
        return rows;
    },

    async countAll() {
        const [rows] = await pool.query('SELECT COUNT(*) AS total FROM courses');
        return rows[0].total;
    },

    /** Statistiques du bandeau d'en-tete, calculees en base. */
    async stats(disciplineSlug = null) {
        const params = [];
        let clause = '';
        if (disciplineSlug) {
            clause = 'WHERE d.slug = ?';
            params.push(disciplineSlug);
        }
        const [rows] = await pool.query(
            `SELECT COUNT(DISTINCT co.id)   AS courses,
                    COUNT(DISTINCT ch.id)   AS chapters,
                    COUNT(DISTINCT d.id)    AS disciplines,
                    SUM(CASE WHEN co.course_file IS NOT NULL THEN 1 ELSE 0 END) AS with_file
             FROM chapters ch
             JOIN disciplines d ON ch.discipline_id = d.id
             LEFT JOIN courses co ON co.chapter_id = ch.id
             ${clause}`,
            params
        );
        const r = rows[0] || {};
        const courses = Number(r.courses) || 0;
        const withFile = Number(r.with_file) || 0;
        return {
            courses,
            chapters: Number(r.chapters) || 0,
            disciplines: Number(r.disciplines) || 0,
            withFile,
            // Part des fiches disposant d'un document telechargeable.
            filePercent: courses > 0 ? Math.round((withFile / courses) * 100) : 0,
        };
    },

    async findByDisciplineSlug(disciplineSlug) {
        const [rows] = await pool.query(
            `SELECT co.*, ch.titre AS chapter_titre, ch.slug AS chapter_slug, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM courses co
             JOIN chapters ch ON co.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             WHERE d.slug = ?
             ORDER BY co.created_at DESC`,
            [disciplineSlug]
        );
        return rows;
    },

    async findBySlug(slug) {
        const [rows] = await pool.query(
            `SELECT co.*, ch.titre AS chapter_titre, ch.slug AS chapter_slug, d.nom AS discipline_nom
             FROM courses co
             JOIN chapters ch ON co.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             WHERE co.slug = ? LIMIT 1`,
            [slug]
        );
        return rows[0] || null;
    },

    async findById(id) {
        const [rows] = await pool.query('SELECT * FROM courses WHERE id = ? LIMIT 1', [id]);
        return rows[0] || null;
    },

    /**
     * Cours a recommander : ceux du chapitre donne en priorite, completes par
     * ceux de la meme discipline.
     */
    async findByChapterOrDiscipline(chapterId, disciplineSlug, limit = 4) {
        const max = Number.parseInt(limit, 10) || 4;
        const [rows] = await pool.query(
            `SELECT co.id, co.titre, co.slug, co.description, co.course_file, co.niveau,
                    ch.titre AS chapter_titre,
                    d.nom AS discipline_nom, d.slug AS discipline_slug,
                    (ch.id = ?) AS same_chapter
             FROM courses co
             JOIN chapters ch ON co.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             WHERE d.slug = ?
             ORDER BY same_chapter DESC, co.created_at DESC
             LIMIT ?`,
            [chapterId, disciplineSlug, max]
        );
        return rows;
    },

    /** Cours d'un chapitre, dans l'ordre d'affichage choisi par l'administration. */
    async findByChapter(chapterId) {
        const [rows] = await pool.query(
            `SELECT * FROM courses WHERE chapter_id = ? ORDER BY order_num ASC, id ASC`,
            [chapterId]
        );
        return rows;
    },

    /** Cours d'un chapitre avec leurs exercices directement associes. */
    async findByChapterWithExercises(chapterId) {
        const [courses] = await pool.query(
            `SELECT * FROM courses WHERE chapter_id = ? ORDER BY order_num ASC, id ASC`,
            [chapterId]
        );
        for (const course of courses) {
            const [exos] = await pool.query(
                `SELECT * FROM exercises WHERE course_id = ? ORDER BY id ASC`,
                [course.id]
            );
            course.exercises = exos;
        }
        return courses;
    },

    async create({ chapter_id, titre, slug, description, contenu, course_file, niveau = 'l1', order_num = 0 }) {
        const safeTitle = titre || 'fiche-cours';
        const safeSlug = slug || (safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now());
        const [result] = await pool.query(
            'INSERT INTO courses (chapter_id, titre, slug, description, contenu, course_file, niveau, order_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [chapter_id || 1, safeTitle, safeSlug, description || null, contenu || null, course_file || null, niveau, Number.parseInt(order_num, 10) || 0]
        );
        return this.findById(result.insertId);
    },

    async update(id, { chapter_id, titre, slug, description, contenu, course_file, niveau, order_num }) {
        const existing = await this.findById(id);
        if (!existing) return null;
        const safeTitle = titre !== undefined ? titre : existing.titre;
        const safeSlug = slug || safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || existing.slug;
        const rank = Number.parseInt(order_num !== undefined ? order_num : existing.order_num, 10) || 0;
        const chapId = chapter_id !== undefined ? chapter_id : existing.chapter_id;
        const safeDesc = description !== undefined ? description : existing.description;
        const safeCont = contenu !== undefined ? contenu : existing.contenu;
        const safeNiv = niveau !== undefined ? niveau : existing.niveau;

        if (course_file) {
            await pool.query(
                'UPDATE courses SET chapter_id = ?, titre = ?, slug = ?, description = ?, contenu = ?, course_file = ?, niveau = ?, order_num = ? WHERE id = ?',
                [chapId, safeTitle, safeSlug, safeDesc, safeCont, course_file, safeNiv, rank, id]
            );
        } else {
            await pool.query(
                'UPDATE courses SET chapter_id = ?, titre = ?, slug = ?, description = ?, contenu = ?, niveau = ?, order_num = ? WHERE id = ?',
                [chapId, safeTitle, safeSlug, safeDesc, safeCont, safeNiv, rank, id]
            );
        }
        return this.findById(id);
    },

    async delete(id) {
        const [result] = await pool.query('DELETE FROM courses WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },
};

module.exports = Course;
