/**
 * Modele Favorite - acces a la table `favorites`.
 *
 * Les favoris sont polymorphes : une ligne pointe vers un cours
 * (`item_type = 'course'`) ou vers un exercice (`item_type = 'exercise'`)
 * via `item_id`. Le couple (user_id, item_type, item_id) est unique, ce qui
 * rend le basculement idempotent.
 *
 * Requetes parametrees (placeholders `?`) exclusivement.
 */
const { pool } = require('../../config/db');

/** Types acceptes, et la table de contenu correspondante. */
/** Types acceptes, et la table de contenu correspondante. */
const ITEM_TYPES = {
    course: { table: 'courses', categorie: 'cours' },
    exercise: { table: 'exercises', categorie: 'exercices' },
    chapter: { table: 'chapters', categorie: 'chapitres' },
    book: { table: 'books', categorie: 'livres' },
    concours: { table: 'concours', categorie: 'concours' },
};

/** Les slugs de discipline ne correspondent pas tous a l'ENUM `matiere`. */
function toMatiere(disciplineSlug) {
    if (disciplineSlug === 'physique' || disciplineSlug === 'chimie' || disciplineSlug === 'Physique' || disciplineSlug === 'Chimie') {
        return String(disciplineSlug).toLowerCase();
    }
    return 'autre';
}

const Favorite = {
    /** Valide un type et renvoie sa configuration, ou null. */
    resolveType(itemType) {
        return Object.prototype.hasOwnProperty.call(ITEM_TYPES, itemType)
            ? { name: itemType, ...ITEM_TYPES[itemType] }
            : null;
    },

    /**
     * Charge la ressource ciblee pour verifier qu'elle existe et recuperer les
     * champs denormalises (titre / url / matiere).
     */
    async loadItem(type, itemId) {
        if (type.name === 'chapter') {
            const [rows] = await pool.query(
                `SELECT ch.id, ch.titre, ch.slug, d.slug AS discipline_slug
                 FROM chapters ch
                 JOIN disciplines d ON ch.discipline_id = d.id
                 WHERE ch.id = ? LIMIT 1`,
                [itemId]
            );
            return rows[0] || null;
        }
        if (type.name === 'book') {
            const [rows] = await pool.query(
                `SELECT b.id, b.titre, b.discipline AS discipline_slug
                 FROM books b
                 WHERE b.id = ? LIMIT 1`,
                [itemId]
            );
            return rows[0] || null;
        }
        if (type.name === 'concours') {
            const [rows] = await pool.query(
                `SELECT c.id, c.titre, c.matiere AS discipline_slug
                 FROM concours c
                 WHERE c.id = ? LIMIT 1`,
                [itemId]
            );
            return rows[0] || null;
        }

        const [rows] = await pool.query(
            `SELECT i.id, i.titre, i.slug, d.slug AS discipline_slug
             FROM \`${type.table}\` i
             JOIN chapters ch ON i.chapter_id = ch.id
             JOIN disciplines d ON ch.discipline_id = d.id
             WHERE i.id = ? LIMIT 1`,
            [itemId]
        );
        return rows[0] || null;
    },

    /** Un utilisateur a-t-il deja mis cette ressource en favori ? */
    async isFavorited(userId, itemType, itemId) {
        const [rows] = await pool.query(
            'SELECT id FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ? LIMIT 1',
            [userId, itemType, itemId]
        );
        return rows.length > 0;
    },

    /**
     * Ajoute le favori s'il est absent, le retire s'il est present.
     * @returns {Promise<{favorited: boolean}|null>} null si la ressource est introuvable.
     */
    async toggle(userId, itemType, itemId) {
        const type = this.resolveType(itemType);
        if (!type) return null;

        const item = await this.loadItem(type, itemId);
        if (!item) return null;

        const [existing] = await pool.query(
            'SELECT id FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ? LIMIT 1',
            [userId, type.name, itemId]
        );

        if (existing.length > 0) {
            await pool.query('DELETE FROM favorites WHERE id = ? AND user_id = ?', [existing[0].id, userId]);
            return { favorited: false };
        }

        let url = `/cours`;
        if (type.name === 'exercise') {
            url = `/exercices-${toMatiere(item.discipline_slug) === 'chimie' ? 'chimie' : 'physique'}`;
        } else if (type.name === 'chapter') {
            url = `/cours/${item.id}`;
        } else if (type.name === 'book') {
            url = `/livres/${item.id}`;
        } else if (type.name === 'concours') {
            url = `/concours/${item.id}`;
        }

        await pool.query(
            `INSERT INTO favorites (user_id, item_type, item_id, titre, url, categorie, matiere)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE titre = VALUES(titre), url = VALUES(url)`,
            [userId, type.name, itemId, item.titre, url, type.categorie, toMatiere(item.discipline_slug)]
        );
        return { favorited: true };
    },

    /** Identifiants des ressources d'un type donne mises en favori. */
    async idsFor(userId, itemType) {
        if (!userId) return [];
        const [rows] = await pool.query(
            'SELECT item_id FROM favorites WHERE user_id = ? AND item_type = ? AND item_id IS NOT NULL',
            [userId, itemType]
        );
        return rows.map((r) => r.item_id);
    },

    /** Cours mis en favori (modules et lecons), enrichis de leur chapitre et discipline. */
    async listCourses(userId) {
        const [rows] = await pool.query(
            `SELECT f.id AS favorite_id, f.item_type, f.item_id, f.created_at AS favorited_at,
                    COALESCE(c.id, ch.id) AS id,
                    COALESCE(c.titre, ch.titre, f.titre) AS titre,
                    COALESCE(c.slug, ch.slug) AS slug,
                    COALESCE(c.description, ch.description, '') AS description,
                    c.course_file,
                    COALESCE(c.niveau, ch.niveau, 'Tous') AS niveau,
                    COALESCE(ch.titre, f.titre) AS chapter_titre,
                    ch.id AS chapter_id,
                    COALESCE(d.nom, 'Physique & Chimie') AS discipline_nom,
                    COALESCE(d.slug, f.matiere, 'physique') AS discipline_slug
             FROM favorites f
             LEFT JOIN courses c ON (f.item_type = 'course' AND c.id = f.item_id)
             LEFT JOIN chapters ch ON ( (f.item_type = 'course' AND c.chapter_id = ch.id) OR (f.item_type = 'chapter' AND ch.id = f.item_id) )
             LEFT JOIN disciplines d ON ch.discipline_id = d.id
             WHERE f.user_id = ? AND f.item_type IN ('course', 'chapter')
             ORDER BY f.created_at DESC`,
            [userId]
        );
        return rows;
    },

    /** Exercices mis en favori, enrichis de leur chapitre et discipline. */
    async listExercises(userId) {
        const [rows] = await pool.query(
            `SELECT f.id AS favorite_id, f.item_type, f.item_id, f.created_at AS favorited_at,
                    e.id,
                    COALESCE(e.titre, f.titre) AS titre,
                    e.slug,
                    COALESCE(e.description, '') AS description,
                    e.enonce_file, e.correction_file,
                    COALESCE(e.niveau, 'Tous') AS niveau,
                    COALESCE(e.difficulte, 'Moyen') AS difficulte,
                    COALESCE(ch.titre, 'Exercices') AS chapter_titre,
                    COALESCE(d.nom, 'Physique & Chimie') AS discipline_nom,
                    COALESCE(d.slug, f.matiere, 'physique') AS discipline_slug
             FROM favorites f
             JOIN exercises e ON e.id = f.item_id
             LEFT JOIN chapters ch ON e.chapter_id = ch.id
             LEFT JOIN disciplines d ON ch.discipline_id = d.id
             WHERE f.user_id = ? AND f.item_type = 'exercise'
             ORDER BY f.created_at DESC`,
            [userId]
        );
        return rows;
    },

    /** Chapitres / Modules mis en favori. */
    async listChapters(userId) {
        const [rows] = await pool.query(
            `SELECT f.id AS favorite_id, f.item_type, f.item_id, f.created_at AS favorited_at,
                    ch.id,
                    COALESCE(ch.titre, f.titre) AS titre,
                    ch.slug,
                    COALESCE(ch.description, '') AS description,
                    COALESCE(ch.niveau, 'Tous') AS niveau,
                    COALESCE(d.nom, 'Physique & Chimie') AS discipline_nom,
                    COALESCE(d.slug, f.matiere, 'physique') AS discipline_slug
             FROM favorites f
             JOIN chapters ch ON ch.id = f.item_id
             LEFT JOIN disciplines d ON ch.discipline_id = d.id
             WHERE f.user_id = ? AND f.item_type = 'chapter'
             ORDER BY f.created_at DESC`,
            [userId]
        );
        return rows;
    },

    /** Livres mis en favori. */
    async listBooks(userId) {
        const [rows] = await pool.query(
            `SELECT f.id AS favorite_id, f.item_type, f.item_id, f.created_at AS favorited_at,
                    b.id, COALESCE(b.titre, f.titre) AS titre, b.slug, b.pdf_file,
                    COALESCE(b.auteur, 'Auteur CPGE') AS auteur,
                    COALESCE(b.collection, 'Manuel') AS collection,
                    COALESCE(b.discipline, f.matiere, 'Physique') AS discipline,
                    COALESCE(b.niveau, 'CPGE') AS niveau
             FROM favorites f
             JOIN books b ON b.id = f.item_id
             WHERE f.user_id = ? AND f.item_type = 'book'
             ORDER BY f.created_at DESC`,
            [userId]
        );
        return rows;
    },

    /** Concours mis en favori. */
    async listConcours(userId) {
        const [rows] = await pool.query(
            `SELECT f.id AS favorite_id, f.item_type, f.item_id, f.created_at AS favorited_at,
                    c.id, COALESCE(c.titre, f.titre) AS titre, c.slug,
                    COALESCE(c.ecole, 'Concours') AS ecole,
                    COALESCE(c.annee, '2024') AS annee,
                    COALESCE(c.epreuve, c.titre) AS epreuve,
                    c.enonce_file, c.correction_file,
                    COALESCE(c.matiere, f.matiere, 'Physique') AS matiere
             FROM favorites f
             JOIN concours c ON c.id = f.item_id
             WHERE f.user_id = ? AND f.item_type = 'concours'
             ORDER BY f.created_at DESC`,
            [userId]
        );
        return rows;
    },

    /**
     * Liste brute des favoris (toutes categories confondues).
     * Conserve pour l'API historique GET /api/favorites.
     */
    async getByUserId(userId) {
        const [rows] = await pool.query(
            `SELECT id, user_id, item_type, item_id, titre, url, categorie, matiere, created_at
             FROM favorites
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );
        return rows;
    },

    /** Supprime un favori par son identifiant de ligne. */
    async removeById(userId, id) {
        const [result] = await pool.query(
            'DELETE FROM favorites WHERE user_id = ? AND id = ?',
            [userId, id]
        );
        return result.affectedRows > 0;
    },

    /** Supprime un favori polymorphe par la ressource qu'il designe. */
    async removeByItem(userId, itemType, itemId) {
        const [result] = await pool.query(
            'DELETE FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?',
            [userId, itemType, itemId]
        );
        return result.affectedRows > 0;
    },
};

module.exports = Favorite;
