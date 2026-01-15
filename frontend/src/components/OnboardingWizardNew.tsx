import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Step1_SlugSelection } from './onboarding/Step1_SlugSelection';
import { Step2_PaymentSetup } from './onboarding/Step2_PaymentSetup';
import { Step3_SubscriptionPlan } from './onboarding/Step3_SubscriptionPlan';
import { Step4_Success } from './onboarding/Step4_Success';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

type OnboardingStep = 1 | 2 | 3 | 4;

interface OnboardingWizardNewProps {
  onComplete: () => void;
}

export const OnboardingWizardNew = ({ onComplete }: OnboardingWizardNewProps) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [slug, setSlug] = useState('');
  const totalSteps = 4;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('token');

  // Verificar se já tem slug salvo
  useEffect(() => {
    if (user?.slug) {
      // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
      setSlug(user.slug);
      // Se já tem slug, pular para step 2
      setCurrentStep(2);
    }
  }, [user]);

  const handleStep1Complete = (selectedSlug: string) => {
    setSlug(selectedSlug);
    setCurrentStep(2);
  };

  const handleStep2Complete = () => {
    setCurrentStep(3);
  };

  const handleStep2Skip = () => {
    setCurrentStep(3);
  };

  const handleStep3Complete = () => {
    // Step 3 redireciona para Stripe, então quando voltar será para success
    // Isso será tratado pela rota /onboarding/success
  };

  const handleFinish = async () => {
    try {
      // Marcar onboarding como completo
      const response = await fetch(`${API_URL}/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Bem-vindo ao Nexus Academy!');
        onComplete();
        navigate('/');
      } else {
        toast.error(data.message || 'Erro ao completar onboarding');
      }
    } catch (error) {
      console.error('Erro ao completar onboarding:', error);
      toast.error('Erro ao finalizar configuração');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1_SlugSelection
            onNext={handleStep1Complete}
            userName={user?.name || ''}
          />
        );
      case 2:
        return (
          <Step2_PaymentSetup
            onNext={handleStep2Complete}
            onSkip={handleStep2Skip}
          />
        );
      case 3:
        return (
          <Step3_SubscriptionPlan
            onNext={handleStep3Complete}
          />
        );
      case 4:
        return (
          <Step4_Success
            slug={slug}
            onFinish={handleFinish}
          />
        );
      default:
        return null;
    }
  };

  // Permitir navegação manual dos steps (exceto step 4 que é após stripe)
  const canNavigateToStep = (step: OnboardingStep): boolean => {
    if (step === 1) return true;
    if (step === 2) return !!slug;
    if (step === 3) return !!slug;
    if (step === 4) return false; // Step 4 só após Stripe
    return false;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 my-8">
        {/* Progress Bar */}
        <div className="relative">
          <div className="flex h-2 bg-slate-100 dark:bg-slate-800">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 transition-all duration-500 ${
                  step <= currentStep
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Step indicators */}
          <div className="absolute top-0 left-0 right-0 flex justify-between px-8 transform -translate-y-1/2">
            {[1, 2, 3, 4].map((step) => (
              <button
                key={step}
                onClick={() => canNavigateToStep(step as OnboardingStep) && setCurrentStep(step as OnboardingStep)}
                disabled={!canNavigateToStep(step as OnboardingStep)}
                className={`w-8 h-8 rounded-full border-4 border-white dark:border-slate-900 transition-all duration-300 flex items-center justify-center text-xs font-bold ${
                  step <= currentStep
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                } ${canNavigateToStep(step as OnboardingStep) && step !== currentStep ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
              >
                {step}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12">
          <div className="mb-6 text-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Passo {currentStep} de {totalSteps}
            </p>
          </div>

          {renderStep()}
        </div>

        {/* Footer info */}
        <div className="px-8 md:px-12 pb-8">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
              {currentStep === 1 && '🔗 Crie seu link único para compartilhar com seus alunos'}
              {currentStep === 2 && '💰 Configure como você vai receber pagamentos dos alunos'}
              {currentStep === 3 && '🎁 Escolha seu plano e ganhe 30 dias grátis'}
              {currentStep === 4 && '🎉 Tudo pronto! Bem-vindo ao Nexus Academy'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizardNew;
