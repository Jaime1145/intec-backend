import { Router } from 'express';
import { sembrar, limpiar } from '../controllers/controller.demo.js';
import { verificarToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/demo/sembrar', verificarToken, sembrar);
router.post('/demo/limpiar', verificarToken, limpiar);

export default router;
