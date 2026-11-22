import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const aqui = path.dirname(fileURLToPath(import.meta.url));

// Datos que aparecen en los PDF. Cambia los textos entre comillas simples (el segundo valor de cada línea).
// Lo que dejes vacío ('') simplemente no se imprime.
export const instituto = {
    nombre: process.env.INSTITUTO_NOMBRE || 'INTEC',
    subtitulo: process.env.INSTITUTO_SUBTITULO || 'Formación técnica y tecnológica a distancia',
    nit: process.env.INSTITUTO_NIT || '',
    ciudad: process.env.INSTITUTO_CIUDAD || '',
    firmante: process.env.INSTITUTO_FIRMANTE || '',
    cargoFirmante: process.env.INSTITUTO_CARGO || 'Dirección',

    // Si pones un logo en app/assets/logo.png se dibuja solo en el encabezado
    logoPath: path.join(aqui, '..', 'assets', 'logo.png'),

    // Dirección pública del backend: es la que lleva el código QR de verificación.
    // En Railway se define con la variable PUBLIC_URL (sin barra al final).
    publicUrl: (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/+$/, '')
};
