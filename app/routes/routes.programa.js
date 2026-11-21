import { Router } from 'express';
import { listarProgramas, crearPrograma, actualizarPrograma } from '../controllers/controller.programa.js';
import { verificarToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/programas', verificarToken, listarProgramas);
router.post('/programas', verificarToken, crearPrograma);
router.put('/programas/:id', verificarToken, actualizarPrograma);

export default router;
