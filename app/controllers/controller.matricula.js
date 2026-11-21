import { pool } from '../config/db.js';
import { fallo } from '../utils/respuestas.js';
import { generarCuotas, hoyColombia } from '../utils/cuotas.js';

const ESTADOS = ['pendiente', 'activa', 'retirada', 'graduada'];

// Lista de matrículas con estudiante, programa y resumen de pagos
export const listarMatriculas = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT m.id, m.periodo, m.fecha_matricula, m.estado, m.valor_total, m.num_cuotas,
                   e.id AS estudiante_id, e.documento, e.nombres, e.apellidos,
                   p.id AS programa_id, p.nombre AS programa, p.nivel,
                   COALESCE(SUM(CASE WHEN pg.estado = 'pagado' THEN pg.valor END), 0) AS total_pagado,
                   COALESCE(SUM(CASE WHEN pg.estado = 'pendiente' THEN pg.valor END), 0) AS total_pendiente
            FROM matriculas m
            JOIN estudiantes e ON e.id = m.estudiante_id
            JOIN programas p ON p.id = m.programa_id
            LEFT JOIN pagos pg ON pg.matricula_id = m.id
            GROUP BY m.id
            ORDER BY m.id DESC
        `);
        res.json(rows);
    } catch (error) {
        fallo(res, error);
    }
};

// Una matrícula con todas sus cuotas
export const obtenerMatricula = async (req, res) => {
    try {
        const { id } = req.params;
        const [mat] = await pool.query(`
            SELECT m.*, e.documento, e.nombres, e.apellidos, e.email, e.telefono,
                   p.nombre AS programa, p.nivel, p.duracion_meses
            FROM matriculas m
            JOIN estudiantes e ON e.id = m.estudiante_id
            JOIN programas p ON p.id = m.programa_id
            WHERE m.id = ?`, [id]);
        if (mat.length === 0) return res.status(404).json({ error: 'Matrícula no encontrada' });
        const [pagos] = await pool.query(
            'SELECT * FROM pagos WHERE matricula_id = ? ORDER BY numero_cuota', [id]);
        res.json({ ...mat[0], pagos });
    } catch (error) {
        fallo(res, error);
    }
};

// Crea la matrícula y sus cuotas en una sola transacción
export const crearMatricula = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { estudiante_id, programa_id, periodo, fecha_matricula } = req.body;
        const numCuotas = Number(req.body.num_cuotas || 1);

        if (!estudiante_id || !programa_id || !periodo) {
            return res.status(400).json({ error: 'estudiante_id, programa_id y periodo son obligatorios' });
        }
        if (!Number.isInteger(numCuotas) || numCuotas < 1 || numCuotas > 24) {
            return res.status(400).json({ error: 'num_cuotas debe ser un entero entre 1 y 24' });
        }

        const [prog] = await conn.query('SELECT valor_total FROM programas WHERE id = ?', [programa_id]);
        if (prog.length === 0) return res.status(404).json({ error: 'Programa no encontrado' });

        const [est] = await conn.query('SELECT id FROM estudiantes WHERE id = ?', [estudiante_id]);
        if (est.length === 0) return res.status(404).json({ error: 'Estudiante no encontrado' });

        const valorTotal = Number(req.body.valor_total || prog[0].valor_total || 0);
        if (!(valorTotal > 0)) {
            return res.status(400).json({
                error: 'El programa no tiene valor definido: envía valor_total o actualiza el programa'
            });
        }

        const fecha = fecha_matricula || hoyColombia();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({ error: 'fecha_matricula debe tener formato AAAA-MM-DD' });
        }

        await conn.beginTransaction();
        const [result] = await conn.query(
            `INSERT INTO matriculas (estudiante_id, programa_id, periodo, fecha_matricula, valor_total, num_cuotas)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [estudiante_id, programa_id, periodo, fecha, valorTotal, numCuotas]
        );
        const cuotas = generarCuotas(result.insertId, valorTotal, numCuotas, fecha);
        await conn.query(
            'INSERT INTO pagos (matricula_id, numero_cuota, valor, fecha_vencimiento) VALUES ?',
            [cuotas]
        );
        await conn.commit();
        res.status(201).json({ id: result.insertId, valor_total: valorTotal, num_cuotas: numCuotas });
    } catch (error) {
        await conn.rollback().catch(() => {});
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'El estudiante ya está matriculado en ese programa y periodo' });
        }
        fallo(res, error);
    } finally {
        conn.release();
    }
};

export const cambiarEstado = async (req, res) => {
    try {
        const { estado } = req.body;
        if (!ESTADOS.includes(estado)) {
            return res.status(400).json({ error: `estado debe ser uno de: ${ESTADOS.join(', ')}` });
        }
        const [r] = await pool.query('UPDATE matriculas SET estado = ? WHERE id = ?', [estado, req.params.id]);
        if (r.affectedRows === 0) return res.status(404).json({ error: 'Matrícula no encontrada' });
        res.json({ message: 'Estado actualizado correctamente' });
    } catch (error) {
        fallo(res, error);
    }
};

// Registra el pago de una cuota. Si es la primera cuota pagada, la matrícula pasa a "activa".
export const pagarCuota = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { id } = req.params;
        const metodo = (req.body.metodo || 'efectivo').toString().slice(0, 30);
        const fechaPago = req.body.fecha_pago || hoyColombia();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaPago)) {
            return res.status(400).json({ error: 'fecha_pago debe tener formato AAAA-MM-DD' });
        }

        await conn.beginTransaction();
        const [pg] = await conn.query('SELECT * FROM pagos WHERE id = ? FOR UPDATE', [id]);
        if (pg.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Cuota no encontrada' });
        }
        if (pg[0].estado === 'pagado') {
            await conn.rollback();
            return res.status(409).json({ error: 'Esa cuota ya está pagada' });
        }
        await conn.query(
            "UPDATE pagos SET estado = 'pagado', fecha_pago = ?, metodo = ? WHERE id = ?",
            [fechaPago, metodo, id]
        );
        await conn.query(
            "UPDATE matriculas SET estado = 'activa' WHERE id = ? AND estado = 'pendiente'",
            [pg[0].matricula_id]
        );
        await conn.commit();
        res.json({ message: 'Pago registrado correctamente', matricula_id: pg[0].matricula_id });
    } catch (error) {
        await conn.rollback().catch(() => {});
        fallo(res, error);
    } finally {
        conn.release();
    }
};
