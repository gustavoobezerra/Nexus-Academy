import Stripe from 'stripe';
import User from '../models/User.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Processa webhooks do Stripe
 * POST /api/webhooks/stripe
 *
 * Eventos importantes:
 * - checkout.session.completed: Quando checkout é finalizado (trial ativado)
 * - customer.subscription.updated: Quando assinatura é atualizada
 * - customer.subscription.deleted: Quando assinatura é cancelada
 * - invoice.payment_succeeded: Quando pagamento é confirmado
 * - invoice.payment_failed: Quando pagamento falha
 */
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('⚠️ STRIPE_WEBHOOK_SECRET não configurado');
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  if (!stripe) {
    console.error('⚠️ Stripe não configurado');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  let event;

  try {
    // Verificar assinatura do webhook
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Processar evento
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Checkout completado - Trial iniciado
 */
async function handleCheckoutCompleted(session) {
  console.log('✅ Checkout completed:', session.id);

  const customerId = session.customer;
  const subscriptionId = session.subscription;

  // Buscar usuário pelo Stripe Customer ID
  const user = await User.findOne({ stripeCustomerId: customerId });

  if (!user) {
    console.error('❌ Usuário não encontrado para customer:', customerId);
    return;
  }

  // Buscar subscription no Stripe para pegar detalhes
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Determinar plano baseado no price ID
  let plan = 'basic';
  if (subscription.items.data[0]) {
    const priceId = subscription.items.data[0].price.id;
    if (priceId === process.env.STRIPE_PRICE_PRO) {
      plan = 'pro';
    }
  }

  // Calcular data final do trial
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

  // Atualizar usuário
  await User.findByIdAndUpdate(user._id, {
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus: subscription.status, // 'trialing'
    subscriptionPlan: plan,
    status: 'active',
    trialEndsAt: trialEnd,
    onboardingCompletedAt: new Date(),
    subscriptionRenewsAt: trialEnd
  });

  console.log(`✅ User ${user.email} trial ativado até ${trialEnd}`);
}

/**
 * Assinatura atualizada
 */
async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Subscription updated:', subscription.id);

  const user = await User.findOne({ stripeSubscriptionId: subscription.id });

  if (!user) {
    console.error('❌ Usuário não encontrado para subscription:', subscription.id);
    return;
  }

  // Mapear status do Stripe
  const statusMap = {
    'trialing': 'trialing',
    'active': 'active',
    'past_due': 'past_due',
    'canceled': 'canceled',
    'unpaid': 'past_due'
  };

  const newStatus = statusMap[subscription.status] || 'incomplete';

  // Determinar plano
  let plan = user.subscriptionPlan || 'basic';
  if (subscription.items.data[0]) {
    const priceId = subscription.items.data[0].price.id;
    if (priceId === process.env.STRIPE_PRICE_PRO) {
      plan = 'pro';
    } else if (priceId === process.env.STRIPE_PRICE_BASIC) {
      plan = 'basic';
    }
  }

  // Atualizar usuário
  await User.findByIdAndUpdate(user._id, {
    subscriptionStatus: newStatus,
    subscriptionPlan: plan,
    status: ['trialing', 'active'].includes(newStatus) ? 'active' : 'suspended',
    subscriptionRenewsAt: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
  });

  console.log(`✅ User ${user.email} subscription atualizada para ${newStatus}`);
}

/**
 * Assinatura cancelada
 */
async function handleSubscriptionDeleted(subscription) {
  console.log('❌ Subscription deleted:', subscription.id);

  const user = await User.findOne({ stripeSubscriptionId: subscription.id });

  if (!user) {
    console.error('❌ Usuário não encontrado para subscription:', subscription.id);
    return;
  }

  // Atualizar usuário
  await User.findByIdAndUpdate(user._id, {
    subscriptionStatus: 'canceled',
    status: 'suspended',
    subscriptionRenewsAt: null
  });

  console.log(`❌ User ${user.email} subscription cancelada`);
}

/**
 * Pagamento bem-sucedido
 */
async function handlePaymentSucceeded(invoice) {
  console.log('💰 Payment succeeded:', invoice.id);

  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    console.log('Invoice sem subscription associada');
    return;
  }

  const user = await User.findOne({ stripeSubscriptionId: subscriptionId });

  if (!user) {
    console.error('❌ Usuário não encontrado para subscription:', subscriptionId);
    return;
  }

  // Atualizar status se estava past_due
  if (user.subscriptionStatus === 'past_due') {
    await User.findByIdAndUpdate(user._id, {
      subscriptionStatus: 'active',
      status: 'active'
    });

    console.log(`✅ User ${user.email} pagamento regularizado`);
  }
}

/**
 * Pagamento falhou
 */
async function handlePaymentFailed(invoice) {
  console.log('⚠️ Payment failed:', invoice.id);

  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    console.log('Invoice sem subscription associada');
    return;
  }

  const user = await User.findOne({ stripeSubscriptionId: subscriptionId });

  if (!user) {
    console.error('❌ Usuário não encontrado para subscription:', subscriptionId);
    return;
  }

  // Marcar como past_due
  await User.findByIdAndUpdate(user._id, {
    subscriptionStatus: 'past_due',
    status: 'suspended'
  });

  console.log(`⚠️ User ${user.email} marcado como past_due`);

  // TODO: Enviar email notificando sobre pagamento falhado
}
