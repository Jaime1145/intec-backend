import { Router } from 'express';
import {
    listarMatriculas,
    obtenerMatricula,
    crearMatricula,
    cambiarEstado,
    pagarCuota
} from '../controllers/controller.matricula.js';
import { verificarToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/matriculas', verificarToken, listarMatriculas);
router.get('/matriculas/:id', verificarToken, obtenerMatricula);
router.post('/matriculas', verificarToken, crearMatricula);
router.put('/matriculas/:id/estado', verificarToken, cambiarEstado);
router.put('/pagos/:id/pagar', verificarToken, pagarCuota);

export default router;
