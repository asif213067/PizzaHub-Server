import { Router } from 'express';
import {
  getOverviewStats,
  getUsers,
  toggleBlockUser,
  getTransactions,
} from '../controllers/adminController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken, requireAdmin);

router.get('/overview', getOverviewStats);
router.get('/users', getUsers);
router.patch('/users/:id/block', toggleBlockUser);
router.get('/transactions', getTransactions);

export default router;
