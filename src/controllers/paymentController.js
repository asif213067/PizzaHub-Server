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

    const { billingCycle = 'monthly' } = req.body;
    const isYearly = billingCycle === 'yearly';

    const isExpired = req.user.subscriptionExpiresAt && new Date(req.user.subscriptionExpiresAt) < new Date();
    // Only block if they already have an active, non-expired subscription for the same billing cycle
    if (req.user.subscriptionPlan === 'premium' && !isExpired && req.user.subscriptionExpiresAt) {
      if (req.user.billingCycle === (isYearly ? 'yearly' : 'monthly')) {
        return res.status(400).json({
          success: false,
          message: `You already have an active ${isYearly ? 'Yearly' : 'Monthly'} Premium vendor subscription`,
        });
      }
    }

    // Pricing: Monthly is $29.99 (2999 cents); Yearly is $287.90 (28790 cents, 20% off).
    const planName = isYearly ? 'PizzaHub Premium (Yearly - 20% Off)' : 'PizzaHub Premium (Monthly)';
    const planDescription = isYearly
      ? 'Full 1-year access to unlimited menu items, premium vendor badge, and featured homepage placement (Save 20%)'
      : '30-day access to unlimited menu items, premium vendor badge, and featured homepage placement';
    const amountInCents = isYearly ? 28790 : 2999;

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer_email: req.user.email || undefined,
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
    if (webhookSecret && sig) {
      // Cryptographic verification ensures the webhook originated directly from Stripe.
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else if (!webhookSecret && process.env.NODE_ENV !== 'production') {
      console.warn('[Webhook Warning] STRIPE_WEBHOOK_SECRET not provided, parsing raw body directly for development.');
      event = JSON.parse(req.body.toString('utf8'));
    } else {
      return res.status(400).send('Webhook secret or signature missing');
    }
  } catch (err) {
    console.error(`[Webhook Error] Signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  try {
    const transCol = getCollection('transactions');
    const usersCol = getCollection('users');
    const userCol = getCollection('user');

    // ── Idempotency Check ──────────────────────────────────────────────────
    // Avoid double-processing the same webhook event or session
    if (event.id) {
      const existingEvent = await transCol.findOne({
        $or: [
          { stripeEventId: event.id },
          ...(event.data?.object?.id ? [{ stripeSessionId: event.data.object.id }] : []),
        ],
      });

      if (existingEvent) {
        console.log(`[Webhook] Event ${event.id} already processed. Skipping duplicate execution.`);
        return res.json({ received: true, alreadyProcessed: true });
      }
    }

    // ── Handle Checkout Session Completed ──────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const vendorId = session.metadata?.vendorId;
      const billingCycle = session.metadata?.billingCycle || 'monthly';

      if (vendorId) {
        // Yearly plans grant 365 days of premium access; monthly plans grant 30 days.
        const durationDays = billingCycle === 'yearly' ? 365 : 30;
        const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

        let vendorQuery = { _id: vendorId };
        if (ObjectId.isValid(vendorId)) {
          vendorQuery = {
            $or: [
              { _id: new ObjectId(vendorId) },
              { _id: vendorId },
              ...(session.metadata?.vendorEmail ? [{ email: session.metadata.vendorEmail }] : []),
            ],
          };
        }

        const updateDoc = {
          $set: {
            subscriptionPlan: 'premium',
            billingCycle,
            subscriptionExpiresAt: expiresAt,
            stripeCustomerId: session.customer || null,
            stripeSubscriptionId: session.subscription || null,
            updatedAt: new Date(),
          },
        };

        // Update in primary 'users' collection or fallback 'user' collection (Better Auth)
        const updateResult = await usersCol.updateOne(vendorQuery, updateDoc);
        if (updateResult.matchedCount === 0) {
          await userCol.updateOne(vendorQuery, updateDoc);
        }

        // Record completed transaction
        await transCol.insertOne({
          vendorId: ObjectId.isValid(vendorId) ? new ObjectId(vendorId) : vendorId,
          plan: `premium_${billingCycle}`,
          amount: (session.amount_total || (billingCycle === 'yearly' ? 28790 : 2999)) / 100,
          currency: session.currency || 'usd',
          stripeSessionId: session.id,
          stripeEventId: event.id,
          stripeSubscriptionId: session.subscription || null,
          status: 'completed',
          createdAt: new Date(),
        });

        console.log(`[Webhook] Successfully activated Premium (${billingCycle}) for vendor ${vendorId}`);
      }
    }

    // ── Handle Subscription Deletion / Cancellation ────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const stripeSubscriptionId = subscription.id;

      const subQuery = { stripeSubscriptionId };
      const downgradeDoc = {
        $set: {
          subscriptionPlan: 'free',
          billingCycle: null,
          subscriptionExpiresAt: null,
          updatedAt: new Date(),
        },
      };

      await usersCol.updateMany(subQuery, downgradeDoc);
      await userCol.updateMany(subQuery, downgradeDoc);

      await transCol.insertOne({
        stripeSubscriptionId,
        stripeEventId: event.id,
        plan: 'free',
        amount: 0,
        currency: 'usd',
        status: 'cancelled',
        note: 'Stripe subscription cancelled',
        createdAt: new Date(),
      });

      console.log(`[Webhook] Processed subscription cancellation for ${stripeSubscriptionId}`);
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}

export async function getSubscriptionStatus(req, res, next) {
  try {
    const isExpired = req.user.subscriptionExpiresAt && new Date(req.user.subscriptionExpiresAt) < new Date();

    // If subscription has expired, update database to reflect free status
    if (isExpired && req.user.subscriptionPlan === 'premium') {
      const usersCol = getCollection('users');
      const userCol = getCollection('user');
      const downgradeDoc = {
        $set: {
          subscriptionPlan: 'free',
          billingCycle: null,
          updatedAt: new Date(),
        },
      };

      let vendorQuery = { _id: req.user._id };
      if (ObjectId.isValid(req.user._id)) {
        vendorQuery = { $or: [{ _id: new ObjectId(req.user._id) }, { _id: req.user._id }] };
      }

      const resUpdate = await usersCol.updateOne(vendorQuery, downgradeDoc);
      if (resUpdate.matchedCount === 0) {
        await userCol.updateOne(vendorQuery, downgradeDoc);
      }

      req.user.subscriptionPlan = 'free';
      req.user.billingCycle = null;
    }

    res.json({
      success: true,
      data: {
        subscriptionPlan: isExpired ? 'free' : (req.user.subscriptionPlan || 'free'),
        billingCycle: isExpired ? null : (req.user.billingCycle || null),
        subscriptionExpiresAt: isExpired ? null : (req.user.subscriptionExpiresAt || null),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelSubscription(req, res, next) {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can manage subscription plans',
      });
    }

    const isExpired = req.user.subscriptionExpiresAt && new Date(req.user.subscriptionExpiresAt) < new Date();
    const isPremium = req.user.subscriptionPlan === 'premium' && !isExpired;

    if (!isPremium) {
      return res.status(400).json({
        success: false,
        message: 'You do not have an active Premium subscription to cancel',
      });
    }

    // Cancel Stripe subscription object if available
    if (req.user.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(req.user.stripeSubscriptionId);
      } catch (stripeErr) {
        console.warn('[Stripe Cancel Warning] Failed to cancel on Stripe:', stripeErr.message);
      }
    }

    const usersCol = getCollection('users');
    const userCol = getCollection('user');
    const transCol = getCollection('transactions');

    const updateDoc = {
      $set: {
        subscriptionPlan: 'free',
        billingCycle: null,
        subscriptionExpiresAt: null,
        updatedAt: new Date(),
      },
    };

    let vendorQuery = { _id: req.user._id };
    if (ObjectId.isValid(req.user._id)) {
      vendorQuery = {
        $or: [
          { _id: new ObjectId(req.user._id) },
          { _id: req.user._id.toString() },
          { email: req.user.email },
        ],
      };
    }

    const updateResult = await usersCol.updateOne(vendorQuery, updateDoc);
    if (updateResult.matchedCount === 0) {
      await userCol.updateOne(vendorQuery, updateDoc);
    }

    // Log the cancellation event in transactions
    await transCol.insertOne({
      vendorId: ObjectId.isValid(req.user._id) ? new ObjectId(req.user._id) : req.user._id,
      plan: 'free',
      amount: 0,
      currency: 'usd',
      status: 'cancelled',
      note: 'Subscription downgraded to Free plan by vendor',
      createdAt: new Date(),
    });

    res.json({
      success: true,
      message: 'Subscription successfully downgraded to Free plan',
    });
  } catch (error) {
    next(error);
  }
}

export async function getTransactions(req, res, next) {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can access transaction history',
      });
    }

    const transCol = getCollection('transactions');
    const vendorId = req.user._id;

    const query = {
      $or: [
        { vendorId },
        { vendorId: vendorId.toString() },
      ],
    };
    if (ObjectId.isValid(vendorId)) {
      query.$or.push({ vendorId: new ObjectId(vendorId) });
    }

    const rawTxs = await transCol
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const formatted = rawTxs.map((tx) => {
      let planLabel = 'Free Plan';
      if (tx.plan === 'premium_yearly') planLabel = 'Premium Yearly';
      else if (tx.plan === 'premium_monthly') planLabel = 'Premium Monthly';
      else if (tx.plan) planLabel = tx.plan;

      let status = 'paid';
      if (tx.status === 'completed' || tx.status === 'paid') status = 'paid';
      else if (tx.status === 'cancelled' || tx.status === 'failed') status = 'failed';
      else if (tx.status === 'pending') status = 'pending';

      const amountFormatted = typeof tx.amount === 'number'
        ? `$${tx.amount.toFixed(2)}`
        : (tx.amount || '$0.00');

      const dateFormatted = tx.createdAt
        ? new Date(tx.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '—';

      return {
        id: tx._id.toString(),
        date: dateFormatted,
        plan: planLabel,
        amount: amountFormatted,
        status,
        stripeSessionId: tx.stripeSessionId || null,
        createdAt: tx.createdAt,
      };
    });

    res.json({
      success: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error) {
    next(error);
  }
}
