import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

// 1. Listar todos los usuarios
export const listarUsuarios = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, nombre, email FROM usuarios');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Obtener un usuario por ID
export const obtenerUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT id, nombre, email FROM usuarios WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Crear un usuario
export const crearUsuario = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
        }
        if (String(password).length < 8) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
        }
        const [result] = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
            [nombre, email, await bcrypt.hash(String(password), 10)]
        );
        res.json({ id: result.insertId, nombre, email });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Actualizar un usuario
export const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email } = req.body;
        await pool.query('UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?', [nombre, email, id]);
        res.json({ message: 'Usuario actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. Eliminar un usuario
export const eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};