// Suma meses a una fecha 'YYYY-MM-DD' sin problemas de zona horaria
export const sumarMeses = (iso, meses) => {
    const [anio, mes, dia] = iso.split('-').map(Number);
    const base = new Date(Date.UTC(anio, mes - 1 + meses, 1));
    const ultimoDia = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
    base.setUTCDate(Math.min(dia, ultimoDia));
    return base.toISOString().slice(0, 10);
};

// Fecha de hoy en Colombia: 'YYYY-MM-DD'
export const hoyColombia = () =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

// Reparte el valor total en cuotas mensuales (la última absorbe los centavos sobrantes).
// Devuelve filas listas para INSERT: [matricula_id, numero_cuota, valor, fecha_vencimiento]
export const generarCuotas = (matriculaId, total, numCuotas, fechaInicio) => {
    const totalCentavos = Math.round(total * 100);
    const base = Math.floor(totalCentavos / numCuotas);
    const resto = totalCentavos - base * numCuotas;
    const filas = [];
    for (let i = 0; i < numCuotas; i++) {
        const centavos = base + (i === numCuotas - 1 ? resto : 0);
        filas.push([matriculaId, i + 1, centavos / 100, sumarMeses(fechaInicio, i)]);
    }
    return filas;
};
