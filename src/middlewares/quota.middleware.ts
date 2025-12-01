import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import * as subscriptionService from '../services/subscription.service';

/**
 * Middleware to check quota before processing requests
 * Works for both authenticated and guest users
 */
export async function checkQuota(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId || null;
    const deviceId = req.headers['x-device-id'] as string | undefined || null;

    // Check quota
    const quotaCheck = await subscriptionService.checkQuota(userId, deviceId);

    // Attach quota info to request
    (req as any).quota = quotaCheck;

    // If hard paywall, block the request
    if (quotaCheck.shouldShowHardPaywall && !quotaCheck.allowed) {
      res.status(403).json({
        error: 'Quota exceeded',
        message: quotaCheck.message,
        quota: {
          remaining: quotaCheck.remaining,
          limit: quotaCheck.limit,
          shouldShowHardPaywall: true,
        },
      });
      return;
    }

    // Allow request but attach quota info for frontend to show prompts
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to track request after successful processing
 * Call this after the request handler completes
 */
export async function trackRequest(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId || null;
    const deviceId = req.headers['x-device-id'] as string | undefined || null;
    const requestType = (req as any).requestType || 'tutor';

    // Track the request
    await subscriptionService.trackRequest(userId, deviceId, requestType);

    // Attach quota info to response
    const quotaCheck = await subscriptionService.checkQuota(userId, deviceId);
    
    res.locals.quota = quotaCheck;
    next();
  } catch (error) {
    // Don't fail the request if tracking fails
    console.error('Error tracking request:', error);
    next();
  }
}

/**
 * Middleware to check file upload size based on plan
 */
export async function checkFileSize(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId || null;
    const deviceId = req.headers['x-device-id'] as string | undefined || null;
    const fileSize = (req as any).file?.size || (req as any).body?.fileSize;

    if (!fileSize) {
      next();
      return;
    }

    const plan = await subscriptionService.getUserPlan(userId, deviceId);
    const limits = subscriptionService.PLAN_LIMITS[plan];

    if (fileSize > limits.maxFileSize) {
      res.status(413).json({
        error: 'File too large',
        message: `Maximum file size for ${plan} plan is ${limits.maxFileSize / (1024 * 1024)} MB`,
        maxFileSize: limits.maxFileSize,
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

