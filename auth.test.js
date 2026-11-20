// Prueba unitaria para verificar la generación de un token
import jwt from 'jsonwebtoken';

const SECRET = 'mi_clave_secreta_123';

test('Debe generar un token JWT válido', () => {
    const payload = { usuario: 'admin' };
    const token = jwt.sign(payload, SECRET, { expiresIn: '2h' });
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    
    // Verificar que el token se puede decodificar
    const decoded = jwt.verify(token, SECRET);
    expect(decoded.usuario).toBe('admin');
});