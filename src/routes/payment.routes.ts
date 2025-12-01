import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { z } from 'zod';

const router = Router();

const checkoutSchema = z.object({
  plan: z.enum(['PRO', 'PREMIUM']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const portalSchema = z.object({
  returnUrl: z.string().url(),
});

/**
 * @swagger
 * /api/payment/checkout:
 *   post:
 *     summary: Create Stripe Checkout session
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *               - successUrl
 *               - cancelUrl
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [PRO, PREMIUM]
 *               successUrl:
 *                 type: string
 *                 format: uri
 *               cancelUrl:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Checkout session created
 */
router.post('/checkout', authenticate, async (req, res, next) => {
  try {
    const data = checkoutSchema.parse(req.body);
    req.body = data;
    await paymentController.createCheckoutSession(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/payment/portal:
 *   post:
 *     summary: Create Stripe Customer Portal session
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - returnUrl
 *             properties:
 *               returnUrl:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Portal session created
 */
router.post('/portal', authenticate, async (req, res, next) => {
  try {
    const data = portalSchema.parse(req.body);
    req.body = data;
    await paymentController.createPortalSession(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/payment/webhook:
 *   post:
 *     summary: Stripe webhook endpoint
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 */
// Webhook endpoint - raw body is handled in app.ts
router.post('/webhook', async (req, res, next) => {
  try {
    await paymentController.handleWebhook(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/payment/history:
 *   get:
 *     summary: Get payment history
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Payment history
 */
router.get('/history', authenticate, async (req, res, next) => {
  try {
    await paymentController.getPaymentHistory(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/payment/subscription:
 *   get:
 *     summary: Get subscription details
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription details
 */
router.get('/subscription', authenticate, async (req, res, next) => {
  try {
    await paymentController.getSubscriptionDetails(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/payment/stats:
 *   get:
 *     summary: Get payment statistics
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment statistics
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    await paymentController.getPaymentStats(req as any, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/payment/:paymentId:
 *   get:
 *     summary: Get specific payment
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details
 */
router.get('/:paymentId', authenticate, async (req, res, next) => {
  try {
    await paymentController.getPaymentById(req as any, res);
  } catch (error) {
    next(error);
  }
});

export { router as paymentRouter };

