import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

// Crea el usuario administrador la primera vez, a partir de las variables ADMIN_USER y ADMIN_PASSWORD.
// Si ese usuario ya existe no se toca. Después del primer arranque se puede borrar ADMIN_PASSWORD.
export const asegurarAdmin = async () => {
    const usuario = (process.env.ADMIN_USER || '').trim();
    const clave = process.env.ADMIN_PASSWORD || '';
    if (!usuario || !clave) return;

    if (clave.length < 8) {
        console.warn('AVISO: ADMIN_PASSWORD debe tener al menos 8 caracteres. No se creó el administrador.');
        return;
    }

    const [existe] = await pool.query('SELECT id FROM usuarios WHERE email = ? OR nombre = ? LIMIT 1', [usuario, usuario]);
    if (existe.length > 0) return;

    await pool.query(
        'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
        ['Administrador', usuario, await bcrypt.hash(clave, 10), 'admin']
    );
    console.log(`Usuario administrador creado: ${usuario}`);
};
