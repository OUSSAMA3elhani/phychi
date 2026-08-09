/**
 * Initialise la base de donnees locale a partir de database/schema.sql.
 *
 *   npm run db:init
 *
 * Se connecte SANS selectionner de base (le script contient son propre
 * CREATE DATABASE / USE) et execute le fichier en une seule fois.
 *
 * A n'utiliser qu'en local : sur GoDaddy, la base est fournie par la
 * plateforme et l'instruction CREATE DATABASE echouerait faute de privileges.
 */
require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');

async function main() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = await fs.readFile(schemaPath, 'utf8');

    const host = process.env.DB_HOST || 'localhost';
    const port = Number(process.env.DB_PORT) || 3306;
    const user = process.env.DB_USER || 'root';

    console.log(`Connexion a MySQL sur ${host}:${port} (utilisateur ${user})...`);

    const connection = await mysql.createConnection({
        host,
        port,
        user,
        password: process.env.DB_PASSWORD || '',
        // Requis pour executer un fichier .sql contenant plusieurs instructions.
        // Ce script ne prend aucune entree utilisateur : aucun risque d'injection.
        multipleStatements: true,
    });

    try {
        await connection.query(sql);
        console.log('Schema applique avec succes.');

        const dbName = process.env.DB_NAME || 'phychi';
        const [tables] = await connection.query(
            'SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
            [dbName]
        );
        console.log(`Tables dans « ${dbName} » : ${tables.map((t) => t.name).join(', ') || '(aucune)'}`);
    } finally {
        await connection.end();
    }
}

main().catch((err) => {
    console.error('\nEchec de l initialisation de la base.');
    if (err.code === 'ECONNREFUSED') {
        console.error('MySQL ne repond pas. Demarrez MySQL depuis le panneau de controle XAMPP.');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('Acces refuse. Verifiez DB_USER / DB_PASSWORD dans votre fichier .env.');
    } else {
        console.error(err.message);
    }
    process.exit(1);
});
