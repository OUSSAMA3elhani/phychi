/**
 * Modele User - acces a la table `users`.
 */
const bcrypt = require('bcryptjs');
const { pool } = require('../../config/db');

const SALT_ROUNDS = 12;

/** Colonnes publiques : jamais de hachage renvoye par defaut. */
const PUBLIC_COLUMNS = 'id, nom, prenom, email, niveau, role, created_at';

const User = {
    /**
     * Cree un compte. Le mot de passe est hache avant insertion.
     */
    async create({ nom, prenom, email, password, niveau = 'autre', role = 'user' }) {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const [result] = await pool.query(
            `INSERT INTO users (nom, prenom, email, password_hash, niveau, role)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nom, prenom, email, passwordHash, niveau, role]
        );

        return this.findById(result.insertId);
    },

    /** Liste tous les utilisateurs (Reserve Admin). */
    async findAll() {
        const [rows] = await pool.query(
            `SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at DESC`
        );
        return rows;
    },

    /** Compte le nombre total d'utilisateurs. */
    async countAll() {
        const [rows] = await pool.query('SELECT COUNT(*) AS total FROM users');
        return rows[0].total;
    },

    /** Recherche par identifiant. */
    async findById(id) {
        const [rows] = await pool.query(
            `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    },

    /** Recherche par e-mail, sans le hachage. */
    async findByEmail(email) {
        const [rows] = await pool.query(
            `SELECT ${PUBLIC_COLUMNS} FROM users WHERE email = ? LIMIT 1`,
            [email]
        );
        return rows[0] || null;
    },

    /** Recherche par e-mail AVEC le hachage. */
    async findByEmailWithHash(email) {
        const [rows] = await pool.query(
            `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = ? LIMIT 1`,
            [email]
        );
        return rows[0] || null;
    },

    /** Vrai si l'e-mail est deja utilise. */
    async emailExists(email) {
        const [rows] = await pool.query(
            'SELECT 1 FROM users WHERE email = ? LIMIT 1',
            [email]
        );
        return rows.length > 0;
    },

    /** Compare un mot de passe en clair au hachage stocke. */
    verifyPassword(plainPassword, passwordHash) {
        return bcrypt.compare(plainPassword, passwordHash);
    },

    /** Met a jour le profil. */
    async updateProfile(id, { nom, prenom, email, niveau }) {
        await pool.query(
            `UPDATE users SET nom = ?, prenom = ?, email = ?, niveau = ? WHERE id = ?`,
            [nom, prenom, email, niveau, id]
        );
        return this.findById(id);
    },

    /** Met a jour le role d'un utilisateur (Admin). */
    async updateRole(id, role) {
        await pool.query(
            `UPDATE users SET role = ? WHERE id = ?`,
            [role, id]
        );
        return this.findById(id);
    },

    /** Supprime un utilisateur (Admin). */
    async delete(id) {
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    /** Change le mot de passe. */
    async updatePassword(id, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
    },
};

module.exports = User;
