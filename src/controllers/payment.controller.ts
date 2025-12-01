import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as stripeService from '../services/stripe.service';
import * as paymentService from '../services/payment.service';
import { SubscriptionPlan } from '../types/prisma.types';
import { AppError } from '../middlewares/error.middleware';

/**
 * Create Stripe Checkout session
 */
export async function createCheckoutSession(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = req.user.userId;
  const { plan, successUrl, cancelUrl } = req.body;

  if (!plan || !['PRO', 'PREMIUM'].includes(plan)) {
    throw new AppError('Invalid plan. Must be PRO or PREMIUM', 400);
  }

  if (!successUrl || !cancelUrl) {
    throw new AppError('successUrl and cancelUrl are required', 400);
  }

  const session = await stripeService.createCheckoutSession(
    userId,
    plan as SubscriptionPlan,
    successUrl,
    cancelUrl
  );

  res.json({
    sessionId: session.sessionId,
    url: session.url,
  });
}

/**
 * Create Stripe Customer Portal session
 */
export async function createPortalSession(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = req.user.userId;
  const { returnUrl } = req.body;

  if (!returnUrl) {
    throw new AppError('returnUrl is required', 400);
  }

  const session = await stripeService.createPortalSession(userId, returnUrl);

  res.json({
    url: session.url,
  });
}

/**
 * Handle Stripe webhook
 */
export async function handleWebhook(req: AuthRequest, res: Response): Promise<void> {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  try {
    const event = stripeService.verifyWebhookSignature(
      req.body,
      signature
    );

    const result = await stripeService.handleWebhook(event);

    res.json({ received: true, ...result });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }
}

/**
 * Get payment history
 */
export async function getPaymentHistory(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = req.user.userId;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const result = await paymentService.getPaymentHistory(userId, limit, offset);
  res.json(result);
}


/**
 * Get subscription details
 */
export async function getSubscriptionDetails(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = req.user.userId;
  const subscription = await paymentService.getSubscriptionDetails(userId);
  res.json(subscription);
}

/**
 * Get payment statistics
 */
export async function getPaymentStats(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = req.user.userId;
  const stats = await paymentService.getPaymentStats(userId);
  res.json(stats);
}

/**
 * Get specific payment
 */
export async function getPaymentById(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = req.user.userId;
  const { paymentId } = req.params;
  const payment = await paymentService.getPaymentById(paymentId, userId);
  res.json(payment);
}

