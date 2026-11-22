import { Router } from 'express';
import { formulario, verificar } from '../controllers/controller.verificacion.js';

const router = Router();

// Rutas públicas (sin token): son las que abre quien escanea el QR
router.get('/verificar', formulario);
router.get('/verificar/:codigo', verificar);

export default router;
