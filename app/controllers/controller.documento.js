import crypto from 'crypto';
import { pool } from '../config/db.js';
import { instituto } from '../config/instituto.js';
import { fallo } from '../utils/respuestas.js';
import { hoyColombia } from '../utils/cuotas.js';
import { fechaDesdeTimestamp } from '../utils/fechas.js';
import { construirConstancia, construirRecibo, construirCertificado } from '../utils/pdf.js';

// Sin letras ni números que se confunden (I, O, 0, 1). 32 símbolos: reparto uniforme con bytes de 0 a 255.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const nuevoCodigo = () =>
    Array.from(crypto.randomBytes(12), (b) => ALFABETO[b % ALFABETO.length]).join('');

// Reutiliza el código del mismo documento (así el QR de una constancia ya enviada no cambia).
// Devuelve también la fecha en que se emitió por primera vez, para que el PDF siempre diga lo mismo.
const obtenerCodigo = async (tipo, matriculaId, pagoId) => {
    const [existente] = await pool.query(
        `SELECT codigo, UNIX_TIMESTAMP(created_at) AS ts FROM documentos
         WHERE tipo = ? AND matricula_id = ? AND pago_id <=> ? AND vigente = 1
         ORDER BY id LIMIT 1`,
        [tipo, matriculaId, pagoId]
    );
    if (existente.length > 0) {
        return { codigo: existente[0].codigo, emitido: fechaDesdeTimestamp(existente[0].ts) };
    }

    for (let intento = 0; intento < 5; intento++) {
        const codigo = nuevoCodigo();
        try {
            await pool.query(
                'INSERT INTO documentos (codigo, tipo, matricula_id, pago_id) VALUES (?, ?, ?, ?)',
                [codigo, tipo, matriculaId, pagoId]
            );
            return { codigo, emitido: hoyColombia() };
        } catch (error) {
            if (error.code !== 'ER_DUP_ENTRY') throw error;
        }
    }
    throw new Error('No se pudo generar un código único para el documento');
};

const enviarPdf = (res, buffer, nombre) => {
    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${nombre}"`,
        'Content-Length': buffer.length
    });
    res.send(buffer);
};

const limpio = (texto) => String(texto).replace(/[^A-Za-z0-9_-]/g, '');

// GET /api/matriculas/:id/constancia
export const constancia = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT m.id, m.periodo, m.fecha_matricula, m.estado,
                   e.tipo_documento, e.documento, e.nombres, e.apellidos,
                   p.nombre AS programa, p.nivel, p.duracion_meses
            FROM matriculas m
            JOIN estudiantes e ON e.id = m.estudiante_id
            JOIN programas p ON p.id = m.programa_id
            WHERE m.id = ?`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Matrícula no encontrada' });

        const m = rows[0];
        if (!['activa', 'graduada'].includes(m.estado)) {
            return res.status(409).json({
                error: 'La matrícula debe estar activa o graduada para emitir la constancia'
            });
        }

        const { codigo, emitido } = await obtenerCodigo('constancia', m.id, null);
        const pdf = await construirConstancia({
            m, codigo, url: `${instituto.publicUrl}/verificar/${codigo}`, fecha: emitido
        });
        enviarPdf(res, pdf, `constancia-${limpio(m.documento)}.pdf`);
    } catch (error) {
        fallo(res, error);
    }
};

// GET /api/matriculas/:id/certificado (solo matrículas graduadas)
export const certificado = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT m.id, m.periodo, m.fecha_matricula, m.estado,
                   e.tipo_documento, e.documento, e.nombres, e.apellidos,
                   p.nombre AS programa, p.nivel, p.duracion_meses
            FROM matriculas m
            JOIN estudiantes e ON e.id = m.estudiante_id
            JOIN programas p ON p.id = m.programa_id
            WHERE m.id = ?`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Matrícula no encontrada' });

        const m = rows[0];
        if (m.estado !== 'graduada') {
            return res.status(409).json({
                error: 'El certificado de estudios solo se emite a matrículas en estado graduada'
            });
        }

        const { codigo, emitido } = await obtenerCodigo('certificado', m.id, null);
        const pdf = await construirCertificado({
            m, codigo, url: `${instituto.publicUrl}/verificar/${codigo}`, fecha: emitido
        });
        enviarPdf(res, pdf, `certificado-${limpio(m.documento)}.pdf`);
    } catch (error) {
        fallo(res, error);
    }
};

// GET /api/pagos/:id/recibo
export const recibo = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT pg.id, pg.matricula_id, pg.numero_cuota, pg.valor, pg.estado, pg.fecha_pago, pg.metodo,
                   m.periodo, m.num_cuotas,
                   e.tipo_documento, e.documento, e.nombres, e.apellidos,
                   p.nombre AS programa, p.nivel,
                   (SELECT COALESCE(SUM(valor), 0) FROM pagos WHERE matricula_id = pg.matricula_id) AS total_cuotas,
                   (SELECT COALESCE(SUM(x.valor), 0) FROM pagos x
                     WHERE x.matricula_id = pg.matricula_id AND x.estado = 'pagado'
                       AND (x.fecha_pago < pg.fecha_pago OR (x.fecha_pago = pg.fecha_pago AND x.id <= pg.id))
                   ) AS pagado_hasta_aqui
            FROM pagos pg
            JOIN matriculas m ON m.id = pg.matricula_id
            JOIN estudiantes e ON e.id = m.estudiante_id
            JOIN programas p ON p.id = m.programa_id
            WHERE pg.id = ?`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Cuota no encontrada' });

        const r = rows[0];
        if (r.estado !== 'pagado') {
            return res.status(409).json({ error: 'La cuota aún no está pagada: no se puede emitir el recibo' });
        }
        r.saldo = Number(r.total_cuotas) - Number(r.pagado_hasta_aqui);

        const { codigo } = await obtenerCodigo('recibo', r.matricula_id, r.id);
        const pdf = await construirRecibo({
            r, codigo, url: `${instituto.publicUrl}/verificar/${codigo}`
        });
        enviarPdf(res, pdf, `recibo-${String(r.id).padStart(6, '0')}.pdf`);
    } catch (error) {
        fallo(res, error);
    }
};
