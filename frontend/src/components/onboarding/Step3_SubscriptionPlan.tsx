import { useState } from 'react';
import { Crown, Check, Sparkles, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface Step3Props {
  onNext: () => void;
}

type Plan = 'basic' | 'pro';

export const Step3_SubscriptionPlan = ({ onNext }: Step3Props) => {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('token');

  const plans = [
    {
      id: 'basic' as Plan,
      name: 'Plano Básico',
      price: 97,
      features: [
        'Até 30 alunos',
        'Aulas ao vivo',
        'Chat com alunos',
        'Relatórios básicos',
        'Gamificação',
        'Calendário'
      ],
      icon: Users,
      color: 'indigo'
    },
    {
      id: 'pro' as Plan,
      name: 'Plano Pro',
      price: 197,
      features: [
        'Alunos ilimitados',
        'Tudo do Básico +',
        'IA para preparação de aulas',
        'Automações avançadas',
        'Analytics completo',
        'API access',
        'Suporte prioritário'
      ],
      icon: Crown,
      color: 'purple',
      popular: true
    }
  ];

  const handleSubmit = async () => {
    if (!selectedPlan) {
      toast.error('Escolha um plano');
      return;
    }

    setLoading(true);

    try {
      // Criar sessão de checkout do Stripe
      const response = await fetch(`${API_URL}/onboarding/create-subscription-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: selectedPlan })
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        // Redirecionar para Stripe Checkout
        window.location.href = data.checkoutUrl;
      } else {
        toast.error(data.message || 'Erro ao criar sessão de pagamento');
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      toast.error('Erro ao processar pagamento');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <Sparkles size={32} />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Assinatura Nexus Academy</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Escolha seu plano e comece com 30 dias grátis!
        </p>
        <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-semibold border border-emerald-200 dark:border-emerald-800">
          <Check size={16} />
          <span>30 dias de teste grátis em todos os planos</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isSelected = selectedPlan === plan.id;

          return (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                isSelected
                  ? `border-${plan.color}-500 bg-${plan.color}-50 dark:bg-${plan.color}-900/20 shadow-xl scale-105`
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    <Sparkles size={12} /> Mais Popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br from-${plan.color}-500 to-${plan.color}-600 text-white rounded-xl flex items-center justify-center`}>
                  <Icon size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-slate-900 dark:text-white">{plan.name}</h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">R$ {plan.price}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">/mês</span>
                  </div>
                </div>
              </div>

              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <div className={`w-5 h-5 rounded-full bg-${plan.color}-100 dark:bg-${plan.color}-900/30 flex items-center justify-center flex-shrink-0`}>
                      <Check size={14} className={`text-${plan.color}-600 dark:text-${plan.color}-400`} />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className={`w-6 h-6 rounded-full border-2 absolute top-6 right-6 flex items-center justify-center ${
                isSelected
                  ? `border-${plan.color}-500 bg-${plan.color}-500`
                  : 'border-slate-300 dark:border-slate-600'
              }`}>
                {isSelected && <Check size={16} className="text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-900/30">
        <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400" />
          O que está incluído no trial gratuito:
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700 dark:text-slate-300">
          <li className="flex items-center gap-2">
            <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
            30 dias completos de acesso
          </li>
          <li className="flex items-center gap-2">
            <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
            Sem cobranças antecipadas
          </li>
          <li className="flex items-center gap-2">
            <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
            Cancele quando quiser
          </li>
          <li className="flex items-center gap-2">
            <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
            Todos os recursos liberados
          </li>
        </ul>
      </div>

      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={loading || !selectedPlan}
          className="w-full md:w-auto px-12 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition-all shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95"
        >
          {loading ? 'Processando...' : 'Começar Trial de 30 Dias 🎉'}
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Você será redirecionado para o Stripe para cadastrar seu cartão de forma segura.
        </p>
      </div>
    </div>
  );
};
