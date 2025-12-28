import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      maxNetworkRetries: 3,
      timeout: 10000,
    })
  : null;

// Helper para tratamento de erros do Stripe
const handleStripeError = (error, operation) => {
  if (error.type === 'StripeCardError') {
    return { success: false, error: 'Card declined', details: error.message, code: error.code };
  } else if (error.type === 'StripeRateLimitError') {
    return { success: false, error: 'Rate limit exceeded', details: 'Too many requests' };
  } else if (error.type === 'StripeInvalidRequestError') {
    return { success: false, error: 'Invalid request', details: error.message, param: error.param };
  } else if (error.type === 'StripeAPIError') {
    return { success: false, error: 'Stripe API error', details: error.message };
  } else if (error.type === 'StripeConnectionError') {
    return { success: false, error: 'Connection error', details: 'Unable to connect to Stripe' };
  } else if (error.type === 'StripeAuthenticationError') {
    return { success: false, error: 'Authentication failed', details: 'Invalid API key' };
  }
  return { success: false, error: 'Unknown error', details: error.message, operation };
};

// Validações
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validateAmount = (amount) => {
  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error('Amount must be a positive number');
  }
  if (amount > 1000000) {
    throw new Error('Amount exceeds maximum limit');
  }
};

export const stripeService = {
  isConfigured: () => !!stripe,

  // Customers
  async createCustomer(data) {
    if (!stripe) throw new Error('Stripe not configured');
    
    // Validações
    if (!data.email || !validateEmail(data.email)) {
      throw new Error('Valid email is required');
    }
    if (!data.name || data.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters');
    }

    try {
      const customer = await stripe.customers.create({
        email: data.email,
        name: data.name,
        phone: data.phone,
        metadata: { 
          teacherId: data.teacherId || '', 
          studentId: data.studentId || '',
          createdAt: new Date().toISOString()
        }
      });
      return { success: true, customer };
    } catch (error) {
      const errorResponse = handleStripeError(error, 'createCustomer');
      console.error('[Stripe] createCustomer error:', errorResponse);
      throw new Error(errorResponse.details || error.message);
    }
  },

  async getCustomer(customerId) {
    if (!stripe) throw new Error('Stripe not configured');
    if (!customerId || typeof customerId !== 'string') {
      throw new Error('Valid customer ID is required');
    }

    try {
      const customer = await stripe.customers.retrieve(customerId);
      return { success: true, customer };
    } catch (error) {
      const errorResponse = handleStripeError(error, 'getCustomer');
      console.error('[Stripe] getCustomer error:', errorResponse);
      throw new Error(errorResponse.details || error.message);
    }
  },

  // Payment Intents
  async createPaymentIntent(data) {
    if (!stripe) throw new Error('Stripe not configured');
    
    // Validações
    validateAmount(data.amount);
    if (!data.customerId) {
      throw new Error('Customer ID is required');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency || 'brl',
        customer: data.customerId,
        metadata: { 
          paymentId: data.paymentId || '', 
          studentId: data.studentId || '',
          teacherId: data.teacherId || ''
        },
        automatic_payment_methods: { enabled: true },
        description: data.description || `Payment for ${data.paymentId || 'student'}`,
      });
      return { success: true, paymentIntent };
    } catch (error) {
      const errorResponse = handleStripeError(error, 'createPaymentIntent');
      console.error('[Stripe] createPaymentIntent error:', errorResponse);
      throw new Error(errorResponse.details || error.message);
    }
  },

  async confirmPaymentIntent(paymentIntentId) {
    if (!stripe) throw new Error('Stripe not configured');
    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      throw new Error('Valid payment intent ID is required');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
      return { success: true, paymentIntent };
    } catch (error) {
      const errorResponse = handleStripeError(error, 'confirmPaymentIntent');
      console.error('[Stripe] confirmPaymentIntent error:', errorResponse);
      throw new Error(errorResponse.details || error.message);
    }
  },

  // Subscriptions
  async createSubscription(data) {
    if (!stripe) throw new Error('Stripe not configured');
    if (!data.customerId) {
      throw new Error('Customer ID is required');
    }
    if (!data.priceId) {
      throw new Error('Price ID is required');
    }

    try {
      const subscription = await stripe.subscriptions.create({
        customer: data.customerId,
        items: [{ price: data.priceId }],
        metadata: { teacherId: data.teacherId || '' },
        expand: ['latest_invoice.payment_intent']
      });
      return { success: true, subscription };
    } catch (error) {
      const errorResponse = handleStripeError(error, 'createSubscription');
      console.error('[Stripe] createSubscription error:', errorResponse);
      throw new Error(errorResponse.details || error.message);
    }
  },

  async cancelSubscription(subscriptionId) {
    if (!stripe) throw new Error('Stripe not configured');
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      throw new Error('Valid subscription ID is required');
    }

    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return { success: true, subscription };
    } catch (error) {
      const errorResponse = handleStripeError(error, 'cancelSubscription');
      console.error('[Stripe] cancelSubscription error:', errorResponse);
      throw new Error(errorResponse.details || error.message);
    }
  },

  // Invoices
  async createInvoice(data) {
    if (!stripe) throw new Error('Stripe not configured');
    validateAmount(data.amount);
    if (!data.customerId) {
      throw new Error('Customer ID is required');
    }

    try {
      const invoice = await stripe.invoices.create({
        customer: data.customerId,
        auto_advance: true,
        collection_method: 'send_invoice',
        days_until_due: data.daysUntilDue || 7
      });
      await stripe.invoiceItems.create({
        customer: data.customerId,
        invoice: invoice.id,
        amount: Math.round(data.amount * 100),
        currency: 'brl',
        description: data.description || 'Invoice item'
      });
      const sentInvoice = await stripe.invoices.sendInvoice(invoice.id);
      return { success: true, invoice: sentInvoice };
    } catch (error) {
      const errorResponse = handleStripeError(error, 'createInvoice');
      console.error('[Stripe] createInvoice error:', errorResponse);
      throw new Error(errorResponse.details || error.message);
    }
  },

  // Checkout Session
  async createCheckoutSession(data) {
    if (!stripe) throw new Error('Stripe not configured');
    validateAmount(data.amount);
    if (!data.successUrl || !data.cancelUrl) {
      throw new Error('Success and cancel URLs are required');
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'boleto'],
        line_items: [{
          price_data: {
            currency: 'brl',
            product_data: { name: data.productName || 'Product', description: data.description || '' },
            unit_amount: Math.round(data.amount * 100)
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: data.successUrl,
        cancel_url: data.cancelUrl,
        customer_email: data.customerEmail,
        metadata: data.metadata || {}
      });
      return { success: true, session };
    } catch (error) {
      const errorResponse = handleStripeError(error, 'createCheckoutSession');
      console.error('[Stripe] createCheckoutSession error:', errorResponse);
      throw new Error(errorResponse.details || error.message);
    }
  },

  // PIX
  async createPixPayment(data) {
    if (!stripe) throw new Error('Stripe not configured');
    validateAmount(data.amount);
    if (!data.customerId) {
      throw new Error('Customer ID is required');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100),
        currency: 'brl',
        payment_method_types: ['pix'],
        customer: data.customerId,
        metadata: data.metadata || {}
      });
      return { success: true, paymentIntent };
    } catch (error) {
      const errorResponse = handleStripeError(error, 'createPixPayment');
      console.error('[Stripe] createPixPayment error:', errorResponse);
      throw new Error(errorResponse.details || error.message);
    }
  },

  // Webhook handling
  constructEvent(payload, signature) {
    if (!stripe) throw new Error('Stripe not configured');
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe webhook secret not configured');
    }

    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      return { success: true, event };
    } catch (error) {
      console.error('[Stripe] constructEvent error:', error.message);
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  },

  // Connect (for teacher payouts)
  async createConnectAccount(data) {
    if (!stripe) throw new Error('Stripe not configured');
    if (!data.email || !validateEmail(data.email)) {
      throw new Error('Valid email is required');
    }

    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'BR',
        email: data.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } }
      });
      return { success: true, account };
    } catch (error) {
      const errorResponse = handleStripeError(error, 'createConnectAccount');
      console.error('[Stripe] createConnectAccount error:', errorResponse);
      throw new Error(errorResponse.details || error.message);
    }
  },

  async createAccountLink(accountId, refreshUrl, returnUrl) {
    if (!stripe) throw new Error('Stripe not configured');
    if (!accountId || typeof accountId !== 'string') {
      throw new Error('Valid account ID is required');
    }
    if (!refreshUrl || !returnUrl) {
      throw new Error('Refresh and return URLs are required');
    }

    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      });
      return { success: true, accountLink };
    } catch (error) {
      const errorResponse = handleStripeError(error, 'createAccountLink');
      console.error('[Stripe] createAccountLink error:', errorResponse);
      throw new Error(errorResponse.details || error.message);
    }
  }
};

export default stripeService;
