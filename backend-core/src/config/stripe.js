// backend-core/src/config/stripe.js
// Configuração do Stripe para processamento de pagamentos

import Stripe from 'stripe';

/**
 * Inicializa o Stripe com a chave secreta
 * ATENÇÃO: Usar apenas chave de teste (sk_test_) em desenvolvimento
 */
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

if (!stripe) {
  console.warn('⚠️ STRIPE_SECRET_KEY não configurada. Funcionalidades de pagamento desativadas.');
}

/**
 * Cria uma intenção de pagamento (Payment Intent)
 * @param {number} amount - Valor em centavos (ex: 10000 = R$ 100,00)
 * @param {string} currency - Moeda (default: brl)
 * @param {Object} metadata - Informações adicionais
 */
export async function createPaymentIntent(amount, currency = 'brl', metadata = {}) {
  try {
    // DEBUG: console.log(`💳 Criando Payment Intent: R$ ${(amount / 100).toFixed(2)}`);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      metadata: metadata,
      automatic_payment_methods: {
        enabled: true
      }
    });

    // DEBUG: console.log('✅ Payment Intent criado:', paymentIntent.id);

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };

  } catch (error) {
    console.error('❌ Erro ao criar Payment Intent:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cria um cliente Stripe
 * @param {Object} customerData - email, name, phone
 */
export async function createCustomer(customerData) {
  try {
    const customer = await stripe.customers.create({
      email: customerData.email,
      name: customerData.name,
      phone: customerData.phone,
      metadata: {
        studentId: customerData.studentId
      }
    });

    // DEBUG: console.log('✅ Cliente Stripe criado:', customer.id);

    return {
      success: true,
      customerId: customer.id
    };

  } catch (error) {
    console.error('❌ Erro ao criar cliente:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Confirma um pagamento
 */
export async function confirmPayment(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
    return {
      success: true,
      status: paymentIntent.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cancela um pagamento
 */
export async function cancelPayment(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    return {
      success: true,
      status: paymentIntent.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export default stripe;
export { stripe };
