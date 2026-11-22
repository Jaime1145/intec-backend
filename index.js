import express from 'express';
import cors from 'cors';
import routeUsuario from './app/routes/routes.usuario.js';
import routeAuth from './app/routes/routes.auth.js';
import routePrograma from './app/routes/routes.programa.js';
import routeEstudiante from './app/routes/routes.estudiante.js';
import routeMatricula from './app/routes/routes.matricula.js';
import routeDocumento from './app/routes/routes.documento.js';
import routeVerificacion from './app/routes/routes.verificacion.js';
import routeAlerta from './app/routes/routes.alerta.js';

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// 1. Registrar rutas de autenticación PRIMERO
app.use('/api', routeAuth);

// 2. Luego las rutas del CRUD de usuarios
app.use('/api', routeUsuario);
app.use('/api', routePrograma);
app.use('/api', routeEstudiante);
app.use('/api', routeMatricula);
app.use('/api', routeDocumento);
app.use('/', routeVerificacion);
app.use('/api', routeAlerta);

// Ruta de prueba para saber que el servidor está vivo
app.get('/', (req, res) => {
    res.send('Servidor backend de INTEC funcionando correctamente 🚀');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});