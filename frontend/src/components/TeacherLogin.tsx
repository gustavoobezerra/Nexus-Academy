import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Mail, Lock, AlertCircle, ArrowLeft, Eye, EyeOff, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { formatPhoneBR } from '../utils/security';
import { FadeContent, BlurText, GradientText, StaggerContainer, StaggerItem, MagneticButton } from './ui/Animations';
import { authAPI } from '../lib/api';

export const TeacherLogin = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await authAPI.login({ email, password });

      setAuth(data.user, data.token);
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error) {
      // Erro já tratado pelo interceptor, fallback para demo
      const demoUser = {
        id: 'demo_teacher',
        name: 'Professor Demo',
        email: email || 'demo@nexus.com',
        role: 'teacher'
      };
      setAuth(demoUser, 'demo-token');
      toast.success('Login demo realizado!');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const data = await authAPI.register({ name, email, password, phone });

      setAuth(data.user, data.token);
      toast.success('Conta criada com sucesso!');

      // Redirecionar para onboarding se é novo usuário
      if (data.user.status === 'pending_setup' || !data.user.onboardingCompletedAt) {
        navigate('/onboarding');
      } else {
        navigate('/');
      }
    } catch (error) {
      // Erro já tratado pelo interceptor, fallback demo
      const demoUser = {
        id: 'new_teacher',
        name: name || 'Novo Professor',
        email: email,
        role: 'teacher'
      };
      setAuth(demoUser, 'demo-token');
      toast.success('Conta demo criada!');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 focus:outline-none transition-all duration-200";

  return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-25%] left-[-15%] w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[500px] h-[500px] bg-indigo-500/8 rounded-full blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back Button */}
        <FadeContent delay={0} duration={0.4}>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="text-sm">Voltar</span>
          </button>
        </FadeContent>

        <FadeContent delay={0.1} duration={0.6} blur>
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-800/60 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl mb-4 shadow-lg shadow-purple-500/20">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {isRegistering ? 'Criar Conta' : (
                  <GradientText
                    text="Área do Professor"
                    colors={['#a78bfa', '#c4b5fd', '#a78bfa']}
                    animationSpeed={5}
                  />
                )}
              </h1>
              <BlurText
                text={isRegistering ? 'Preencha os dados para começar' : 'Entre na sua plataforma de gestão'}
                className="text-slate-400 text-sm"
                delay={0.2}
              />
            </div>

            {/* Form */}
            <form onSubmit={isRegistering ? handleRegister : handleLogin}>
              <div className="space-y-4">
                {isRegistering && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Nome Completo
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          autoComplete="name"
                          className={inputClasses}
                          placeholder="Seu nome completo"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Telefone (opcional)
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                          autoComplete="tel"
                          className={inputClasses}
                          placeholder="(99) 99999-9999"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className={inputClasses}
                      placeholder="professor@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={isRegistering ? 'new-password' : 'current-password'}
                      className={`${inputClasses} pr-12`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {isRegistering && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Confirmar Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        className={inputClasses}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3.5 rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
                  >
                    {loading
                      ? (isRegistering ? 'Criando...' : 'Entrando...')
                      : (isRegistering ? 'Criar Conta' : 'Entrar')}
                  </button>
                </div>
              </div>
            </form>

            {/* Toggle Register/Login */}
            <FadeContent delay={0.6} duration={0.4}>
              <div className="mt-6 text-center">
                <p className="text-slate-400 text-sm">
                  {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
                  <button
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="ml-2 text-purple-400 hover:text-purple-300 font-medium transition-colors"
                  >
                    {isRegistering ? 'Fazer login' : 'Criar conta'}
                  </button>
                </p>
              </div>
            </FadeContent>

            {/* Demo Notice */}
            <FadeContent delay={0.7} duration={0.4}>
              <div className="mt-6 p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Modo Demo:</strong> Entre com qualquer email/senha para explorar a plataforma.
                </p>
              </div>
            </FadeContent>
          </div>
        </FadeContent>

        {/* Footer */}
        <FadeContent delay={0.8} duration={0.4}>
          <p className="text-center text-slate-600 text-sm mt-6">
            Nexus Academy © 2025
          </p>
        </FadeContent>
      </div>
    </div>
  );
};

export default TeacherLogin;
