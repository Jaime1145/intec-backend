import { Router } from 'express';
import { login } from '../controllers/controller.auth.js';

const router = Router();

// Ruta para hacer login: POST http://localhost:3000/api/login
router.post('/login', login);

export default router;