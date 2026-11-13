import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'intec_db',
    port: 3307, // <-- AQUÍ ESTÁ LA MAGIA
    waitForConnections: true,
    connectionLimit: 10
});