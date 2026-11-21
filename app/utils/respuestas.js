// Responde un error 500 mostrando siempre un mensaje (aunque el error venga vacío)
export const fallo = (res, error) => {
    console.error(error);
    res.status(500).json({ error: error.message || error.code || String(error) });
};
