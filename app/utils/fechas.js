// Convierte un timestamp en segundos (UNIX_TIMESTAMP de MySQL) a 'AAAA-MM-DD' en hora de Colombia.
// UNIX_TIMESTAMP no depende de la zona horaria del servidor de base de datos, por eso es seguro.
export const fechaDesdeTimestamp = (segundos) =>
    new Date(Number(segundos) * 1000).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
