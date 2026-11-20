import { Router } from 'express';
import {
  getPublicMenuItems,
  getMenuItemById,
  getRelatedMenuItems,
  getVendorMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getAllMenuItemsAdmin,
  updateMenuItemStatus,
} from '../controllers/menuController.js';
import { verifyToken, requireVendor, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public routes
router.get('/', getPublicMenuItems);
router.get('/vendor/my-items', verifyToken, requireVendor, getVendorMenuItems);
router.get('/admin/all', verifyToken, requireAdmin, getAllMenuItemsAdmin);
router.get('/:id/related', getRelatedMenuItems);
router.get('/:id', getMenuItemById);

// Protected mutations
router.post('/', verifyToken, requireVendor, createMenuItem);
router.put('/:id', verifyToken, updateMenuItem);
router.delete('/:id', verifyToken, deleteMenuItem);
router.patch('/:id/status', verifyToken, requireAdmin, updateMenuItemStatus);

export default router;
