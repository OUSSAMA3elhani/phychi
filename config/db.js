/**
 * Pool de connexions MySQL.
 *
 * Les cinq variables DB_* sont lues depuis process.env (regle C12 du contrat
 * GoDaddy Node.js Hosting) : sur la plateforme, elles sont injectees
 * automatiquement par la base manageee.
 */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'phychi',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    charset: 'utf8mb4_unicode_ci',
    timezone: 'Z',
});

/**
 * Verifie que la base repond. Appele au demarrage pour echouer tot et avec un
 * message lisible plutot qu'a la premiere requete d'un visiteur.
 */
async function testConnection() {
    const connection = await pool.getConnection();
    try {
        await connection.ping();
        return true;
    } finally {
        connection.release();
    }
}

/** Parametres de connexion, sans le mot de passe (pour les logs de demarrage). */
function describeConnection() {
    return {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        database: process.env.DB_NAME || 'phychi',
        user: process.env.DB_USER || 'root',
    };
}

module.exports = { pool, testConnection, describeConnection };
