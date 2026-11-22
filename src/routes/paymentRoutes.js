import { Router } from 'express';
import express from 'express';
import {
  createCheckoutSession,
  handleStripeWebhook,
  getSubscriptionStatus,
  cancelSubscription,
  getTransactions,
} from '../controllers/paymentController.js';
import { verifyToken, requireVendor } from '../middleware/auth.js';

const router = Router();

// Stripe webhook requires the raw Buffer body for cryptographic signature verification.
router.post('/webhook', express.raw({ type: '*/*' }), handleStripeWebhook);

router.post('/create-checkout-session', verifyToken, requireVendor, createCheckoutSession);
router.get('/subscription-status', verifyToken, requireVendor, getSubscriptionStatus);
router.post('/cancel-subscription', verifyToken, requireVendor, cancelSubscription);
router.delete('/cancel-subscription', verifyToken, requireVendor, cancelSubscription);
router.get('/transactions', verifyToken, requireVendor, getTransactions);

export default router;
