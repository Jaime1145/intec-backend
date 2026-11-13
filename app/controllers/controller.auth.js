import jwt from 'jsonwebtoken';

const SECRET = 'mi_clave_secreta_123'; // En producción usar variables de entorno

export const login = async (req, res) => {
    try {
        const { usuario, contraseña } = req.body;
        
        // Validación de credenciales (ejemplo fijo de la guía)
        if (usuario !== 'admin' || contraseña !== '1234') {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }
        
        // Generar token (el payload no debe contener contraseñas)
        const token = jwt.sign({ usuario }, SECRET, { expiresIn: '2h' });
        
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};