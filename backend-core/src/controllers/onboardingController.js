import Stripe from 'stripe';
import User from '../models/User.js';
import { encryptGatewayCredentials } from '../utils/encryption.js';

// Lista de palavras reservadas para slugs
const RESERVED_SLUGS = [
  'admin', 'api', 'dashboard', 'login', 'register', 'signup',
  'professor', 'student', 'payment', 'nexus', 'onboarding',
  'settings', 'profile', 'help', 'support', 'about', 'contact',
  'terms', 'privacy', 'blog', 'docs', 'status', 'health'
];

/**
 * Verifica disponibilidade de slug
 * POST /api/onboarding/check-slug
 * Body: { slug: string }
 */
export async function checkSlugAvailability(req, res) {
  try {
    const { slug } = req.body;

    // Validação de formato
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Slug é obrigatório'
      });
    }

    const trimmedSlug = slug.trim().toLowerCase();

    // Validação de regex
    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Slug deve conter apenas letras minúsculas, números e hífen'
      });
    }

    // Validação de tamanho
    if (trimmedSlug.length < 3 || trimmedSlug.length > 30) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Slug deve ter entre 3 e 30 caracteres'
      });
    }

    // Verificar palavras reservadas
    if (RESERVED_SLUGS.includes(trimmedSlug)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Este slug está reservado. Escolha outro.'
      });
    }

    // Verificar no banco se já existe
    const existingUser = await User.findOne({ slug: trimmedSlug });

    if (existingUser) {
      return res.json({
        success: true,
        available: false,
        message: 'Slug já está em uso. Escolha outro.'
      });
    }

    // Slug disponível
    res.json({
      success: true,
      available: true,
      message: 'Slug disponível!'
    });

  } catch (error) {
    console.error('Erro em checkSlugAvailability:', error);
    res.status(500).json({
      success: false,
      available: false,
      message: 'Erro ao verificar slug. Tente novamente.'
    });
  }
}

/**
 * Define slug do professor
 * POST /api/onboarding/set-slug
 * Body: { slug: string }
 * Requires: Authentication
 */
export async function setSlug(req, res) {
  try {
    const { slug } = req.body;
    const userId = req.user._id;

    // Mesmas validações do check
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Slug é obrigatório'
      });
    }

    const trimmedSlug = slug.trim().toLowerCase();

    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      return res.status(400).json({
        success: false,
        message: 'Slug inválido'
      });
    }

    if (trimmedSlug.length < 3 || trimmedSlug.length > 30) {
      return res.status(400).json({
        success: false,
        message: 'Slug deve ter entre 3 e 30 caracteres'
      });
    }

    if (RESERVED_SLUGS.includes(trimmedSlug)) {
      return res.status(400).json({
        success: false,
        message: 'Slug reservado'
      });
    }

    // Atualizar usuário
    const user = await User.findByIdAndUpdate(
      userId,
      { slug: trimmedSlug },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Slug configurado com sucesso',
      slug: user.slug,
      publicUrl: `${process.env.FRONTEND_URL}/professor/${user.slug}`
    });

  } catch (error) {
    console.error('Erro em setSlug:', error);

    // Erro de duplicação (slug já existe)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Slug já está em uso. Escolha outro.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao salvar slug. Tente novamente.'
    });
  }
}

/**
 * Configura pagamento manual
 * POST /api/onboarding/setup-manual-payment
 * Body: { manualType: 'pix_in_system' | 'external', pixKey?: string, pixKeyType?: string }
 * Requires: Authentication
 */
export async function setupManualPayment(req, res) {
  try {
    const { manualType, pixKey, pixKeyType } = req.body;
    const userId = req.user._id;

    // Validar tipo manual
    if (!['pix_in_system', 'external'].includes(manualType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de pagamento manual inválido'
      });
    }

    const updateData = {
      paymentMethod: 'manual',
      manualPaymentType: manualType
    };

    // Se escolheu PIX no sistema, exigir chave PIX
    if (manualType === 'pix_in_system') {
      if (!pixKey || !pixKeyType) {
        return res.status(400).json({
          success: false,
          message: 'Chave PIX e tipo são obrigatórios'
        });
      }

      if (!['cpf', 'cnpj', 'email', 'phone', 'random'].includes(pixKeyType)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de chave PIX inválido'
        });
      }

      updateData.pixKey = pixKey.trim();
      updateData.pixKeyType = pixKeyType;
    } else {
      // Se externo, limpar campos PIX se existirem
      updateData.pixKey = null;
      updateData.pixKeyType = null;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Pagamento manual configurado com sucesso',
      paymentMethod: user.paymentMethod,
      manualPaymentType: user.manualPaymentType
    });

  } catch (error) {
    console.error('Erro em setupManualPayment:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao configurar pagamento manual'
    });
  }
}

/**
 * Configura gateway de pagamento automático
 * POST /api/onboarding/setup-automatic-payment
 * Body: { provider: string, credentials: object }
 * Requires: Authentication
 */
export async function setupAutomaticPayment(req, res) {
  try {
    const { provider, credentials } = req.body;
    const userId = req.user._id;

    const validProviders = ['mercadopago', 'asaas', 'pagseguro', 'efi'];

    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Gateway inválido'
      });
    }

    if (!credentials || typeof credentials !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Credenciais são obrigatórias'
      });
    }

    // Validar credenciais específicas por provider
    let credsToSave = {};

    switch (provider) {
      case 'mercadopago':
        if (!credentials.accessToken) {
          return res.status(400).json({
            success: false,
            message: 'Access Token do Mercado Pago é obrigatório'
          });
        }
        credsToSave = {
          mercadopago: { accessToken: credentials.accessToken }
        };
        break;

      case 'asaas':
        if (!credentials.apiKey) {
          return res.status(400).json({
            success: false,
            message: 'API Key do Asaas é obrigatória'
          });
        }
        credsToSave = {
          asaas: { apiKey: credentials.apiKey }
        };
        break;

      case 'pagseguro':
        if (!credentials.email || !credentials.token) {
          return res.status(400).json({
            success: false,
            message: 'Email e Token do PagSeguro são obrigatórios'
          });
        }
        credsToSave = {
          pagseguro: {
            email: credentials.email,
            token: credentials.token
          }
        };
        break;

      case 'efi':
        if (!credentials.clientId || !credentials.clientSecret) {
          return res.status(400).json({
            success: false,
            message: 'Client ID e Client Secret do Efi são obrigatórios'
          });
        }
        credsToSave = {
          efi: {
            clientId: credentials.clientId,
            clientSecret: credentials.clientSecret
          }
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Provider não suportado'
        });
    }

    // Encriptar credenciais antes de salvar
    const encryptedCredentials = encryptGatewayCredentials(credsToSave);

    // Atualizar usuário
    const user = await User.findByIdAndUpdate(
      userId,
      {
        paymentMethod: 'automatic',
        gatewayProvider: provider,
        gatewayCredentials: encryptedCredentials
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      message: `${provider} configurado com sucesso`,
      paymentMethod: user.paymentMethod,
      gatewayProvider: user.gatewayProvider
    });

  } catch (error) {
    console.error('Erro em setupAutomaticPayment:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao configurar gateway de pagamento'
    });
  }
}

/**
 * Pular configuração de pagamento (configurar depois)
 * POST /api/onboarding/skip-payment
 * Requires: Authentication
 */
export async function skipPaymentSetup(req, res) {
  try {
    const userId = req.user._id;

    const user = await User.findByIdAndUpdate(
      userId,
      { paymentMethod: 'pending' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Você pode configurar pagamentos depois no dashboard'
    });

  } catch (error) {
    console.error('Erro em skipPaymentSetup:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao pular configuração'
    });
  }
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// IDs dos preços no Stripe (em produção viriam do config ou banco)
const STRIPE_PRICES = {
  basic: process.env.STRIPE_PRICE_BASIC,
  pro: process.env.STRIPE_PRICE_PRO
};

/**
 * Cria sessão de checkout do Stripe para assinatura do Nexus
 * POST /api/onboarding/create-subscription-session
 * Body: { plan: 'basic' | 'pro' }
 * Requires: Authentication
 */
export async function createSubscriptionSession(req, res) {
  try {
    const { plan } = req.body;
    const userId = req.user._id;

    if (!['basic', 'pro'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Plano inválido'
      });
    }

    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: 'Stripe não configurado no servidor'
      });
    }

    if (!STRIPE_PRICES[plan]) {
      return res.status(500).json({
        success: false,
        message: 'Preço do Stripe não configurado para o plano selecionado'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Cria ou busca customer no Stripe
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString()
        }
      });
      stripeCustomerId = customer.id;
      
      // Salva no banco
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    // Cria session com trial de 30 dias
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: STRIPE_PRICES[plan],
        quantity: 1
      }],
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          userId: user._id.toString(),
          plan: plan
        }
      },
      success_url: `${process.env.FRONTEND_URL}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/onboarding/plan-selection`,
    });

    res.json({
      success: true,
      checkoutUrl: session.url
    });

  } catch (error) {
    console.error('Erro em createSubscriptionSession:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar sessão de pagamento'
    });
  }
}

/**
 * Marca onboarding como completo
 * POST /api/onboarding/complete
 * Requires: Authentication
 */
export async function completeOnboarding(req, res) {
  try {
    const userId = req.user._id;

    // Buscar usuário atual
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar se já completou onboarding antes
    if (currentUser.onboardingCompletedAt) {
      return res.json({
        success: true,
        message: 'Onboarding já foi completado anteriormente',
        user: {
          id: currentUser._id,
          name: currentUser.name,
          email: currentUser.email,
          slug: currentUser.slug,
          subscriptionStatus: currentUser.subscriptionStatus,
          subscriptionPlan: currentUser.subscriptionPlan,
          status: currentUser.status
        }
      });
    }

    // Calcular data final do trial (30 dias)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    // Atualizar para marcar onboarding como completo e iniciar trial
    const user = await User.findByIdAndUpdate(
      userId,
      {
        status: 'active',
        subscriptionStatus: 'trialing',
        trialEndsAt: trialEndsAt,
        onboardingCompletedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Onboarding completo! Bem-vindo ao Nexus Academy',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        slug: user.slug,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        trialEndsAt: user.trialEndsAt,
        status: user.status,
        publicUrl: `${process.env.FRONTEND_URL}/professor/${user.slug}`
      }
    });

  } catch (error) {
    console.error('Erro em completeOnboarding:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao completar onboarding'
    });
  }
}
