import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { JWT_SECRET } from '../config/jwt.js';

// Un hash de bcrypt siempre empieza por $2a$, $2b$ o $2y$
const esHash = (texto) => /^\$2[aby]\$/.test(String(texto));

// Hash falso para gastar el mismo tiempo cuando el usuario no existe (evita descubrir usuarios por la demora)
const HASH_FALSO = bcrypt.hashSync('no-es-una-clave-real', 10);

export const login = async (req, res) => {
    try {
        const usuario = String(req.body.usuario ?? '').trim();
        const contraseña = String(req.body.contraseña ?? '');
        if (!usuario || !contraseña) {
            return res.status(400).json({ error: 'Escriba usuario y contraseña' });
        }

        // El usuario se identifica por correo o por nombre
        const [rows] = await pool.query(
            'SELECT id, nombre, email, password, rol FROM usuarios WHERE email = ? OR nombre = ? LIMIT 1',
            [usuario, usuario]
        );
        const u = rows[0];

        let correcta = false;
        if (!u) {
            await bcrypt.compare(contraseña, HASH_FALSO);
        } else if (esHash(u.password)) {
            correcta = await bcrypt.compare(contraseña, u.password);
        } else {
            // Usuario antiguo con la contraseña sin cifrar: se valida y se cifra en este mismo ingreso
            correcta = u.password === contraseña;
            if (correcta) {
                await pool.query('UPDATE usuarios SET password = ? WHERE id = ?',
                    [await bcrypt.hash(contraseña, 10), u.id]);
            }
        }

        if (!correcta) return res.status(401).json({ error: 'Credenciales incorrectas' });

        // El token no lleva contraseñas
        const token = jwt.sign({ id: u.id, usuario: u.nombre, rol: u.rol }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'No se pudo iniciar sesión' });
    }
};
