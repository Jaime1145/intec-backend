import { pool } from '../config/db.js';
import { fallo } from '../utils/respuestas.js';

export const listarProgramas = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, nombre, nivel, duracion_meses, valor_total, activo FROM programas ORDER BY nombre, nivel'
        );
        res.json(rows);
    } catch (error) {
        fallo(res, error);
    }
};

export const crearPrograma = async (req, res) => {
    try {
        const { nombre, nivel, duracion_meses, valor_total } = req.body;
        if (!nombre || !['tecnico', 'tecnologo'].includes(nivel)) {
            return res.status(400).json({ error: 'nombre y nivel (tecnico o tecnologo) son obligatorios' });
        }
        const [result] = await pool.query(
            'INSERT INTO programas (nombre, nivel, duracion_meses, valor_total) VALUES (?, ?, ?, ?)',
            [nombre.trim(), nivel, duracion_meses || null, valor_total || null]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ese programa ya existe con ese nivel' });
        }
        fallo(res, error);
    }
};

export const actualizarPrograma = async (req, res) => {
    try {
        const { id } = req.params;
        const { duracion_meses, valor_total } = req.body;
        await pool.query(
            'UPDATE programas SET duracion_meses = ?, valor_total = ? WHERE id = ?',
            [duracion_meses || null, valor_total || null, id]
        );
        res.json({ message: 'Programa actualizado correctamente' });
    } catch (error) {
        fallo(res, error);
    }
};
