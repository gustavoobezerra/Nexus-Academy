import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  checkSlugAvailability,
  setSlug,
  setupManualPayment,
  setupAutomaticPayment,
  skipPaymentSetup,
  createSubscriptionSession,
  completeOnboarding
} from '../controllers/onboardingController.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);
router.use(authorize('teacher', 'admin'));

/**
 * @swagger
 * tags:
 *   name: Onboarding
 *   description: Wizard de configuração inicial do professor
 */

/**
 * @swagger
 * /api/onboarding/check-slug:
 *   get:
 *     summary: Verifica disponibilidade de slug (GET)
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: "professor-silva"
 *     responses:
 *       200:
 *         description: Status da disponibilidade
 *   post:
 *     summary: Verifica disponibilidade de slug (POST)
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slug
 *             properties:
 *               slug:
 *                 type: string
 *                 example: "professor-silva"
 *     responses:
 *       200:
 *         description: Status da disponibilidade
 */
router.get('/check-slug', checkSlugAvailability);
router.post('/check-slug', checkSlugAvailability);

/**
 * @swagger
 * /api/onboarding/set-slug:
 *   post:
 *     summary: Define o slug único do professor
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slug
 *             properties:
 *               slug:
 *                 type: string
 *                 example: "professor-silva"
 *     responses:
 *       200:
 *         description: Slug configurado com sucesso
 */
router.post('/set-slug', setSlug);

/**
 * @swagger
 * /api/onboarding/setup-manual-payment:
 *   post:
 *     summary: Configura pagamento manual (PIX ou externo)
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - manualType
 *             properties:
 *               manualType:
 *                 type: string
 *                 enum: [pix_in_system, external]
 *               pixKey:
 *                 type: string
 *               pixKeyType:
 *                 type: string
 *                 enum: [cpf, cnpj, email, phone, random]
 *     responses:
 *       200:
 *         description: Pagamento manual configurado
 */
router.post('/setup-manual-payment', setupManualPayment);

/**
 * @swagger
 * /api/onboarding/setup-automatic-payment:
 *   post:
 *     summary: Configura gateway de pagamento automático
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - credentials
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [mercadopago, asaas, pagseguro, efi]
 *               credentials:
 *                 type: object
 *     responses:
 *       200:
 *         description: Gateway configurado com sucesso
 */
router.post('/setup-automatic-payment', setupAutomaticPayment);

/**
 * @swagger
 * /api/onboarding/skip-payment:
 *   post:
 *     summary: Pula configuração de pagamento para fazer depois
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuração pulada
 */
router.post('/skip-payment', skipPaymentSetup);

/**
 * @swagger
 * /api/onboarding/create-subscription-session:
 *   post:
 *     summary: Cria sessão de checkout do Stripe para assinatura do Nexus
 *     tags: [Onboarding]
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
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [basic, pro]
 *     responses:
 *       200:
 *         description: URL do checkout do Stripe
 */
router.post('/create-subscription-session', createSubscriptionSession);

/**
 * @swagger
 * /api/onboarding/complete:
 *   post:
 *     summary: Marca o onboarding como completo
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding completo
 */
router.post('/complete', completeOnboarding);

export default router;
