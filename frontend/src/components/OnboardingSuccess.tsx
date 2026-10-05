import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, Copy, Share2, MessageCircle,
  Sparkles, ArrowRight, Loader2, Mail
} from 'lucide-react';
import toast from 'react-hot-toast';
import { onboardingAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export const OnboardingSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const completeOnboarding = async () => {
      try {
        const response = await onboardingAPI.complete();
        setUserData(response.data.user);
        toast.success('Onboarding completo!');

        // Marcar no localStorage
        localStorage.setItem('onboarding_completed', 'true');
      } catch (error: any) {
        console.error('Error completing onboarding:', error);
        toast.error('Erro ao completar onboarding');
      } finally {
        setLoading(false);
      }
    };

    completeOnboarding();
  }, []);

  const publicUrl = userData?.publicUrl || `${window.location.origin}/professor/${userData?.slug || user?.slug || 'seu-link'}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiado!');
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `🎓 Estou usando o Nexus Academy para gerenciar minhas aulas!\n\nAcesse meu link exclusivo:\n${publicUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Meu Link Exclusivo - Nexus Academy');
    const body = encodeURIComponent(
      `Olá!\n\nEstou usando o Nexus Academy para gerenciar minhas aulas e gostaria de compartilhar meu link exclusivo com você:\n\n${publicUrl}\n\nAcesse para ver mais informações sobre minhas aulas!`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-500 to-indigo-700 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 size={48} className="animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Finalizando configuração...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-500 to-indigo-700 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        {/* Success Header */}
        <div className="text-center mb-8 animate-in zoom-in duration-500">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mb-6 shadow-2xl">
            <CheckCircle size={56} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            🎉 Bem-vindo ao Nexus Academy! 🎉
          </h1>
          <p className="text-xl text-indigo-100">
            Sua conta está 100% configurada e pronta para usar!
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl mb-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles size={24} />
            Resumo da Configuração
          </h2>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-indigo-200 text-sm mb-1">Link Personalizado</p>
              <p className="text-white font-semibold text-lg break-all">
                {userData?.slug || user?.slug || 'seu-link'}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-indigo-200 text-sm mb-1">Plano</p>
              <p className="text-white font-semibold text-lg">
                {userData?.subscriptionPlan === 'basic' ? 'Básico' : 'Pro'}
                <span className="text-sm text-indigo-200 ml-2">
                  (trial até {new Date(userData?.trialEndsAt || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')})
                </span>
              </p>
            </div>
          </div>

          {/* Share Link Section */}
          <div className="bg-gradient-to-br from-white/20 to-white/10 rounded-2xl p-6 border border-white/30">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <Share2 size={20} />
              Compartilhe Seu Link
            </h3>
            <p className="text-indigo-100 text-sm mb-4">
              Este é o link que seus alunos usarão para acessar suas aulas:
            </p>
            <div className="flex items-center gap-2 p-4 bg-white rounded-xl mb-4">
              <code className="flex-1 text-indigo-900 font-mono text-sm break-all">
                {publicUrl}
              </code>
              <button
                onClick={() => copyToClipboard(publicUrl)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
              >
                <Copy size={16} />
                Copiar
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={shareViaWhatsApp}
                className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} />
                WhatsApp
              </button>
              <button
                onClick={shareViaEmail}
                className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                <Mail size={18} />
                Email
              </button>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl mb-6">
          <h2 className="text-2xl font-bold text-white mb-6">
            🚀 Próximos Passos
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-white/10 rounded-xl p-4 backdrop-blur-sm hover:bg-white/20 transition-all group">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-lg">1</span>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-1">Personalize Seu Perfil</h4>
                <p className="text-indigo-100 text-sm">
                  Adicione foto, bio e informações sobre suas aulas
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/10 rounded-xl p-4 backdrop-blur-sm hover:bg-white/20 transition-all group">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-lg">2</span>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-1">Adicione Seu Primeiro Aluno</h4>
                <p className="text-indigo-100 text-sm">
                  Comece a gerenciar sua turma e acompanhar o progresso
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/10 rounded-xl p-4 backdrop-blur-sm hover:bg-white/20 transition-all group">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-lg">3</span>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-1">Agende Sua Primeira Aula</h4>
                <p className="text-indigo-100 text-sm">
                  Use o calendário inteligente e deixe a IA cuidar da preparação
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <button
            onClick={() => {
              navigate('/');
              window.location.reload(); // Force reload to update auth state
            }}
            className="px-12 py-5 bg-white text-indigo-600 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-200 inline-flex items-center gap-3"
          >
            Ir para Meu Dashboard
            <ArrowRight size={24} />
          </button>
          <p className="text-indigo-100 text-sm mt-4">
            Você será redirecionado para seu painel de controle
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-indigo-200 text-sm">
            Precisa de ajuda? <a href="#" className="text-white underline hover:no-underline">Entre em contato</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingSuccess;
