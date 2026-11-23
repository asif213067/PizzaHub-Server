import { Router } from 'express';
import {
  getOverviewStats,
  getUsers,
  toggleBlockUser,
  getTransactions,
} from '../controllers/adminController.js';
import {
  getAllReviewsAdmin,
  deleteReview,
} from '../controllers/reviewController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken, requireAdmin);

router.get('/overview', getOverviewStats);
router.get('/users', getUsers);
router.patch('/users/:id/block', toggleBlockUser);
router.get('/transactions', getTransactions);
router.get('/reviews', getAllReviewsAdmin);
router.delete('/reviews/:reviewId', deleteReview);

export default router;
