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

// Reparte el valor total en cuotas mensuales de pesos enteros: los pesos que sobran se suman de a uno
// a las primeras cuotas (800.000 en 3 -> 266.667, 266.667, 266.666). Los centavos, si el valor total
// los trae, quedan en la última cuota.
// Devuelve filas listas para INSERT: [matricula_id, numero_cuota, valor, fecha_vencimiento]
export const generarCuotas = (matriculaId, total, numCuotas, fechaInicio) => {
    const totalCentavos = Math.round(total * 100);
    const basePesos = Math.floor(totalCentavos / (100 * numCuotas));
    const resto = totalCentavos - basePesos * 100 * numCuotas;
    const pesosExtra = Math.floor(resto / 100);
    const centavosSueltos = resto % 100;
    const filas = [];
    for (let i = 0; i < numCuotas; i++) {
        const centavos = basePesos * 100
            + (i < pesosExtra ? 100 : 0)
            + (i === numCuotas - 1 ? centavosSueltos : 0);
        filas.push([matriculaId, i + 1, centavos / 100, sumarMeses(fechaInicio, i)]);
    }
    return filas;
};
