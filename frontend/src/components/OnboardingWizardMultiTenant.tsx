import React, { useState, useEffect } from 'react';
import {
  Check, ChevronRight, ChevronLeft, Link2, DollarSign,
  Rocket, AlertCircle, Loader2, ExternalLink, CheckCircle2,
  Wallet, Building2, Smartphone, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { onboardingAPI } from '../lib/api';

interface OnboardingWizardMultiTenantProps {
  onComplete: () => void;
}

export const OnboardingWizardMultiTenant: React.FC<OnboardingWizardMultiTenantProps> = ({ onComplete: _onComplete }) => {
  const [step, setStep] = useState(1);

  // Step 1 - Slug
  const [slug, setSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Step 2 - Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'manual' | 'automatic' | null>(null);
  const [manualType, setManualType] = useState<'pix_in_system' | 'external' | null>(null);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>('cpf');
  const [selectedGateway, setSelectedGateway] = useState<'mercadopago' | 'asaas' | 'pagseguro' | 'efi' | null>(null);
  const [gatewayCredentials, setGatewayCredentials] = useState<any>({});

  // Step 3 - Plan
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);

  // Debounce slug check
  useEffect(() => {
    if (!slug || slug.length < 3) {
      // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
      setSlugAvailable(null);
      console.log('[ONBOARDING] Slug muito curto ou vazio');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingSlug(true);
      console.log('[ONBOARDING] Verificando slug:', slug);
      try {
        const response = await onboardingAPI.checkSlug(slug) as any;
        console.log('[ONBOARDING] Resposta da API:', response);
        // apiService já retorna response.data, então acessamos diretamente
        setSlugAvailable(response.available);
        console.log('[ONBOARDING] Slug disponível:', response.available);
      } catch (error: unknown) {
        console.error('[ONBOARDING] Erro ao verificar slug:', error);
        setSlugAvailable(false);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [slug]);

  const handleSlugChange = (value: string) => {
    // Remove caracteres inválidos em tempo real
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(sanitized);
  };

  const nextStep = async () => {
    if (step === 1) {
      // Validar e salvar slug
      if (!slug || slug.length < 3 || slug.length > 30) {
        toast.error('Slug deve ter entre 3 e 30 caracteres');
        return;
      }
      if (!slugAvailable) {
        toast.error('Este slug não está disponível');
        return;
      }

      setLoading(true);
      try {
        await onboardingAPI.setSlug(slug);
        toast.success('Link personalizado configurado!');
        setStep(2);
      } catch (error: unknown) {
        toast.error(error.response?.data?.message || 'Erro ao configurar slug');
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      // Salvar configuração de pagamento
      if (!paymentMethod) {
        toast.error('Escolha como deseja receber pagamentos');
        return;
      }

      setLoading(true);
      try {
        if (paymentMethod === 'manual') {
          if (manualType === 'pix_in_system') {
            if (!pixKey || !pixKeyType) {
              toast.error('Informe sua chave PIX');
              setLoading(false);
              return;
            }
            await onboardingAPI.setupManualPayment({
              manualType: 'pix_in_system',
              pixKey,
              pixKeyType,
            });
          } else {
            await onboardingAPI.setupManualPayment({
              manualType: 'external',
            });
          }
          toast.success('Pagamento manual configurado!');
        } else if (paymentMethod === 'automatic') {
          if (!selectedGateway) {
            toast.error('Escolha um gateway de pagamento');
            setLoading(false);
            return;
          }

          const creds = gatewayCredentials[selectedGateway];
          if (!creds || Object.keys(creds).length === 0) {
            toast.error('Informe as credenciais do gateway');
            setLoading(false);
            return;
          }

          await onboardingAPI.setupAutomaticPayment({
            provider: selectedGateway,
            credentials: creds,
          });
          toast.success(`${selectedGateway} configurado com sucesso!`);
        }
        setStep(3);
      } catch (error: unknown) {
        toast.error(error.response?.data?.message || 'Erro ao configurar pagamentos');
      } finally {
        setLoading(false);
      }
    } else if (step === 3) {
      // Criar assinatura e completar onboarding
      if (!selectedPlan) {
        toast.error('Escolha um plano');
        return;
      }

      setLoading(true);
      try {
        // Criar sessão Stripe
        const response = await onboardingAPI.createSubscriptionSession(selectedPlan) as any;
        // apiService já retorna response.data, então acessamos diretamente
        const checkoutUrl = response.checkoutUrl;

        if (!checkoutUrl) {
          toast.error('Erro ao obter link de pagamento');
          setLoading(false);
          return;
        }

        // Redirecionar para Stripe Checkout
        window.location.href = checkoutUrl;
      } catch (error: unknown) {
        toast.error(error.response?.data?.message || 'Erro ao criar assinatura');
        setLoading(false);
      }
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const skipPayment = async () => {
    setLoading(true);
    try {
      await onboardingAPI.skipPayment();
      toast.success('Você pode configurar pagamentos depois');
      setStep(3);
    } catch (error) {
      toast.error('Erro ao pular configuração');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return renderStep1Slug();
      case 2:
        return renderStep2Payment();
      case 3:
        return renderStep3Plan();
      default:
        return null;
    }
  };

  const renderStep1Slug = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Link2 size={32} />
        </div>
        <h3 className="text-2xl font-bold dark:text-white">Seu Link Personalizado</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Escolha um identificador único para sua área. Seus alunos usarão este link.
        </p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <label className="block text-sm font-medium mb-2 dark:text-white">
          Seu Link Será:
        </label>
        <div className={`flex items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-lg border-2 transition-all ${
          slugAvailable === true
            ? 'border-green-500 ring-2 ring-green-500/20'
            : slugAvailable === false
            ? 'border-red-500 ring-2 ring-red-500/20'
            : 'border-slate-200 dark:border-slate-700'
        }`}>
          <span className="text-slate-500 dark:text-slate-400 text-sm">nexusacademy.com/professor/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-lg font-semibold dark:text-white"
            placeholder="seu-nome"
            maxLength={30}
          />
          {checkingSlug && <Loader2 size={20} className="animate-spin text-slate-400" />}
          {!checkingSlug && slugAvailable === true && <CheckCircle2 size={20} className="text-green-500" />}
          {!checkingSlug && slugAvailable === false && <AlertCircle size={20} className="text-red-500" />}
        </div>
        {slugAvailable === true && (
          <p className="text-green-600 dark:text-green-400 text-sm mt-2 flex items-center gap-1">
            <Check size={14} /> Disponível!
          </p>
        )}
        {slugAvailable === false && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-2 flex items-center gap-1">
            <AlertCircle size={14} /> Já está em uso. Escolha outro.
          </p>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
        <p className="text-sm text-blue-900 dark:text-blue-300 font-medium mb-2">💡 Dicas:</p>
        <ul className="text-xs text-blue-800/80 dark:text-blue-400/80 space-y-1">
          <li>• Apenas letras minúsculas, números e hífen</li>
          <li>• Entre 3 e 30 caracteres</li>
          <li>• Exemplos: silva, prof-carlos, joao-matematica</li>
        </ul>
      </div>

      {/* Debug info - apenas em desenvolvimento */}
      {import.meta.env.DEV && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs font-mono">
          <strong>DEBUG:</strong> available={String(slugAvailable)} | checking={String(checkingSlug)} |
          slug="{slug}" | botão={!slugAvailable ? 'DESABILITADO' : 'HABILITADO'}
        </div>
      )}
    </div>
  );

  const renderStep2Payment = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <DollarSign size={32} />
        </div>
        <h3 className="text-2xl font-bold dark:text-white">Como Você Vai Receber Pagamentos?</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Escolha como seus alunos vão pagar você. Pode mudar depois.
        </p>
      </div>

      {!paymentMethod ? (
        <div className="space-y-4">
          <button
            onClick={() => setPaymentMethod('manual')}
            className="w-full p-6 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <Wallet size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg dark:text-white mb-1">💰 Pagamento Manual</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Você controla totalmente. Zero taxas. Alunos pagam direto para você.
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">Zero taxas</span>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">Controle total</span>
                </div>
              </div>
              <ChevronRight className="text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          <button
            onClick={() => setPaymentMethod('automatic')}
            className="w-full p-6 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg dark:text-white mb-1">⚡ Pagamento Automático</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Confirmação instantânea. Zero trabalho manual. Dinheiro direto na conta.
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">Taxa 2,99-3,99%</span>
                  <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded">Automático</span>
                </div>
              </div>
              <ChevronRight className="text-slate-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          <button
            onClick={skipPayment}
            disabled={loading}
            className="w-full py-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition-colors"
          >
            Configurar Depois
          </button>
        </div>
      ) : paymentMethod === 'manual' ? (
        renderManualPaymentOptions()
      ) : (
        renderAutomaticPaymentOptions()
      )}
    </div>
  );

  const renderManualPaymentOptions = () => (
    <div className="space-y-4">
      <button
        onClick={() => setManualType('pix_in_system')}
        className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
          manualType === 'pix_in_system'
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <Smartphone size={20} className="text-emerald-600 dark:text-emerald-400" />
          <h4 className="font-bold dark:text-white">PIX Dentro do Sistema</h4>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Aluno vê sua chave PIX, paga pelo app do banco, envia comprovante e você aprova.
        </p>
        {manualType === 'pix_in_system' && (
          <div className="space-y-3 mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800">
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-white">Tipo de Chave:</label>
              <select
                value={pixKeyType}
                onChange={(e) => setPixKeyType(e.target.value as any)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white"
              >
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">Email</option>
                <option value="phone">Telefone</option>
                <option value="random">Chave Aleatória</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-white">Digite sua chave PIX:</label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white"
                placeholder="Digite sua chave PIX aqui"
              />
            </div>
          </div>
        )}
      </button>

      <button
        onClick={() => setManualType('external')}
        className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
          manualType === 'external'
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
          <h4 className="font-bold dark:text-white">Cobrar Totalmente Por Fora</h4>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Você combina pagamento direto com alunos. Sistema NÃO gerencia. Você registra manualmente.
        </p>
      </button>

      <button
        onClick={() => setPaymentMethod(null)}
        className="w-full py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        ← Voltar
      </button>
    </div>
  );

  const renderAutomaticPaymentOptions = () => {
    const gateways = [
      {
        id: 'mercadopago' as const,
        name: 'Mercado Pago',
        recommended: true,
        fee: '2,99% PIX | 4,99% Cartão',
        period: 'Prazo de recebimento: 14 dias corridos',
        fields: [{ key: 'accessToken', label: 'Access Token', placeholder: 'APP_USR_...' }],
        tutorial: '/tutoriais/mercadopago',
      },
      {
        id: 'asaas' as const,
        name: 'Asaas',
        fee: '1,49% PIX | 3,49% Cartão',
        period: 'Prazo de recebimento: 1 dia útil',
        badge: 'Mais Barato',
        fields: [{ key: 'apiKey', label: 'API Key', placeholder: 'asaas_api_...' }],
        tutorial: '/tutoriais/asaas',
      },
      {
        id: 'pagseguro' as const,
        name: 'PagSeguro',
        fee: '3,49% PIX | 4,99% Cartão',
        period: 'Prazo de recebimento: 30 dias corridos',
        fields: [
          { key: 'email', label: 'Email', placeholder: 'seu@email.com' },
          { key: 'token', label: 'Token', placeholder: 'pagseguro_token...' },
        ],
        tutorial: '/tutoriais/pagseguro',
      },
      {
        id: 'efi' as const,
        name: 'Efi Pay',
        fee: '3,49% PIX | 5,49% Cartão',
        period: 'Prazo de recebimento: 1 dia útil',
        fields: [
          { key: 'clientId', label: 'Client ID', placeholder: 'client_id...' },
          { key: 'clientSecret', label: 'Client Secret', placeholder: 'client_secret...' },
        ],
        tutorial: '/tutoriais/efi',
      },
    ];

    return (
      <div className="space-y-4">
        {gateways.map((gateway) => (
          <div key={gateway.id} className={`p-5 rounded-xl border-2 transition-all ${
            selectedGateway === gateway.id
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
          }`}>
            <div
              onClick={() => setSelectedGateway(gateway.id)}
              className="cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-bold text-lg dark:text-white">{gateway.name}</h4>
                  {gateway.recommended && (
                    <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded">
                      Recomendado
                    </span>
                  )}
                  {gateway.badge && (
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                      {gateway.badge}
                    </span>
                  )}
                </div>
                {selectedGateway === gateway.id && <CheckCircle2 className="text-purple-500" />}
              </div>
              <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                <p>💰 Taxa cobrada: {gateway.fee}</p>
                <p>⏱️ {gateway.period}</p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  (Tempo até o dinheiro cair na sua conta após o pagamento do aluno)
                </p>
              </div>
            </div>

            {selectedGateway === gateway.id && (
              <div className="space-y-3 mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
                <a
                  href={gateway.tutorial}
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(gateway.tutorial, '_blank');
                  }}
                  className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  <ExternalLink size={14} />
                  📚 Ver Tutorial Completo Passo-a-Passo
                </a>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Abrirá em nova aba com instruções detalhadas de como configurar
                </p>
                {gateway.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium mb-2 dark:text-white">{field.label}:</label>
                    <input
                      type="text"
                      value={gatewayCredentials[gateway.id]?.[field.key] || ''}
                      onChange={(e) =>
                        setGatewayCredentials({
                          ...gatewayCredentials,
                          [gateway.id]: {
                            ...(gatewayCredentials[gateway.id] || {}),
                            [field.key]: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white"
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <button
          onClick={() => setPaymentMethod(null)}
          className="w-full py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          ← Voltar
        </button>
      </div>
    );
  };

  const renderStep3Plan = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Rocket size={32} />
        </div>
        <h3 className="text-2xl font-bold dark:text-white">Escolha Seu Plano</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Você só será cobrado após 30 dias de trial gratuito
        </p>
      </div>

      <div className="space-y-4">
        <div
          onClick={() => setSelectedPlan('basic')}
          className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
            selectedPlan === 'basic'
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-bold text-xl dark:text-white">Plano Básico</h4>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                R$ 97<span className="text-base font-normal text-slate-500">/mês</span>
              </p>
            </div>
            {selectedPlan === 'basic' && <CheckCircle2 size={24} className="text-indigo-500" />}
          </div>
          <ul className="space-y-2 text-sm dark:text-slate-300">
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Até 30 alunos</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Videoconferência ilimitada (Jitsi)</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Agenda e calendário</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Gestão financeira</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Portal do aluno</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-800">
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">🎁 PRIMEIRO MÊS GRÁTIS</p>
          </div>
        </div>

        <div
          onClick={() => setSelectedPlan('pro')}
          className={`p-6 rounded-2xl border-2 cursor-pointer transition-all relative ${
            selectedPlan === 'pro'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
          }`}
        >
          <div className="absolute top-0 right-6 -translate-y-1/2">
            <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg">
              POPULAR
            </span>
          </div>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-bold text-xl dark:text-white">Plano Pro</h4>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                R$ 197<span className="text-base font-normal text-slate-500">/mês</span>
              </p>
            </div>
            {selectedPlan === 'pro' && <CheckCircle2 size={24} className="text-purple-500" />}
          </div>
          <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-3">TUDO DO BÁSICO +</p>
          <ul className="space-y-2 text-sm dark:text-slate-300">
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Alunos ilimitados</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> IA para geração de conteúdo</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Análise de desempenho</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Automação de emails</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-green-500" /> Certificados personalizados</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
            <p className="text-sm font-medium text-purple-600 dark:text-purple-400">🎁 PRIMEIRO MÊS GRÁTIS</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
        <p>💳 Pagamento via Stripe (100% seguro)</p>
        <p>⚠️ Você só será cobrado após 30 dias</p>
        <p>❌ Cancele quando quiser sem multa</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Progress Bar */}
        <div className="flex h-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex-1 transition-all duration-500 ${
                i <= step ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>

        <div className="p-8 md:p-12 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {renderStep()}

          <div className="mt-12 flex items-center justify-between gap-4">
            {step > 1 ? (
              <button
                onClick={prevStep}
                className="px-6 py-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-bold transition-all flex items-center gap-2"
              >
                <ChevronLeft size={20} /> Voltar
              </button>
            ) : (
              <div></div>
            )}

            <button
              onClick={nextStep}
              disabled={loading || (step === 1 && !slugAvailable)}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 ml-auto active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Processando...
                </>
              ) : step === 3 ? (
                'Finalizar e Ir para Pagamento'
              ) : (
                <>
                  Continuar <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizardMultiTenant;
