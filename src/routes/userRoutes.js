import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/userController.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);

export default router;
