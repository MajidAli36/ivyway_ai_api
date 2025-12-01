import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as subscriptionService from '../services/subscription.service';
import { SubscriptionPlan } from '../types/prisma.types';

export async function getSubscription(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.userId || null;
  
  const subscriptionInfo = await subscriptionService.getSubscriptionInfo(userId);
  const quotaCheck = await subscriptionService.checkQuota(
    userId,
    req.headers['x-device-id'] as string | undefined || null
  );

  res.json({
    ...subscriptionInfo,
    quota: {
      remaining: quotaCheck.remaining,
      limit: quotaCheck.limit,
      shouldShowSoftPrompt: quotaCheck.shouldShowSoftPrompt,
      shouldShowHardPaywall: quotaCheck.shouldShowHardPaywall,
      message: quotaCheck.message,
    },
  });
}

export async function upgradeSubscription(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const userId = req.user.userId;
  const { plan } = req.body;

  if (!plan || !['FREE', 'PRO', 'PREMIUM'].includes(plan)) {
    res.status(400).json({ error: 'Invalid plan. Must be FREE, PRO, or PREMIUM' });
    return;
  }

  // FREE plan can be set directly (downgrade)
  if (plan === 'FREE') {
    await subscriptionService.updateSubscription(userId, plan as SubscriptionPlan);
    const subscriptionInfo = await subscriptionService.getSubscriptionInfo(userId);
    res.json({
      message: 'Subscription updated successfully',
      ...subscriptionInfo,
    });
    return;
  }

  // For PRO and PREMIUM, payment is handled via Stripe Checkout
  // Return a message indicating they should use the payment endpoint
  res.status(400).json({
    error: 'Payment required',
    message: 'Please use the payment/checkout endpoint to upgrade to a paid plan',
    requiresPayment: true,
  });
}

