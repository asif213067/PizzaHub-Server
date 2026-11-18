import { Router } from 'express';
import {
  createOrder,
  getCustomerOrders,
  cancelOrder,
  getVendorOrders,
  updateOrderStatusVendor,
  getOrderById,
} from '../controllers/orderController.js';
import { verifyToken, requireVendor } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.post('/', createOrder);
router.get('/my-orders', getCustomerOrders);
router.get('/vendor-orders', requireVendor, getVendorOrders);
router.get('/:id', getOrderById);
router.patch('/:id/cancel', cancelOrder);
router.patch('/:id/status', requireVendor, updateOrderStatusVendor);

export default router;
