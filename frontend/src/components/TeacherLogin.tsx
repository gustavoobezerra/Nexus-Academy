import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { formatPhoneBR } from '../utils/security';
import { FadeContent, BlurText } from './ui/Animations';
import { authAPI } from '../lib/api';
import { DEMO_TEACHER_CREDENTIALS } from '../mocks/demoData';
import BrandLogo from './BrandLogo';

type AuthError = {
  message?: string;
};

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as AuthError).message || fallbackMessage;
  }

  return fallbackMessage;
};

const registerHighlights = [
  'Cadastro com onboarding imediato.',
  'Persistência de autenticação preservada.',
  'Mesmo fluxo de validação já existente.'
];

/**
 * Tela do professor alinhada ao novo sistema editorial. O formulário continua
 * cumprindo as mesmas rotas e contratos, mas a hierarquia visual passa a
 * comunicar melhor o papel do painel autenticado.
 */
export const TeacherLogin = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const showDemoAccess = import.meta.env.DEV;

  const fillDemoCredentials = () => {
    setIsRegistering(false);
    setEmail(DEMO_TEACHER_CREDENTIALS.email);
    setPassword(DEMO_TEACHER_CREDENTIALS.password);
    setShowPassword(false);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const data = await authAPI.login({ email, password });

      setAuth(data.user, data.token);
      toast.success('Login realizado com sucesso!');

      if (data.user.status === 'pending_setup' || !data.user.onboardingCompletedAt) {
        navigate('/onboarding');
        return;
      }

      navigate('/');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Erro ao fazer login. Verifique suas credenciais.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      toast.error('A senha deve conter pelo menos uma letra maiúscula');
      return;
    }
    if (!/[a-z]/.test(password)) {
      toast.error('A senha deve conter pelo menos uma letra minúscula');
      return;
    }
    if (!/[0-9]/.test(password)) {
      toast.error('A senha deve conter pelo menos um número');
      return;
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      toast.error('A senha deve conter pelo menos um símbolo (!@#$%^&*...)');
      return;
    }

    setLoading(true);

    try {
      const data = await authAPI.register({ name, email, password, phone });

      setAuth(data.user, data.token);
      toast.success('Conta criada com sucesso!');

      if (data.user.status === 'pending_setup' || !data.user.onboardingCompletedAt) {
        navigate('/onboarding');
        return;
      }

      navigate('/');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Erro ao criar conta. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  const inputSpacingClass = 'pl-12 pr-4';

  return (
    <div className="nexus-shell relative min-h-screen overflow-x-hidden px-4 py-6 md:px-8 md:py-8 lg:px-10">
      <div className="nexus-grid-bg absolute inset-0 opacity-70" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.08),transparent_28%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
        <BrandLogo variant="horizontal" theme="auto" size="md" />
        <button type="button" onClick={() => navigate('/')} className="nexus-button-ghost">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
      </div>

      <div className="relative z-10 mx-auto mt-6 grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_0.95fr]">
        <FadeContent delay={0} duration={0.55}>
          <section className="nexus-panel-strong nexus-rule-card flex h-full flex-col justify-between rounded-[2rem] p-8 md:p-10 lg:p-12">
            <div className="space-y-6">
              <p className="nexus-kicker">Área do professor</p>
              <h1 className="max-w-xl text-[clamp(2.8rem,5vw,4.8rem)] leading-[0.94]">
                O centro de operação da sua rotina pedagógica.
              </h1>
              <p className="max-w-xl text-base leading-7 text-[var(--text-muted)] md:text-lg">
                Entre para gerenciar agenda, alunos, analytics e automações em uma
                superfície pensada para uso contínuo, com menos ruído e mais hierarquia.
              </p>
            </div>

            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {registerHighlights.map((highlight, index) => (
                <div
                  key={highlight}
                  className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4"
                >
                  <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-[var(--brand-indigo)]">
                    0{index + 1}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
                    {highlight}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 border-t border-[var(--border-soft)] pt-6">
              <BlurText
                text="Cadastro e login continuam apontando para os mesmos endpoints e mantêm a mesma persistência de autenticação do projeto."
                className="block max-w-xl text-sm leading-6 text-[var(--text-muted)]"
                delay={0.2}
              />
            </div>
          </section>
        </FadeContent>

        <FadeContent delay={0.1} duration={0.55}>
          <section className="nexus-panel rounded-[2rem] p-6 md:p-8 lg:p-10">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="nexus-kicker">Acesso</p>
                  <h2 className="mt-3 text-4xl leading-none">
                    {isRegistering ? 'Criar conta' : 'Entrar'}
                  </h2>
                </div>
                <div className="flex h-10 items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] p-1">
                  <button
                    type="button"
                    onClick={() => setIsRegistering(false)}
                    className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                      !isRegistering
                        ? 'bg-[var(--brand-indigo)] text-white'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRegistering(true)}
                    className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                      isRegistering
                        ? 'bg-[var(--brand-indigo)] text-white'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    Criar conta
                  </button>
                </div>
              </div>

              <p className="text-sm leading-6 text-[var(--text-muted)]">
                {isRegistering
                  ? 'Preencha os dados para iniciar o onboarding e configurar sua área de trabalho.'
                  : 'Use seu email e senha para acessar o painel autenticado do professor.'}
              </p>

              {showDemoAccess && !isRegistering && (
                <div className="rounded-[1.5rem] border border-[rgba(79,70,229,0.18)] bg-[rgba(79,70,229,0.06)] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="nexus-kicker">Conta demo local</p>
                      <p className="mt-3 text-sm font-semibold text-[var(--text-strong)]">
                        {DEMO_TEACHER_CREDENTIALS.email}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Senha: {DEMO_TEACHER_CREDENTIALS.password}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={fillDemoCredentials}
                      className="nexus-button-secondary self-start"
                    >
                      Usar dados de exemplo
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
                {isRegistering && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[var(--text-muted)]">
                        Nome completo
                      </label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-soft)]" />
                        <input
                          type="text"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          required
                          autoComplete="name"
                          className={`nexus-input ${inputSpacingClass}`}
                          placeholder="Seu nome completo"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[var(--text-muted)]">
                        Telefone (opcional)
                      </label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-soft)]" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(event) => setPhone(formatPhoneBR(event.target.value))}
                          autoComplete="tel"
                          className={`nexus-input ${inputSpacingClass}`}
                          placeholder="(99) 99999-9999"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--text-muted)]">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-soft)]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      autoComplete="email"
                      className={`nexus-input ${inputSpacingClass}`}
                      placeholder="professor@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--text-muted)]">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-soft)]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      autoComplete={isRegistering ? 'new-password' : 'current-password'}
                      className={`nexus-input ${inputSpacingClass} pr-12`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((previousValue) => !previousValue)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-soft)] transition-colors hover:text-[var(--text-strong)]"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {isRegistering && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[var(--text-muted)]">
                      Confirmar senha
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-soft)]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        required
                        autoComplete="new-password"
                        className={`nexus-input ${inputSpacingClass}`}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )}

                {isRegistering && (
                  <div className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
                    <p className="text-sm font-bold text-[var(--text-strong)]">
                      Regras da senha
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-muted)]">
                      <li>Pelo menos 8 caracteres.</li>
                      <li>Inclua uma letra maiúscula, uma minúscula e um número.</li>
                      <li>Adicione ao menos um símbolo para concluir o cadastro.</li>
                    </ul>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <button type="submit" disabled={loading} className="nexus-button-primary flex-1">
                    {loading
                      ? (isRegistering ? 'Criando...' : 'Entrando...')
                      : (isRegistering ? 'Criar conta' : 'Entrar')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRegistering((previousValue) => !previousValue)}
                    className="nexus-button-secondary flex-1"
                  >
                    {isRegistering ? 'Já tenho conta' : 'Criar uma conta'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </FadeContent>
      </div>
    </div>
  );
};

export default TeacherLogin;
