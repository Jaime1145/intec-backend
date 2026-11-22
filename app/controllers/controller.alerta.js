import { pool } from '../config/db.js';
import { fallo } from '../utils/respuestas.js';
import { hoyColombia } from '../utils/cuotas.js';

// ---------------- Reglas de riesgo (fáciles de explicar y de cambiar) ----------------
// Cada situación suma puntos, y el total define el nivel:
//   4 o más = ALTO · 2 o 3 = MEDIO · 1 = BAJO
// Mora (cuota vencida sin pagar):  1 a 14 días = 1 · 15 a 29 = 2 · 30 a 59 = 3 · 60 o más = 4
// Sin ingresar a clases (solo matrículas activas): 15 a 29 días = 2 · 30 o más = 3
// Preventivo: sin riesgo, pero la próxima cuota vence en los próximos 7 días.
const DIAS_PREVENTIVO = 7;
const ORDEN = { alto: 0, medio: 1, bajo: 2, preventivo: 3 };

const puntosMora = (d) => (d >= 60 ? 4 : d >= 30 ? 3 : d >= 15 ? 2 : d >= 1 ? 1 : 0);
const puntosIngreso = (d) => (d >= 30 ? 3 : d >= 15 ? 2 : 0);

// Días entre dos fechas 'AAAA-MM-DD' (sin pasar por zonas horarias)
const dias = (desde, hasta) => {
    const [a1, m1, d1] = String(desde).slice(0, 10).split('-').map(Number);
    const [a2, m2, d2] = String(hasta).slice(0, 10).split('-').map(Number);
    return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
};

const plural = (n, uno, varios) => (n === 1 ? uno : varios);
const dinero = (n) => '$' + Number(n || 0).toLocaleString('es-CO');

// GET /api/alertas
export const listarAlertas = async (req, res) => {
    try {
        const hoy = hoyColombia();
        const [rows] = await pool.query(`
            SELECT m.id AS matricula_id, m.estado, m.periodo, m.fecha_matricula, m.ultimo_acceso,
                   e.id AS estudiante_id, e.nombres, e.apellidos, e.documento, e.telefono, e.email,
                   p.nombre AS programa, p.nivel AS nivel_programa,
                   COALESCE(SUM(CASE WHEN pg.estado = 'pendiente' AND pg.fecha_vencimiento < ? THEN 1 END), 0) AS cuotas_vencidas,
                   COALESCE(SUM(CASE WHEN pg.estado = 'pendiente' AND pg.fecha_vencimiento < ? THEN pg.valor END), 0) AS valor_vencido,
                   MIN(CASE WHEN pg.estado = 'pendiente' AND pg.fecha_vencimiento < ? THEN pg.fecha_vencimiento END) AS vencida_desde,
                   MIN(CASE WHEN pg.estado = 'pendiente' AND pg.fecha_vencimiento >= ? THEN pg.fecha_vencimiento END) AS proxima_cuota,
                   (SELECT x.valor FROM pagos x
                     WHERE x.matricula_id = m.id AND x.estado = 'pendiente' AND x.fecha_vencimiento >= ?
                     ORDER BY x.fecha_vencimiento LIMIT 1) AS proxima_valor
            FROM matriculas m
            JOIN estudiantes e ON e.id = m.estudiante_id
            JOIN programas p ON p.id = m.programa_id
            LEFT JOIN pagos pg ON pg.matricula_id = m.id
            WHERE m.estado IN ('pendiente', 'activa')
            GROUP BY m.id, e.id, p.id`, [hoy, hoy, hoy, hoy, hoy]);

        const alertas = [];
        for (const r of rows) {
            const cuotasVencidas = Number(r.cuotas_vencidas);
            const diasMora = r.vencida_desde ? Math.max(0, dias(r.vencida_desde, hoy)) : 0;
            const baseIngreso = r.ultimo_acceso || r.fecha_matricula;
            const diasSinIngreso = Math.max(0, dias(baseIngreso, hoy));
            const diasParaVencer = r.proxima_cuota ? dias(hoy, r.proxima_cuota) : null;

            const ptsMora = cuotasVencidas > 0 ? puntosMora(diasMora) : 0;
            const ptsIngreso = r.estado === 'activa' ? puntosIngreso(diasSinIngreso) : 0;
            const puntos = ptsMora + ptsIngreso;
            const porVencer = diasParaVencer !== null && diasParaVencer <= DIAS_PREVENTIVO;

            let nivel = puntos >= 4 ? 'alto' : puntos >= 2 ? 'medio' : puntos >= 1 ? 'bajo' : (porVencer ? 'preventivo' : null);
            if (!nivel) continue;

            const motivos = [];
            if (ptsMora > 0) {
                motivos.push(`${cuotasVencidas} ${plural(cuotasVencidas, 'cuota vencida', 'cuotas vencidas')} · ${diasMora} ${plural(diasMora, 'día', 'días')} de mora · ${dinero(r.valor_vencido)}`);
            }
            if (ptsIngreso > 0) {
                motivos.push(r.ultimo_acceso
                    ? `${diasSinIngreso} días sin ingresar a clases (último ingreso: ${String(r.ultimo_acceso).slice(0, 10)})`
                    : `Sin registro de ingreso desde la matrícula (${diasSinIngreso} días)`);
            }
            if (porVencer && ptsMora === 0) {
                motivos.push(diasParaVencer === 0
                    ? `Una cuota vence hoy (${dinero(r.proxima_valor)})`
                    : `Próxima cuota vence en ${diasParaVencer} ${plural(diasParaVencer, 'día', 'días')} (${dinero(r.proxima_valor)})`);
            }

            alertas.push({
                matricula_id: r.matricula_id,
                estudiante_id: r.estudiante_id,
                nombres: r.nombres,
                apellidos: r.apellidos,
                documento: r.documento,
                telefono: r.telefono,
                email: r.email,
                programa: r.programa,
                nivel_programa: r.nivel_programa,
                periodo: r.periodo,
                estado: r.estado,
                nivel,
                puntos,
                motivos,
                por_mora: ptsMora > 0,
                por_ingreso: ptsIngreso > 0,
                por_vencer: porVencer && ptsMora === 0,
                cuotas_vencidas: cuotasVencidas,
                dias_mora: diasMora,
                valor_vencido: Number(r.valor_vencido),
                dias_sin_ingreso: diasSinIngreso,
                ultimo_acceso: r.ultimo_acceso ? String(r.ultimo_acceso).slice(0, 10) : null,
                proxima_cuota: r.proxima_cuota ? String(r.proxima_cuota).slice(0, 10) : null,
                proxima_valor: r.proxima_valor === null ? null : Number(r.proxima_valor)
            });
        }

        alertas.sort((a, b) =>
            ORDEN[a.nivel] - ORDEN[b.nivel] || b.puntos - a.puntos || b.dias_mora - a.dias_mora);

        const resumen = { alto: 0, medio: 0, bajo: 0, preventivo: 0, total: alertas.length, valor_vencido: 0 };
        for (const a of alertas) {
            resumen[a.nivel] += 1;
            resumen.valor_vencido += a.valor_vencido;
        }
        res.json({ fecha: hoy, resumen, alertas });
    } catch (error) {
        fallo(res, error);
    }
};

// PUT /api/matriculas/:id/acceso  (body opcional: { fecha: 'AAAA-MM-DD' }; por defecto, hoy)
export const registrarAcceso = async (req, res) => {
    try {
        const hoy = hoyColombia();
        const fecha = req.body?.fecha || hoy;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({ error: 'fecha debe tener formato AAAA-MM-DD' });
        }
        if (fecha > hoy) {
            return res.status(400).json({ error: 'La fecha de ingreso no puede ser futura' });
        }
        const [r] = await pool.query('UPDATE matriculas SET ultimo_acceso = ? WHERE id = ?', [fecha, req.params.id]);
        if (r.affectedRows === 0) return res.status(404).json({ error: 'Matrícula no encontrada' });
        res.json({ message: 'Ingreso registrado correctamente', ultimo_acceso: fecha });
    } catch (error) {
        fallo(res, error);
    }
};
