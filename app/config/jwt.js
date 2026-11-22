import crypto from 'crypto';

// La clave que firma los tokens se toma de la variable JWT_SECRET (en Railway y en el .env).
// Si no existe, se usa una clave aleatoria solo para esta ejecución: es segura, pero al reiniciar
// el servidor se cierran las sesiones. Por eso conviene definir JWT_SECRET.
let clave = process.env.JWT_SECRET;
if (!clave) {
    clave = crypto.randomBytes(32).toString('hex');
    console.warn('AVISO: falta la variable JWT_SECRET. Se usa una clave temporal (las sesiones se cierran al reiniciar).');
}

export const JWT_SECRET = clave;
