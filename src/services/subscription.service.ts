import { prisma } from '../db/prisma';
import { AppError } from '../middlewares/error.middleware';
import { SubscriptionPlan } from '../types/prisma.types';

export interface PlanLimits {
  monthlyRequests: number | null; // null = unlimited (fair use)
  dailyRequests: number | null; // for premium fair use
  maxFileSize: number; // in bytes
  canUploadFiles: boolean;
  canSaveChats: boolean;
  canUseAdvancedAgents: boolean;
  priority: 'low' | 'normal' | 'high';
  watermark: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  GUEST: {
    monthlyRequests: 5, // lifetime, not monthly
    dailyRequests: null,
    maxFileSize: 0, // no file uploads
    canUploadFiles: false,
    canSaveChats: false,
    canUseAdvancedAgents: false,
    priority: 'low',
    watermark: false,
  },
  FREE: {
    monthlyRequests: 15,
    dailyRequests: null,
    maxFileSize: 5 * 1024 * 1024, // 5 MB
    canUploadFiles: true,
    canSaveChats: true,
    canUseAdvancedAgents: false,
    priority: 'low',
    watermark: true,
  },
  PRO: {
    monthlyRequests: 500,
    dailyRequests: null,
    maxFileSize: 50 * 1024 * 1024, // 50 MB
    canUploadFiles: true,
    canSaveChats: true,
    canUseAdvancedAgents: true,
    priority: 'normal',
    watermark: false,
  },
  PREMIUM: {
    monthlyRequests: null, // unlimited (fair use)
    dailyRequests: 200, // fair use limit
    maxFileSize: 200 * 1024 * 1024, // 200 MB
    canUploadFiles: true,
    canSaveChats: true,
    canUseAdvancedAgents: true,
    priority: 'high',
    watermark: false,
  },
};

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number | null; // null = unlimited
  limit: number | null;
  shouldShowSoftPrompt: boolean;
  shouldShowHardPaywall: boolean;
  message?: string;
}

/**
 * Get user's current subscription plan
 */
export async function getUserPlan(userId: string | null, _deviceId: string | null): Promise<SubscriptionPlan> {
  if (!userId) {
    return 'GUEST';
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionPlan: true },
  });

  return user?.subscriptionPlan || 'FREE';
}

/**
 * Track a request usage
 */
export async function trackRequest(
  userId: string | null,
  deviceId: string | null,
  requestType: string = 'tutor'
): Promise<void> {
  await prisma.requestUsage.create({
    data: {
      userId: userId || null,
      deviceId: deviceId || null,
      requestType,
    },
  });
}

/**
 * Get request count for a user or device
 */
export async function getRequestCount(
  userId: string | null,
  deviceId: string | null,
  period: 'lifetime' | 'month' | 'day' = 'month'
): Promise<number> {
  const now = new Date();
  let startDate: Date;

  if (period === 'lifetime') {
    startDate = new Date(0); // Beginning of time
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    // day
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const where: any = {
    createdAt: { gte: startDate },
  };

  if (userId) {
    where.userId = userId;
  } else if (deviceId) {
    where.deviceId = deviceId;
  } else {
    return 0;
  }

  return prisma.requestUsage.count({ where });
}

/**
 * Check if user/device can make a request
 */
export async function checkQuota(
  userId: string | null,
  deviceId: string | null
): Promise<QuotaCheckResult> {
  const plan = await getUserPlan(userId, deviceId);
  const limits = PLAN_LIMITS[plan];

  // Guest mode: lifetime limit
  if (plan === 'GUEST') {
    const count = await getRequestCount(userId, deviceId, 'lifetime');
    const remaining = limits.monthlyRequests! - count;
    const shouldShowSoftPrompt = count >= 3;
    const shouldShowHardPaywall = count >= 5;

    return {
      allowed: count < limits.monthlyRequests!,
      remaining: Math.max(0, remaining),
      limit: limits.monthlyRequests,
      shouldShowSoftPrompt,
      shouldShowHardPaywall,
      message: shouldShowHardPaywall
        ? 'You\'ve reached your free limit. Sign in to unlock more requests.'
        : shouldShowSoftPrompt
        ? 'You\'re getting close to your free limit. Sign in to unlock 15 monthly requests and save your chats.'
        : undefined,
    };
  }

  // Free plan: monthly limit
  if (plan === 'FREE') {
    const count = await getRequestCount(userId, deviceId, 'month');
    const remaining = limits.monthlyRequests! - count;
    const shouldShowSoftPrompt = count >= 10;
    const shouldShowHardPaywall = count >= 15;

    return {
      allowed: count < limits.monthlyRequests!,
      remaining: Math.max(0, remaining),
      limit: limits.monthlyRequests,
      shouldShowSoftPrompt,
      shouldShowHardPaywall,
      message: shouldShowHardPaywall
        ? 'You\'ve reached your monthly limit. Upgrade to Pro for 500 monthly requests.'
        : shouldShowSoftPrompt
        ? 'Pro gives you 500 monthly requests and faster answers. Want to upgrade?'
        : undefined,
    };
  }

  // Pro plan: monthly limit
  if (plan === 'PRO') {
    const count = await getRequestCount(userId, deviceId, 'month');
    const remaining = limits.monthlyRequests! - count;
    const usagePercent = (count / limits.monthlyRequests!) * 100;
    const shouldShowSoftPrompt = usagePercent >= 75; // 75% usage
    const shouldShowHardPaywall = count >= limits.monthlyRequests!;

    return {
      allowed: count < limits.monthlyRequests!,
      remaining: Math.max(0, remaining),
      limit: limits.monthlyRequests,
      shouldShowSoftPrompt,
      shouldShowHardPaywall,
      message: shouldShowHardPaywall
        ? 'You\'ve reached your monthly limit. Upgrade to Premium for unlimited access.'
        : shouldShowSoftPrompt
        ? 'You\'re almost at your monthly limit. Upgrade to Premium for unlimited access.'
        : undefined,
    };
  }

  // Premium plan: fair use (daily limit with throttling)
  if (plan === 'PREMIUM') {
    const dailyCount = await getRequestCount(userId, deviceId, 'day');
    const shouldThrottle = dailyCount >= limits.dailyRequests!;

    return {
      allowed: true, // Premium never fully blocks
      remaining: null, // unlimited
      limit: null,
      shouldShowSoftPrompt: false,
      shouldShowHardPaywall: false,
      message: shouldThrottle
        ? 'You\'re experiencing fair use throttling. Requests may be slower today.'
        : undefined,
    };
  }

  // Fallback
  return {
    allowed: false,
    remaining: 0,
    limit: 0,
    shouldShowSoftPrompt: false,
    shouldShowHardPaywall: true,
  };
}

/**
 * Update user subscription plan
 */
export async function updateSubscription(
  userId: string,
  plan: SubscriptionPlan
): Promise<void> {
  const now = new Date();
  let subscriptionStart = now;
  let subscriptionEnd: Date | null = null;

  // Set subscription end date for paid plans
  if (plan === 'PRO' || plan === 'PREMIUM') {
    subscriptionEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: plan,
      subscriptionStart: subscriptionStart,
      subscriptionEnd: subscriptionEnd,
    },
  });
}

/**
 * Reset monthly quotas (called by scheduler on 1st of each month)
 */
export async function resetMonthlyQuotas(): Promise<void> {
  // For Free and Pro plans, we don't need to reset anything
  // because we count requests per month using date filters
  // This function is here for future use if needed
}

/**
 * Get subscription info for a user
 */
export async function getSubscriptionInfo(userId: string | null) {
  if (!userId) {
    return {
      plan: 'GUEST' as SubscriptionPlan,
      limits: PLAN_LIMITS.GUEST,
      subscriptionStart: null,
      subscriptionEnd: null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      subscriptionStart: true,
      subscriptionEnd: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return {
    plan: user.subscriptionPlan,
    limits: PLAN_LIMITS[user.subscriptionPlan as SubscriptionPlan],
    subscriptionStart: user.subscriptionStart,
    subscriptionEnd: user.subscriptionEnd,
  };
}

