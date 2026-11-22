import { Router } from 'express';
import { listarAlertas, registrarAcceso } from '../controllers/controller.alerta.js';
import { verificarToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/alertas', verificarToken, listarAlertas);
router.put('/matriculas/:id/acceso', verificarToken, registrarAcceso);

export default router;
