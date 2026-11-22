import { pool } from '../config/db.js';
import { fallo } from '../utils/respuestas.js';
import { generarCuotas, hoyColombia } from '../utils/cuotas.js';

// Datos de demostración. Solo funcionan si en el backend existe la variable DEMO_HABILITADO=1.
// Todos los estudiantes de demostración tienen un documento que empieza por 9000 para poder limpiarlos.
const PREFIJO = '9000';

const habilitado = () => process.env.DEMO_HABILITADO === '1';

const sumarDias = (iso, dias) => {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
};

// Duración y valor de cada programa (solo se rellenan los que estén vacíos)
const PROGRAMAS = [
    ['Seguridad Vial', 'tecnico', 6, 1200000],
    ['Preescolar y Primera Infancia', 'tecnico', 12, 2400000],
    ['Manejo de Drones', 'tecnico', 4, 900000],
    ['Contabilidad', 'tecnico', 12, 2100000],
    ['Maquinaria Amarilla', 'tecnico', 6, 1500000],
    ['Salud Ocupacional', 'tecnico', 12, 2300000],
    ['Agente de Transito', 'tecnico', 6, 1300000],
    ['Seguridad Vial', 'tecnologo', 24, 4800000],
    ['Contabilidad', 'tecnologo', 24, 5200000],
    ['Salud Ocupacional', 'tecnologo', 24, 5000000]
];

// [nombres, apellidos, programa, nivel, estado, matrícula hace N días, último ingreso hace N días,
//  cuotas: [vence en N días (negativo = ya venció), pagada]]
const CASOS = [
    ['Laura Valentina', 'Gómez Rojas', 'Seguridad Vial', 'tecnico', 'activa', 40, 2, [[-40, 1], [-10, 1], [20, 0]]],
    ['Carlos Andrés', 'Ramírez Peña', 'Contabilidad', 'tecnologo', 'activa', 100, 40, [[-100, 1], [-70, 0], [-40, 0], [-10, 0]]],
    ['Diana Marcela', 'Torres Niño', 'Preescolar y Primera Infancia', 'tecnico', 'activa', 50, 20, [[-50, 1], [-20, 0], [10, 0]]],
    ['Juan Sebastián', 'Herrera Gil', 'Manejo de Drones', 'tecnico', 'activa', 35, 35, [[-35, 1], [-5, 1], [25, 0]]],
    ['Paola Andrea', 'Cárdenas Ruiz', 'Maquinaria Amarilla', 'tecnico', 'activa', 35, 3, [[-35, 1], [-5, 0], [25, 0]]],
    ['Miguel Ángel', 'Rojas Salazar', 'Salud Ocupacional', 'tecnico', 'activa', 27, 1, [[-27, 1], [3, 0], [33, 0]]],
    ['Yuli Katherine', 'Mendoza Parra', 'Agente de Transito', 'tecnico', 'pendiente', 1, null, [[0, 0], [30, 0], [60, 0]]],
    ['Andrés Felipe', 'Castro León', 'Seguridad Vial', 'tecnico', 'graduada', 200, 12, [[-200, 1], [-170, 1], [-140, 1]]],
    ['Luisa Fernanda', 'Prieto Díaz', 'Contabilidad', 'tecnico', 'retirada', 90, 80, [[-90, 1], [-60, 0], [-30, 0]]],
    ['Camilo Esteban', 'Ortiz Vega', 'Manejo de Drones', 'tecnico', 'activa', 75, 4, [[-75, 1], [-45, 0], [-15, 0], [15, 0]]],
    ['Sandra Milena', 'Vargas Mora', 'Preescolar y Primera Infancia', 'tecnico', 'activa', 29, 2, [[-29, 1], [1, 0], [31, 0]]],
    ['Brayan Stiven', 'Molina Cano', 'Maquinaria Amarilla', 'tecnico', 'activa', 20, 1, [[-20, 1], [10, 0]]]
];
const METODOS = ['transferencia', 'efectivo', 'consignación', 'tarjeta'];

// POST /api/demo/sembrar   body: { telefono?: '3001234567' }
export const sembrar = async (req, res) => {
    if (!habilitado()) return res.status(404).json({ error: 'Los datos de demostración no están habilitados' });

    const telefono = String(req.body?.telefono ?? '').replace(/\D/g, '');
    if (telefono && telefono.length !== 10) {
        return res.status(400).json({ error: 'El celular debe tener 10 dígitos (sin +57)' });
    }

    const conn = await pool.getConnection();
    try {
        const [ya] = await conn.query('SELECT id FROM estudiantes WHERE documento LIKE ? LIMIT 1', [`${PREFIJO}%`]);
        if (ya.length > 0) {
            return res.status(409).json({ error: 'Los datos de demostración ya están cargados. Límpielos primero si quiere cargarlos de nuevo.' });
        }

        const hoy = hoyColombia();
        const periodo = `${hoy.slice(0, 4)}-${Number(hoy.slice(5, 7)) <= 6 ? 1 : 2}`;
        await conn.beginTransaction();

        // Programas: completa los vacíos y agrega algunos tecnólogos
        for (const [nombre, nivel, meses, valor] of PROGRAMAS) {
            await conn.query('INSERT IGNORE INTO programas (nombre, nivel) VALUES (?, ?)', [nombre, nivel]);
            await conn.query(
                `UPDATE programas SET duracion_meses = COALESCE(duracion_meses, ?), valor_total = COALESCE(valor_total, ?)
                 WHERE nombre = ? AND nivel = ?`, [meses, valor, nombre, nivel]);
        }

        let n = 0;
        for (const [nombres, apellidos, programa, nivel, estado, hace, acceso, cuotas] of CASOS) {
            n++;
            const [[prog]] = await conn.query(
                'SELECT id, valor_total FROM programas WHERE nombre = ? AND nivel = ?', [programa, nivel]);
            const correo = `${nombres.split(' ')[0]}.${apellidos.split(' ')[0]}${n}@example.com`
                .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
            const [est] = await conn.query(
                `INSERT INTO estudiantes (tipo_documento, documento, nombres, apellidos, email, telefono, ciudad)
                 VALUES ('CC', ?, ?, ?, ?, ?, 'Girardot')`,
                [`${PREFIJO}${String(n).padStart(5, '0')}`, nombres, apellidos, correo, telefono || null]);

            const fecha = sumarDias(hoy, -hace);
            const ultimo = acceso === null ? null : sumarDias(hoy, -acceso);
            const total = Number(prog.valor_total || 0);
            const [mat] = await conn.query(
                `INSERT INTO matriculas (estudiante_id, programa_id, periodo, fecha_matricula, estado, valor_total, num_cuotas, ultimo_acceso)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [est.insertId, prog.id, periodo, fecha, estado, total, cuotas.length, ultimo]);

            const filas = generarCuotas(mat.insertId, total, cuotas.length, fecha);
            for (let i = 0; i < filas.length; i++) {
                const [, numero, valor] = filas[i];
                const [vence, pagada] = cuotas[i];
                const venceFecha = sumarDias(hoy, vence);
                await conn.query(
                    `INSERT INTO pagos (matricula_id, numero_cuota, valor, fecha_vencimiento, fecha_pago, metodo, estado)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [mat.insertId, numero, valor, venceFecha,
                        pagada ? (venceFecha < hoy ? venceFecha : hoy) : null,
                        pagada ? METODOS[(n + i) % METODOS.length] : null,
                        pagada ? 'pagado' : 'pendiente']);
            }
        }

        await conn.commit();
        res.status(201).json({ estudiantes: CASOS.length });
    } catch (error) {
        await conn.rollback();
        fallo(res, error);
    } finally {
        conn.release();
    }
};

// POST /api/demo/limpiar  -> borra solo los estudiantes de demostración y todo lo que cuelga de ellos
export const limpiar = async (req, res) => {
    if (!habilitado()) return res.status(404).json({ error: 'Los datos de demostración no están habilitados' });
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const patron = `${PREFIJO}%`;
        const [filas] = await conn.query(
            `SELECT m.id FROM matriculas m JOIN estudiantes e ON e.id = m.estudiante_id WHERE e.documento LIKE ?`, [patron]);
        const ids = filas.map((f) => f.id);
        if (ids.length > 0) {
            await conn.query('DELETE FROM documentos WHERE matricula_id IN (?)', [ids]);
            await conn.query('DELETE FROM pagos WHERE matricula_id IN (?)', [ids]);
            await conn.query('DELETE FROM matriculas WHERE id IN (?)', [ids]);
        }
        const [r] = await conn.query('DELETE FROM estudiantes WHERE documento LIKE ?', [patron]);
        await conn.commit();
        res.json({ eliminados: r.affectedRows });
    } catch (error) {
        await conn.rollback();
        fallo(res, error);
    } finally {
        conn.release();
    }
};
