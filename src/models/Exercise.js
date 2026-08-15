/**
 * Modèle Exercise - accès sécurisé et tolérant aux pannes à la table `exercises`.
 */
const { pool } = require('../../config/db');

let columnsChecked = false;
async function ensureColumnsExist() {
    if (columnsChecked) return;
    try {
        const [cols] = await pool.query('SHOW COLUMNS FROM exercises LIKE "course_id"');
        if (cols.length === 0) {
            await pool.query('ALTER TABLE exercises ADD COLUMN course_id INT UNSIGNED DEFAULT NULL, ADD COLUMN partie_cours VARCHAR(255) DEFAULT NULL');
        }
        columnsChecked = true;
    } catch (err) {
        console.warn('Vérification colonnes exercises:', err.message);
    }
}

const Exercise = {
    async findAll() {
        await ensureColumnsExist();
        const [rows] = await pool.query(
            `SELECT e.*, ch.titre AS chapter_titre, ch.slug AS chapter_slug, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM exercises e
             LEFT JOIN chapters ch ON e.chapter_id = ch.id
             LEFT JOIN disciplines d ON ch.discipline_id = d.id
             ORDER BY e.created_at DESC`
        );
        return rows;
    },

    async countAll() {
        await ensureColumnsExist();
        const [rows] = await pool.query('SELECT COUNT(*) AS total FROM exercises');
        return rows[0].total;
    },

    async findByDisciplineSlug(disciplineSlug) {
        await ensureColumnsExist();
        const [rows] = await pool.query(
            `SELECT e.*, ch.titre AS chapter_titre, ch.slug AS chapter_slug, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM exercises e
             LEFT JOIN chapters ch ON e.chapter_id = ch.id
             LEFT JOIN disciplines d ON ch.discipline_id = d.id
             WHERE d.slug = ?
             ORDER BY ch.order_num ASC, e.created_at DESC`,
            [disciplineSlug]
        );
        return rows;
    },

    async findPage({ disciplineSlug, tome = null, chapitre = null, niveau = null, difficulte = null, page = 1, perPage = 10 } = {}) {
        await ensureColumnsExist();
        const NIVEAUX = ['l1', 'l2', 'l3', 'master', 'autre'];
        const DIFFICULTES = ['facile', 'moyen', 'difficile', 'avance'];

        const where = ['d.slug = ?'];
        const params = [disciplineSlug];

        if (tome && String(tome).trim() !== '' && String(tome) !== 'tous') {
            where.push('ch.tome = ?');
            params.push(String(tome).trim());
        }

        if (chapitre && !Number.isNaN(Number.parseInt(chapitre, 10)) && Number.parseInt(chapitre, 10) > 0) {
            where.push('e.chapter_id = ?');
            params.push(Number.parseInt(chapitre, 10));
        }

        if (niveau && NIVEAUX.includes(String(niveau).toLowerCase())) {
            where.push('e.niveau = ?');
            params.push(String(niveau).toLowerCase());
        }

        if (difficulte && DIFFICULTES.includes(String(difficulte).toLowerCase())) {
            where.push('e.difficulte = ?');
            params.push(String(difficulte).toLowerCase());
        }

        const whereSql = where.join(' AND ');

        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total
             FROM exercises e
             JOIN chapters ch ON e.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             WHERE ${whereSql}`,
            params
        );
        const total = countRows[0].total;

        const p = Math.max(1, Number.parseInt(page, 10) || 1);
        const limit = Math.max(1, Math.min(100, Number.parseInt(perPage, 10) || 10));
        const offset = (p - 1) * limit;

        const [rows] = await pool.query(
            `SELECT e.*, ch.titre AS chapter_titre, ch.slug AS chapter_slug, ch.tome AS chapter_tome, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM exercises e
             JOIN chapters ch ON e.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             WHERE ${whereSql}
             ORDER BY e.created_at DESC, e.id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return { rows, total };
    },

    async stats(disciplineSlug) {
        await ensureColumnsExist();
        try {
            const [rows] = await pool.query(
                `SELECT COUNT(DISTINCT e.id) AS total_exercises,
                        COUNT(DISTINCT e.chapter_id) AS chapters_with_exercises,
                        SUM(CASE WHEN e.correction_file IS NOT NULL AND e.correction_file != '' THEN 1 ELSE 0 END) AS corriges_count
                 FROM exercises e
                 JOIN chapters ch ON e.chapter_id = ch.id
                 JOIN disciplines d ON ch.discipline_id = d.id
                 WHERE d.slug = ?`,
                [disciplineSlug]
            );
            const r = rows[0] || {};
            const total = Number(r.total_exercises) || 0;
            const chapters = Number(r.chapters_with_exercises) || 0;
            const corriges = Number(r.corriges_count) || 0;
            const percent = total > 0 ? Math.round((corriges / total) * 100) : 100;

            return {
                series: total,
                enonces: total,
                chapitres: chapters,
                corrigesPercent: percent,
                total_exercises: total,
                chapters_with_exercises: chapters,
            };
        } catch (err) {
            return {
                series: 0,
                enonces: 0,
                chapitres: 0,
                corrigesPercent: 100,
                total_exercises: 0,
                chapters_with_exercises: 0,
            };
        }
    },

    async findByChapter(chapterId) {
        await ensureColumnsExist();
        const [rows] = await pool.query(
            'SELECT * FROM exercises WHERE chapter_id = ? ORDER BY id ASC',
            [chapterId]
        );
        return rows;
    },

    async findBySlug(slug) {
        await ensureColumnsExist();
        const [rows] = await pool.query(
            `SELECT e.*, ch.titre AS chapter_titre, ch.slug AS chapter_slug, d.nom AS discipline_nom, d.slug AS discipline_slug
             FROM exercises e
             JOIN chapters ch ON e.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             WHERE e.slug = ? LIMIT 1`,
            [slug]
        );
        return rows[0] || null;
    },

    async findById(id) {
        await ensureColumnsExist();
        const [rows] = await pool.query('SELECT * FROM exercises WHERE id = ? LIMIT 1', [id]);
        return rows[0] || null;
    },

    async findByCourse(courseId) {
        await ensureColumnsExist();
        try {
            const [rows] = await pool.query(
                'SELECT * FROM exercises WHERE course_id = ? ORDER BY id ASC',
                [courseId]
            );
            return rows;
        } catch (err) {
            return [];
        }
    },

    async findByIdDetailed(id) {
        await ensureColumnsExist();
        try {
            const [rows] = await pool.query(
                `SELECT e.*, ch.titre AS chapter_titre, ch.slug AS chapter_slug, ch.description AS chapter_description,
                        co.titre AS course_titre,
                        d.id AS discipline_id, d.nom AS discipline_nom, d.slug AS discipline_slug
                 FROM exercises e
                 JOIN chapters ch ON e.chapter_id = ch.id
                 LEFT JOIN courses co ON e.course_id = co.id
                 JOIN disciplines d ON ch.discipline_id = d.id
                 WHERE e.id = ? LIMIT 1`,
                [id]
            );
            return rows[0] || null;
        } catch (err) {
            // Repli en cas de jointure incomplete
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
        }
    },

    async findRelated(exercise, limit = 4) {
        await ensureColumnsExist();
        try {
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
                 WHERE d.id = ? AND e.id != ?
                 ORDER BY same_chapter DESC, e.created_at DESC
                 LIMIT ?`,
                [exercise.chapter_id, exercise.discipline_id, exercise.id, max]
            );
            return rows;
        } catch (err) {
            return [];
        }
    },

    async findAll() {
        await ensureColumnsExist();
        const [rows] = await pool.query(
            `SELECT e.*, ch.titre AS chapter_titre, d.nom AS discipline_nom
             FROM exercises e
             JOIN chapters ch ON e.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             ORDER BY e.id DESC`
        );
        return rows;
    },

    async create(data) {
        await ensureColumnsExist();
        const { chapter_id, course_id, partie_cours, titre, slug, description, enonce_file, correction_file, niveau, difficulte } = data;
        const safeTitle = titre || 'exercice';
        const autoSlug = slug || (safeTitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now());
        const [result] = await pool.query(
            `INSERT INTO exercises (chapter_id, course_id, partie_cours, titre, slug, description, enonce_file, correction_file, niveau, difficulte)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [chapter_id || 1, course_id || null, partie_cours || null, safeTitle, autoSlug, description || null, enonce_file || null, correction_file || null, niveau || 'l1', difficulte || 'moyen']
        );
        return result.insertId;
    },

    async update(id, data) {
        await ensureColumnsExist();
        const existing = await this.findById(id);
        if (!existing) return false;

        const chapter_id = data.chapter_id !== undefined ? data.chapter_id : existing.chapter_id;
        const course_id = data.course_id !== undefined ? data.course_id : existing.course_id;
        const partie_cours = data.partie_cours !== undefined ? data.partie_cours : existing.partie_cours;
        const titre = data.titre !== undefined ? data.titre : existing.titre;
        const slug = data.slug || existing.slug;
        const description = data.description !== undefined ? data.description : existing.description;
        const enonce_file = data.enonce_file !== undefined ? data.enonce_file : existing.enonce_file;
        const correction_file = data.correction_file !== undefined ? data.correction_file : existing.correction_file;
        const niveau = data.niveau !== undefined ? data.niveau : existing.niveau;
        const difficulte = data.difficulte !== undefined ? data.difficulte : existing.difficulte;

        await pool.query(
            `UPDATE exercises
             SET chapter_id = ?, course_id = ?, partie_cours = ?, titre = ?, slug = ?, description = ?, enonce_file = ?, correction_file = ?, niveau = ?, difficulte = ?
             WHERE id = ?`,
            [chapter_id, course_id, partie_cours, titre, slug, description, enonce_file, correction_file, niveau, difficulte, id]
        );
        return true;
    },

    async delete(id) {
        await ensureColumnsExist();
        const [result] = await pool.query('DELETE FROM exercises WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = Exercise;
