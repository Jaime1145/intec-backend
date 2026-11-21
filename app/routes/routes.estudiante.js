import { Router } from 'express';
import {
    listarEstudiantes,
    obtenerEstudiante,
    crearEstudiante,
    actualizarEstudiante,
    eliminarEstudiante
} from '../controllers/controller.estudiante.js';
import { verificarToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/estudiantes', verificarToken, listarEstudiantes);
router.get('/estudiantes/:id', verificarToken, obtenerEstudiante);
router.post('/estudiantes', verificarToken, crearEstudiante);
router.put('/estudiantes/:id', verificarToken, actualizarEstudiante);
router.delete('/estudiantes/:id', verificarToken, eliminarEstudiante);

export default router;
