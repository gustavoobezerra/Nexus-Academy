import { useState } from 'react';
import { DollarSign, CreditCard, Smartphone, ExternalLink, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { onboardingAPI } from '../../lib/api';

interface Step2Props {
  onNext: () => void;
  onSkip: () => void;
}

type PaymentMode = 'choose' | 'manual' | 'automatic';
type ManualType = 'pix_in_system' | 'external';
type GatewayProvider = 'mercadopago' | 'asaas' | 'pagseguro' | 'efi';

export const Step2_PaymentSetup = ({ onNext, onSkip }: Step2Props) => {
  const [mode, setMode] = useState<PaymentMode>('choose');
  const [manualType, setManualType] = useState<ManualType | null>(null);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>('email');
  const [selectedGateway, setSelectedGateway] = useState<GatewayProvider | null>(null);
  const [gatewayCredentials, setGatewayCredentials] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const gateways = [
    {
      id: 'asaas' as GatewayProvider,
      name: 'Asaas',
      pixFee: '1,49%',
      cardFee: '4,99%',
      highlight: 'Mais barato!',
      color: 'emerald',
      fields: [{ name: 'apiKey', label: 'API Key', type: 'text', placeholder: 'Sua API Key do Asaas' }]
    },
    {
      id: 'mercadopago' as GatewayProvider,
      name: 'Mercado Pago',
      pixFee: '2,99%',
      cardFee: '4,99%',
      color: 'blue',
      fields: [{ name: 'accessToken', label: 'Access Token', type: 'text', placeholder: 'Seu Access Token' }]
    },
    {
      id: 'pagseguro' as GatewayProvider,
      name: 'PagSeguro',
      pixFee: '3,49%',
      cardFee: '5,49%',
      color: 'yellow',
      fields: [
        { name: 'email', label: 'Email', type: 'email', placeholder: 'seu@email.com' },
        { name: 'token', label: 'Token', type: 'text', placeholder: 'Seu token PagSeguro' }
      ]
    },
    {
      id: 'efi' as GatewayProvider,
      name: 'Efi Pay',
      pixFee: '3,49%',
      cardFee: '5,49%',
      color: 'purple',
      fields: [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Client ID' },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Client Secret' }
      ]
    }
  ];

  const handleManualSubmit = async () => {
    if (!manualType) {
      toast.error('Escolha o tipo de pagamento manual');
      return;
    }

    if (manualType === 'pix_in_system' && (!pixKey || !pixKeyType)) {
      toast.error('Preencha sua chave PIX');
      return;
    }

    setLoading(true);

    try {
      await onboardingAPI.setupManualPayment({
        manualType,
        pixKey: manualType === 'pix_in_system' ? pixKey : undefined,
        pixKeyType: manualType === 'pix_in_system' ? pixKeyType : undefined
      });

      toast.success('Pagamento manual configurado!');
      onNext();
    } catch (error) {
      console.error('Erro:', error);
      // Erro já tratado pelo interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleAutomaticSubmit = async () => {
    if (!selectedGateway) {
      toast.error('Escolha um gateway');
      return;
    }

    const gateway = gateways.find(g => g.id === selectedGateway);
    if (!gateway) return;

    // Validar se todos os campos obrigatórios foram preenchidos
    const missingFields = gateway.fields.filter(field => !gatewayCredentials[field.name]);
    if (missingFields.length > 0) {
      toast.error('Preencha todas as credenciais');
      return;
    }

    setLoading(true);

    try {
      await onboardingAPI.setupAutomaticPayment({
        provider: selectedGateway,
        credentials: gatewayCredentials
      });

      toast.success(`${gateway.name} configurado!`);
      onNext();
    } catch (error) {
      console.error('Erro:', error);
      // Erro já tratado pelo interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);

    try {
      await onboardingAPI.skipPayment();
      toast.success('Você pode configurar depois!');
      onSkip();
    } catch (error) {
      console.error('Erro:', error);
      // Erro já tratado pelo interceptor
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'choose') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <DollarSign size={32} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Receber Pagamentos</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Como você quer receber dos seus alunos?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Manual */}
          <button
            onClick={() => setMode('manual')}
            className="group relative p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all text-left"
          >
            <Smartphone className="w-8 h-8 text-purple-600 mb-3" />
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Receber Manualmente</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              PIX direto ou gerenciar externamente
            </p>
            <ChevronRight className="absolute right-4 bottom-6 w-5 h-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
          </button>

          {/* Automático */}
          <button
            onClick={() => setMode('automatic')}
            className="group relative p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all text-left"
          >
            <CreditCard className="w-8 h-8 text-indigo-600 mb-3" />
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Receber Automaticamente</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Gateway de pagamento integrado
            </p>
            <ChevronRight className="absolute right-4 bottom-6 w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        <button
          onClick={handleSkip}
          disabled={loading}
          className="w-full py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
        >
          Configurar Depois
        </button>
      </div>
    );
  }

  if (mode === 'manual') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone size={32} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Pagamento Manual</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Escolha como gerenciar os pagamentos
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setManualType('pix_in_system')}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
              manualType === 'pix_in_system'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">PIX no Sistema</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">Alunos pagam via PIX dentro da plataforma</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 ${
                manualType === 'pix_in_system'
                  ? 'border-purple-500 bg-purple-500'
                  : 'border-slate-300 dark:border-slate-600'
              }`} />
            </div>
          </button>

          <button
            onClick={() => setManualType('external')}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
              manualType === 'external'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">Fora do Sistema</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">Gerenciar pagamentos externamente</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 ${
                manualType === 'external'
                  ? 'border-purple-500 bg-purple-500'
                  : 'border-slate-300 dark:border-slate-600'
              }`} />
            </div>
          </button>
        </div>

        {manualType === 'pix_in_system' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tipo de Chave PIX
              </label>
              <select
                value={pixKeyType}
                onChange={(e) => setPixKeyType(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">Email</option>
                <option value="phone">Telefone</option>
                <option value="random">Chave Aleatória</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Chave PIX
              </label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Sua chave PIX"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setMode('choose')}
            className="flex-1 py-3 px-6 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={handleManualSubmit}
            disabled={loading || !manualType || (manualType === 'pix_in_system' && !pixKey)}
            className="flex-1 py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg"
          >
            {loading ? 'Salvando...' : 'Continuar'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'automatic') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCard size={32} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Gateway de Pagamento</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Escolha um gateway e configure suas credenciais
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {gateways.map((gateway) => (
            <button
              key={gateway.id}
              onClick={() => setSelectedGateway(gateway.id)}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                selectedGateway === gateway.id
                  ? `border-${gateway.color}-500 bg-${gateway.color}-50 dark:bg-${gateway.color}-900/20`
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              {gateway.highlight && (
                <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {gateway.highlight}
                </span>
              )}
              <h4 className="font-bold text-slate-900 dark:text-white mb-1">{gateway.name}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                PIX: {gateway.pixFee} | Cartão: {gateway.cardFee}
              </p>
            </button>
          ))}
        </div>

        {selectedGateway && (() => {
          const gateway = gateways.find(g => g.id === selectedGateway);
          if (!gateway) return null;

          return (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <a href={`https://${gateway.id}.com`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                    Criar conta no {gateway.name} <ExternalLink size={14} />
                  </a> e obtenha suas credenciais.
                </p>
              </div>

              {gateway.fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={gatewayCredentials[field.name] || ''}
                    onChange={(e) => setGatewayCredentials({ ...gatewayCredentials, [field.name]: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
          );
        })()}

        <div className="flex gap-3">
          <button
            onClick={() => setMode('choose')}
            className="flex-1 py-3 px-6 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={handleAutomaticSubmit}
            disabled={loading || !selectedGateway}
            className="flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg"
          >
            {loading ? 'Salvando...' : 'Continuar'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};
