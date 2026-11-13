import jwt from 'jsonwebtoken';

const SECRET = 'mi_clave_secreta_123'; // Debe ser la misma clave que en controller.auth.js

export const verificarToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        
        // Separar el token del prefijo "Bearer"
        const token = authHeader.split(' ')[1];
        
        // Verificar el token
        const decoded = jwt.verify(token, SECRET);
        
        req.usuario = decoded;
        next(); // Pasa al siguiente controlador
    } catch (error) {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
};