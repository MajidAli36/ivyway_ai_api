import { prisma } from '../db/prisma';
import { AppError } from '../middlewares/error.middleware';
// PaymentStatus is not used in this file, but kept for future use

/**
 * Get payment history for a user
 */
export async function getPaymentHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
) {
  const payments = await prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      description: true,
      paidAt: true,
      failedAt: true,
      createdAt: true,
    },
  });

  const total = await prisma.payment.count({
    where: { userId },
  });

  return {
    payments,
    total,
    limit,
    offset,
  };
}

/**
 * Get subscription details for a user (from User table and latest payment)
 */
export async function getSubscriptionDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      subscriptionStart: true,
      subscriptionEnd: true,
      stripeCustomerId: true,
    },
  });

  if (!user) {
    return null;
  }

  // Get latest payment with subscription info
  const latestPayment = await prisma.payment.findFirst({
    where: {
      userId,
      stripeSubscriptionId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      stripeSubscriptionId: true,
      subscriptionPlan: true,
    },
  });

  return {
    plan: user.subscriptionPlan,
    subscriptionStart: user.subscriptionStart,
    subscriptionEnd: user.subscriptionEnd,
    stripeCustomerId: user.stripeCustomerId,
    stripeSubscriptionId: latestPayment?.stripeSubscriptionId || null,
  };
}

/**
 * Get payment statistics for a user
 */
export async function getPaymentStats(userId: string) {
  const [totalPayments, successfulPayments, totalAmount, failedPayments] = await Promise.all([
    prisma.payment.count({ where: { userId } }),
    prisma.payment.count({
      where: { userId, status: 'SUCCEEDED' },
    }),
    prisma.payment.aggregate({
      where: { userId, status: 'SUCCEEDED' },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: { userId, status: 'FAILED' },
    }),
  ]);

  return {
    totalPayments,
    successfulPayments,
    failedPayments,
    totalAmountPaid: totalAmount._sum.amount || 0,
  };
}

/**
 * Get a specific payment by ID
 */
export async function getPaymentById(paymentId: string, userId: string) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      userId,
    },
  });

  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  return payment;
}

