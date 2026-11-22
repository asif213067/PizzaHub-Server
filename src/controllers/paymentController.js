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
    const isPremiumActive = req.user.subscriptionPlan === 'premium' && !isExpired;

    // Prevent duplicate premium subscriptions (both Monthly and Yearly)
    if (isPremiumActive) {
      const activeCycle = req.user.billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
      return res.status(400).json({
        success: false,
        message: `You already have an active Premium subscription. Your current plan is ${activeCycle}. You can subscribe again after your current subscription expires.`,
      });
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
        // Retrieve charge receipt_url if available
        let receiptUrl = null;
        try {
          if (session.id) {
            const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
              expand: ['payment_intent.latest_charge'],
            });
            receiptUrl = fullSession.payment_intent?.latest_charge?.receipt_url || null;
          }
        } catch (rErr) {
          console.warn('[Stripe Receipt Retrieve Warning]:', rErr.message);
        }

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
            isCancelled: false,
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

        // Record completed transaction with receipt URL
        await transCol.insertOne({
          vendorId: ObjectId.isValid(vendorId) ? new ObjectId(vendorId) : vendorId,
          plan: `premium_${billingCycle}`,
          amount: (session.amount_total || (billingCycle === 'yearly' ? 28790 : 2999)) / 100,
          currency: session.currency || 'usd',
          stripeSessionId: session.id,
          stripeEventId: event.id,
          stripeSubscriptionId: session.subscription || null,
          receiptUrl,
          status: 'completed',
          createdAt: new Date(),
        });

        console.log(`[Webhook] Successfully activated Premium (${billingCycle}) for vendor ${vendorId}`);
      }
    }

    // ── Handle Subscription Deletion / Cancellation in Stripe ──────────────
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const stripeSubscriptionId = subscription.id;

      const subQuery = { stripeSubscriptionId };
      const downgradeDoc = {
        $set: {
          subscriptionPlan: 'free',
          billingCycle: null,
          isCancelled: false,
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
        note: 'Stripe subscription ended',
        createdAt: new Date(),
      });

      console.log(`[Webhook] Processed subscription expiration/deletion for ${stripeSubscriptionId}`);
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}

export async function getSubscriptionStatus(req, res, next) {
  try {
    const isExpired = req.user.subscriptionExpiresAt && new Date(req.user.subscriptionExpiresAt) < new Date();

    // Automatic expiration and downgrade to Free only after paid period ends
    if (isExpired && req.user.subscriptionPlan === 'premium') {
      const usersCol = getCollection('users');
      const userCol = getCollection('user');
      const downgradeDoc = {
        $set: {
          subscriptionPlan: 'free',
          billingCycle: null,
          isCancelled: false,
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

      const resUpdate = await usersCol.updateOne(vendorQuery, downgradeDoc);
      if (resUpdate.matchedCount === 0) {
        await userCol.updateOne(vendorQuery, downgradeDoc);
      }

      req.user.subscriptionPlan = 'free';
      req.user.billingCycle = null;
      req.user.isCancelled = false;
    }

    res.json({
      success: true,
      data: {
        subscriptionPlan: isExpired ? 'free' : (req.user.subscriptionPlan || 'free'),
        billingCycle: isExpired ? null : (req.user.billingCycle || null),
        subscriptionExpiresAt: isExpired ? null : (req.user.subscriptionExpiresAt || null),
        isCancelled: isExpired ? false : Boolean(req.user.isCancelled),
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

    if (req.user.isCancelled) {
      const expDate = req.user.subscriptionExpiresAt
        ? new Date(req.user.subscriptionExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'the end of your billing period';
      return res.status(400).json({
        success: false,
        message: `Your subscription has already been cancelled and will remain active until ${expDate}.`,
      });
    }

    // Cancel Stripe subscription object at period end if available
    if (req.user.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(req.user.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      } catch (stripeErr) {
        console.warn('[Stripe Cancel Warning] Failed to update Stripe cancel_at_period_end:', stripeErr.message);
      }
    }

    const usersCol = getCollection('users');
    const userCol = getCollection('user');
    const transCol = getCollection('transactions');

    // Cancellation preserves Premium benefits until the paid subscription period expires
    const updateDoc = {
      $set: {
        isCancelled: true,
        cancelledAt: new Date(),
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

    // Calculate approximate remaining time for clear messaging
    const expiresAt = req.user.subscriptionExpiresAt ? new Date(req.user.subscriptionExpiresAt) : null;
    const diffDays = expiresAt ? Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 30;
    const isYearly = req.user.billingCycle === 'yearly';

    let remainingText = '';
    if (isYearly) {
      const monthsLeft = Math.ceil(diffDays / 30);
      remainingText = monthsLeft > 1 ? `approximately ${monthsLeft} months` : `${diffDays} days`;
    } else {
      remainingText = `${diffDays} days`;
    }

    const planLabel = isYearly ? 'Premium Yearly' : 'Premium Monthly';

    // Log the cancellation audit event in transactions
    await transCol.insertOne({
      vendorId: ObjectId.isValid(req.user._id) ? new ObjectId(req.user._id) : req.user._id,
      plan: `premium_${req.user.billingCycle || 'monthly'}`,
      amount: 0,
      currency: 'usd',
      status: 'cancelled',
      note: `Subscription cancelled by vendor; remains active until ${expiresAt ? expiresAt.toLocaleDateString() : 'expiry'}`,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      message: `Your ${planLabel} subscription has been cancelled. You still have ${remainingText} of Premium access remaining. Your account will return to the Free plan when your subscription period expires.`,
      data: {
        subscriptionPlan: 'premium',
        billingCycle: req.user.billingCycle,
        subscriptionExpiresAt: req.user.subscriptionExpiresAt,
        isCancelled: true,
      },
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

    // Format transactions with receipt URLs
    const formatted = await Promise.all(
      rawTxs.map(async (tx) => {
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

        // Lazy fetch receipt URL for Stripe sessions if not yet cached in DB
        let receiptUrl = tx.receiptUrl || null;
        if (!receiptUrl && tx.stripeSessionId && status === 'paid') {
          try {
            const session = await stripe.checkout.sessions.retrieve(tx.stripeSessionId, {
              expand: ['payment_intent.latest_charge'],
            });
            receiptUrl = session.payment_intent?.latest_charge?.receipt_url || null;
            if (receiptUrl) {
              await transCol.updateOne({ _id: tx._id }, { $set: { receiptUrl } });
            }
          } catch {
            // Silently ignore if Stripe retrieval fails
          }
        }

        return {
          id: tx._id.toString(),
          date: dateFormatted,
          plan: planLabel,
          amount: amountFormatted,
          status,
          stripeSessionId: tx.stripeSessionId || null,
          receiptUrl,
          createdAt: tx.createdAt,
        };
      })
    );

    res.json({
      success: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error) {
    next(error);
  }
}
