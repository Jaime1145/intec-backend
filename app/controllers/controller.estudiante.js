import { pool } from '../config/db.js';
import { fallo } from '../utils/respuestas.js';

export const listarEstudiantes = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        let sql = 'SELECT * FROM estudiantes';
        const params = [];
        if (q) {
            sql += ' WHERE documento LIKE ? OR nombres LIKE ? OR apellidos LIKE ?';
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }
        sql += ' ORDER BY apellidos, nombres';
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        fallo(res, error);
    }
};

export const obtenerEstudiante = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM estudiantes WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Estudiante no encontrado' });
        res.json(rows[0]);
    } catch (error) {
        fallo(res, error);
    }
};

export const crearEstudiante = async (req, res) => {
    try {
        const { tipo_documento, documento, nombres, apellidos, email, telefono, ciudad } = req.body;
        if (!documento || !nombres || !apellidos) {
            return res.status(400).json({ error: 'documento, nombres y apellidos son obligatorios' });
        }
        const [result] = await pool.query(
            `INSERT INTO estudiantes (tipo_documento, documento, nombres, apellidos, email, telefono, ciudad)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [tipo_documento || 'CC', String(documento).trim(), nombres.trim(), apellidos.trim(),
             email || null, telefono || null, ciudad || null]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe un estudiante con ese documento' });
        }
        fallo(res, error);
    }
};

export const actualizarEstudiante = async (req, res) => {
    try {
        const { tipo_documento, documento, nombres, apellidos, email, telefono, ciudad } = req.body;
        if (!documento || !nombres || !apellidos) {
            return res.status(400).json({ error: 'documento, nombres y apellidos son obligatorios' });
        }
        await pool.query(
            `UPDATE estudiantes SET tipo_documento = ?, documento = ?, nombres = ?, apellidos = ?,
             email = ?, telefono = ?, ciudad = ? WHERE id = ?`,
            [tipo_documento || 'CC', String(documento).trim(), nombres.trim(), apellidos.trim(),
             email || null, telefono || null, ciudad || null, req.params.id]
        );
        res.json({ message: 'Estudiante actualizado correctamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe un estudiante con ese documento' });
        }
        fallo(res, error);
    }
};

export const eliminarEstudiante = async (req, res) => {
    try {
        await pool.query('DELETE FROM estudiantes WHERE id = ?', [req.params.id]);
        res.json({ message: 'Estudiante eliminado correctamente' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ error: 'No se puede eliminar: el estudiante tiene matrículas' });
        }
        fallo(res, error);
    }
};
