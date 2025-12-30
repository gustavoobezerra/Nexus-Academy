import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Step4_Success } from './Step4_Success';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import apiService from '../../services/api.service';

/**
 * Página de callback após Stripe Checkout
 * URL: /onboarding/success?session_id=xxx
 *
 * Esta página:
 * 1. Recebe session_id do Stripe
 * 2. Aguarda webhook processar (pode demorar alguns segundos)
 * 3. Busca dados atualizados do usuário
 * 4. Mostra tela de sucesso (Step4)
 */
export const OnboardingSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const token = localStorage.getItem('token');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
      setError('Session ID não encontrado');
      setLoading(false);
      return;
    }

    // Verificar se onboarding foi completado
    // Como o webhook pode demorar, tentamos algumas vezes
    const checkOnboardingStatus = async () => {
      try {
        const data = await apiService.get<{ success: boolean; user: any }>('/auth/me');

        if (data.success && data.user) {
          // Atualizar store com dados mais recentes
          setAuth(data.user, token || '');

          // Verificar se onboarding foi completado
          if (data.user.onboardingCompletedAt) {
            setLoading(false);
            return;
          }

          // Se não completou ainda e já tentou 10 vezes (10 segundos), completar manualmente
          if (attempts >= 10) {
            console.log('Webhook não processou a tempo, completando manualmente...');
            await completeOnboardingManually();
            return;
          }

          // Tentar novamente em 1 segundo
          setAttempts(prev => prev + 1);
          setTimeout(checkOnboardingStatus, 1000);
        } else {
          setError('Erro ao buscar dados do usuário');
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro ao verificar status:', err);
        setError('Erro ao verificar status do onboarding');
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [sessionId, token, attempts]);

  const completeOnboardingManually = async () => {
    try {
      const data = await apiService.post<{ success: boolean; user: any; message?: string }>(
        '/onboarding/complete'
      );

      if (data.success) {
        // Atualizar user no store
        setAuth(data.user, token || '');
        setLoading(false);
      } else {
        setError(data.message || 'Erro ao completar onboarding');
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro ao completar onboarding:', err);
      setError('Erro ao completar onboarding');
      setLoading(false);
    }
  };

  const handleFinish = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Processando seu pagamento...</h2>
          <p className="text-slate-400">
            Aguarde enquanto confirmamos sua assinatura
            {attempts > 0 && ` (${attempts}/10)`}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-slate-800">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Ops! Algo deu errado</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <button
              onClick={() => navigate('/onboarding')}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
            >
              Voltar para Onboarding
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sucesso! Mostrar Step4
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl p-8 md:p-12 max-w-3xl w-full border border-slate-800">
        <Step4_Success
          slug={user?.slug || ''}
          onFinish={handleFinish}
        />
      </div>
    </div>
  );
};

export default OnboardingSuccess;
