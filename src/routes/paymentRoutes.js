import { Router } from 'express';
import express from 'express';
import {
  createCheckoutSession,
  handleStripeWebhook,
  getSubscriptionStatus,
} from '../controllers/paymentController.js';
import { verifyToken, requireVendor } from '../middleware/auth.js';

const router = Router();

// Stripe webhook requires the raw Buffer body for cryptographic signature verification.
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

router.post('/create-checkout-session', verifyToken, requireVendor, createCheckoutSession);
router.get('/subscription-status', verifyToken, requireVendor, getSubscriptionStatus);

export default router;
