
import 'dotenv/config';
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'intec_db',
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3307),
    waitForConnections: true,
    connectionLimit: 10
});


pool.query('SELECT 1')
    .then(() => console.log('MySQL conectado correctamente'))
    .catch((e) => console.error('Error conectando a MySQL:', e));