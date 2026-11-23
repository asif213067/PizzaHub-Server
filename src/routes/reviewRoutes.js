import { Router } from 'express';
import {
  addReview,
  getItemReviews,
  getVendorReviews,
  getMyReviews,
  getReviewByOrderId,
  updateReview,
  deleteReview,
  getAllReviewsAdmin,
} from '../controllers/reviewController.js';
import { verifyToken, requireCustomer, requireVendor, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public: anyone can read reviews for a menu item.
router.get('/item/:itemId', getItemReviews);

// Admin: get all customer reviews across all vendors.
router.get('/admin/all', verifyToken, requireAdmin, getAllReviewsAdmin);

// Customer: get review for a specific order.
router.get('/order/:orderId', verifyToken, requireCustomer, getReviewByOrderId);

// Customer: get all my reviews.
router.get('/my-reviews', verifyToken, requireCustomer, getMyReviews);

// Vendor: view reviews for their own products only.
router.get('/vendor', verifyToken, requireVendor, getVendorReviews);

// Customer: post a new verified-purchase review.
router.post('/', verifyToken, requireCustomer, addReview);

// Customer: edit their own review.
router.patch('/:reviewId', verifyToken, requireCustomer, updateReview);

// Customer (own) or Admin (any): delete a review.
// Role check is handled inside the controller — both roles share this route.
router.delete('/:reviewId', verifyToken, deleteReview);

export default router;
