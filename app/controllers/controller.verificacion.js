import { pool } from '../config/db.js';
import { fechaDesdeTimestamp } from '../utils/fechas.js';
import {
    paginaDocumento, paginaFormulario, paginaNoEncontrada, paginaError
} from '../utils/paginaVerificacion.js';

// Deja solo letras y números en mayúscula: acepta "g6a9-ypzq-e477" y "G6A9YPZQE477"
const normalizar = (texto) => String(texto || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const CODIGO_VALIDO = /^[A-Z0-9]{12}$/;

const sinCache = (res) => res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });

// GET /verificar          -> formulario para escribir el código
// GET /verificar?codigo=X -> redirige a /verificar/X
export const formulario = (req, res) => {
    sinCache(res);
    if (req.query.codigo === undefined) return res.type('html').send(paginaFormulario());

    const codigo = normalizar(req.query.codigo);
    if (!CODIGO_VALIDO.test(codigo)) {
        return res.status(400).type('html').send(paginaFormulario('El código debe tener 12 letras y números.'));
    }
    res.redirect(`/verificar/${codigo}`);
};

// GET /verificar/:codigo (es la dirección que lleva el QR; no requiere sesión)
export const verificar = async (req, res) => {
    sinCache(res);
    const codigo = normalizar(req.params.codigo);
    if (!CODIGO_VALIDO.test(codigo)) {
        return res.status(404).type('html').send(paginaNoEncontrada());
    }
    try {
        const [rows] = await pool.query(`
            SELECT d.codigo, d.tipo, d.vigente, UNIX_TIMESTAMP(d.created_at) AS ts,
                   m.periodo, m.estado, m.fecha_matricula, m.num_cuotas,
                   e.tipo_documento, e.documento, e.nombres, e.apellidos,
                   p.nombre AS programa, p.nivel,
                   pg.numero_cuota, pg.valor, pg.fecha_pago
            FROM documentos d
            JOIN matriculas m ON m.id = d.matricula_id
            JOIN estudiantes e ON e.id = m.estudiante_id
            JOIN programas p ON p.id = m.programa_id
            LEFT JOIN pagos pg ON pg.id = d.pago_id
            WHERE d.codigo = ?`, [codigo]);

        if (rows.length === 0) return res.status(404).type('html').send(paginaNoEncontrada());
        res.type('html').send(paginaDocumento(rows[0], fechaDesdeTimestamp(rows[0].ts)));
    } catch (error) {
        console.error(error);
        res.status(500).type('html').send(paginaError());
    }
};
