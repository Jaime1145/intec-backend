import { Router } from 'express';
import { constancia, recibo } from '../controllers/controller.documento.js';
import { verificarToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/matriculas/:id/constancia', verificarToken, constancia);
router.get('/pagos/:id/recibo', verificarToken, recibo);

export default router;
