import Stripe from 'stripe';
import { ObjectId } from 'mongodb';
import { getCollection } from '../config/db.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function createCheckoutSession(req, res, next) {
  try {
    // Only vendors are eligible to purchase premium restaurant subscriptions.
    if (req.user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can purchase premium subscriptions',
      });
    }

    if (req.user.subscriptionPlan === 'premium') {
      return res.status(400).json({
        success: false,
        message: 'You already have an active Premium vendor subscription',
      });
    }

    const { billingCycle = 'monthly' } = req.body;
    const isYearly = billingCycle === 'yearly';

    // Pricing: Monthly is $29.99 (2999 cents); Yearly is $287.90 (28790 cents, 20% off).
    const planName = isYearly ? 'PizzaHub Premium (Yearly - 20% Off)' : 'PizzaHub Premium (Monthly)';
    const planDescription = isYearly
      ? 'Full 1-year access to unlimited menu items, premium vendor badge, and featured homepage placement (Save 20%)'
      : '30-day access to unlimited menu items, premium vendor badge, and featured homepage placement';
    const amountInCents = isYearly ? 28790 : 2999;

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planName,
              description: planDescription,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Metadata links this payment and billing interval directly to the vendor's database ID.
      metadata: {
        vendorId: req.user._id.toString(),
        vendorEmail: req.user.email,
        plan: 'premium',
        billingCycle: isYearly ? 'yearly' : 'monthly',
      },
      success_url: `${clientUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/payment-cancel`,
    });

    res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      billingCycle: isYearly ? 'yearly' : 'monthly',
      amount: amountInCents / 100,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleStripeWebhook(req, res, next) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Cryptographic verification ensures the webhook originated directly from Stripe.
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  try {
    // Premium access is granted strictly upon verified payment completion, never via client redirects.
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const vendorId = session.metadata?.vendorId;
      const billingCycle = session.metadata?.billingCycle || 'monthly';

      if (vendorId) {
        const usersCol = getCollection('users');
        const transCol = getCollection('transactions');

        // Yearly plans grant 365 days of premium access; monthly plans grant 30 days.
        const durationDays = billingCycle === 'yearly' ? 365 : 30;
        const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

        let vendorQuery = { _id: vendorId };
        if (ObjectId.isValid(vendorId)) {
          vendorQuery = { $or: [{ _id: new ObjectId(vendorId) }, { _id: vendorId }] };
        }

        await usersCol.updateOne(vendorQuery, {
          $set: {
            subscriptionPlan: 'premium',
            billingCycle,
            subscriptionExpiresAt: expiresAt,
            updatedAt: new Date(),
          },
        });

        await transCol.insertOne({
          vendorId: ObjectId.isValid(vendorId) ? new ObjectId(vendorId) : vendorId,
          plan: `premium_${billingCycle}`,
          amount: (session.amount_total || (billingCycle === 'yearly' ? 28790 : 2999)) / 100,
          currency: session.currency || 'usd',
          stripeSessionId: session.id,
          stripeSubscriptionId: session.subscription || null,
          status: 'completed',
          createdAt: new Date(),
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}

export async function getSubscriptionStatus(req, res, next) {
  try {
    res.json({
      success: true,
      data: {
        subscriptionPlan: req.user.subscriptionPlan || 'free',
        billingCycle: req.user.billingCycle || null,
        subscriptionExpiresAt: req.user.subscriptionExpiresAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
}
