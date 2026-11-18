import { Router } from 'express';
import { createToken, getMe } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.post('/jwt', createToken);
router.get('/me', verifyToken, getMe);

export default router;
