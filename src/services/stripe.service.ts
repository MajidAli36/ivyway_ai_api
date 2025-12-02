import Stripe from 'stripe';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { AppError } from '../middlewares/error.middleware';
import { SubscriptionPlan, PaymentStatus } from '../types/prisma.types';

// Prisma client types are correctly generated with stripeCustomerId and subscriptionPlan fields

if (!env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
});

// Plan pricing in cents
export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  GUEST: 0,
  FREE: 0,
  PRO: 1299, // $12.99
  PREMIUM: 2999, // $29.99
};

/**
 * Get or create Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  // Check if customer already exists in User table
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true, stripeCustomerId: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.fullName,
    metadata: {
      userId,
    },
  });

  // Store in User table
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
  userId: string,
  plan: SubscriptionPlan,
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId: string; url: string }> {
  if (plan === 'GUEST' || plan === 'FREE') {
    throw new AppError('Cannot create checkout session for free plans', 400);
  }

  const priceInCents = PLAN_PRICES[plan];
  if (!priceInCents) {
    throw new AppError('Invalid plan selected', 400);
  }

  // Get or create Stripe customer
  const customerId = await getOrCreateStripeCustomer(userId);

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'], // Apple Pay is supported automatically when 'card' is included
    mode: 'subscription',
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${plan} Plan - IvyWay AI`,
            description: getPlanDescription(plan),
          },
          recurring: {
            interval: 'month',
          },
          unit_amount: priceInCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      plan,
    },
    subscription_data: {
      metadata: {
        userId,
        plan,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return {
    sessionId: session.id,
    url: session.url || '',
  };
}

/**
 * Create a Stripe Customer Portal session for managing subscription
 */
export async function createPortalSession(
  userId: string,
  returnUrl: string
): Promise<{ url: string }> {
  // Get Stripe customer ID from User table
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user || !user.stripeCustomerId) {
    throw new AppError('No Stripe customer found. Please subscribe first.', 404);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl,
  });

  return {
    url: session.url,
  };
}


/**
 * Map Stripe payment status to our enum
 */
function mapPaymentStatus(status: string): PaymentStatus {
  switch (status) {
    case 'succeeded':
      return 'SUCCEEDED';
    case 'pending':
      return 'PENDING';
    case 'failed':
      return 'FAILED';
    case 'canceled':
      return 'CANCELED';
    case 'refunded':
      return 'REFUNDED';
    case 'partially_refunded':
      return 'PARTIALLY_REFUNDED';
    default:
      return 'PENDING';
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhook(
  event: Stripe.Event
): Promise<{ processed: boolean; message: string }> {
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        return { processed: true, message: 'Checkout completed' };
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreatedOrUpdated(subscription);
        return { processed: true, message: 'Subscription updated' };
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        return { processed: true, message: 'Subscription deleted' };
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        return { processed: true, message: 'Payment succeeded' };
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        return { processed: true, message: 'Payment failed' };
      }

      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntent(paymentIntent);
        return { processed: true, message: 'Payment intent processed' };
      }

      default:
        return { processed: false, message: `Unhandled event type: ${event.type}` };
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    throw error;
  }
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan as SubscriptionPlan;

  if (!userId || !plan) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  // Update user's Stripe customer ID if not set
  if (session.customer && typeof session.customer === 'string') {
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: session.customer,
      },
    });
  }

  // If subscription was created, fetch it from Stripe
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await handleSubscriptionCreatedOrUpdated(subscription);
  } else {
    // Update user subscription directly (one-time payment)
    const now = new Date();
    const subscriptionEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: plan,
        subscriptionStart: now,
        subscriptionEnd: subscriptionEnd,
      },
    });
  }
}

/**
 * Handle subscription created or updated
 */
async function handleSubscriptionCreatedOrUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const plan = subscription.metadata?.plan as SubscriptionPlan;

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  // Determine plan from subscription if not in metadata
  const subscriptionPlan = plan || (subscription.items.data[0]?.price.unit_amount === 1299 ? 'PRO' : 'PREMIUM');

  // Update user subscription and customer ID
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: subscription.customer as string,
      subscriptionPlan: subscriptionPlan,
      subscriptionStart: new Date((subscription as any).current_period_start * 1000),
      subscriptionEnd: new Date((subscription as any).current_period_end * 1000),
    },
  });
}

/**
 * Handle subscription deleted (cancelled)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Find user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: subscription.customer as string },
  });

  if (user) {
    // Downgrade to FREE plan
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: 'FREE',
        subscriptionEnd: null,
      },
    });
  }
}

/**
 * Handle payment succeeded
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error('User not found for invoice:', invoice.id);
    return;
  }

  // Determine plan from subscription or invoice metadata
  const subscriptionId = (invoice as any).subscription as string | null;
  let plan: SubscriptionPlan | null = null;
  
  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      plan = subscription.items.data[0]?.price.unit_amount === 1299 ? 'PRO' : 'PREMIUM';
    } catch (error) {
      console.error('Error retrieving subscription:', error);
    }
  }

  // Create or update payment record
  const paymentIntentId = (invoice as any).payment_intent as string | null;
  const amount = invoice.amount_paid || invoice.amount_due;
  const currency = invoice.currency || 'usd';

  if (paymentIntentId) {
    await prisma.payment.upsert({
      where: { stripePaymentIntentId: paymentIntentId },
      create: {
        userId: user.id,
        stripeCustomerId: customerId,
        stripePaymentIntentId: paymentIntentId,
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId: subscriptionId,
        subscriptionPlan: plan,
        amount,
        currency,
        status: 'SUCCEEDED',
        description: invoice.description || `Subscription payment for ${invoice.id}`,
        paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : new Date(),
        metadata: invoice.metadata as any,
      },
      update: {
        status: 'SUCCEEDED',
        subscriptionPlan: plan,
        paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : new Date(),
      },
    });
  }
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error('User not found for invoice:', invoice.id);
    return;
  }

  const paymentIntentId = (invoice as any).payment_intent as string | null;
  const amount = invoice.amount_due;
  const currency = invoice.currency || 'usd';

  if (paymentIntentId) {
    await prisma.payment.upsert({
      where: { stripePaymentIntentId: paymentIntentId },
      create: {
        userId: user.id,
        stripeCustomerId: customerId,
        stripePaymentIntentId: paymentIntentId,
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId: (invoice as any).subscription as string | null,
        amount,
        currency,
        status: 'FAILED',
        description: invoice.description || `Failed payment for ${invoice.id}`,
        failedAt: new Date(),
        metadata: invoice.metadata as any,
      },
      update: {
        status: 'FAILED',
        failedAt: new Date(),
      },
    });
  }
}


/**
 * Handle payment intent events
 */
async function handlePaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  // Find user by payment intent customer ID
  const customerId = paymentIntent.customer as string;
  if (!customerId) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    return;
  }

  const status = mapPaymentStatus(paymentIntent.status);
  const amount = paymentIntent.amount;
  const currency = paymentIntent.currency;

  // Determine plan from metadata if available
  const plan = paymentIntent.metadata?.plan as SubscriptionPlan | undefined;

  await prisma.payment.upsert({
    where: { stripePaymentIntentId: paymentIntent.id },
    create: {
      userId: user.id,
      stripeCustomerId: customerId,
      stripePaymentIntentId: paymentIntent.id,
      subscriptionPlan: plan || null,
      amount,
      currency,
      status,
      description: paymentIntent.description || `Payment ${paymentIntent.id}`,
      paidAt: status === 'SUCCEEDED' ? new Date() : null,
      failedAt: status === 'FAILED' ? new Date() : null,
      metadata: paymentIntent.metadata as any,
    },
    update: {
      status,
      subscriptionPlan: plan || undefined,
      paidAt: status === 'SUCCEEDED' ? new Date() : null,
      failedAt: status === 'FAILED' ? new Date() : null,
    },
  });
}

/**
 * Get plan description
 */
function getPlanDescription(plan: SubscriptionPlan): string {
  switch (plan) {
    case 'PRO':
      return '500 monthly requests, faster processing, all agents, 50 MB file uploads';
    case 'PREMIUM':
      return 'Unlimited requests, fastest processing, custom agents, 200 MB file uploads';
    default:
      return '';
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  );
}
