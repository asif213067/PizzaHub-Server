import { Router } from 'express';
import {
  toggleFavorite,
  getFavorites,
  getFavoriteIds,
} from '../controllers/favoriteController.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', getFavorites);
router.get('/ids', getFavoriteIds);
router.post('/:itemId', toggleFavorite);

export default router;
