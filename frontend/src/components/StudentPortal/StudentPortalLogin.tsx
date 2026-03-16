import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowLeft, Eye, EyeOff, User, Phone, Calendar, BookOpen, LogIn, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { FadeContent, BlurText, GradientText, MagneticButton } from '../ui/Animations';
import { portalAPI } from '../../lib/api';
import { formatPhoneBR } from '../../utils/security';
import BrandLogo from '../BrandLogo';

interface SavedStudent {
  id: string;
  name: string;
  email: string;
  grade?: string;
  avatar?: string;
}

export const StudentPortalLogin = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedStudent, setSavedStudent] = useState<SavedStudent | null>(null);
  const [showFullLogin, setShowFullLogin] = useState(false);
  const navigate = useNavigate();

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [grade, setGrade] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const parsedAge = parseInt(age, 10);
  const isMinor = age ? !Number.isNaN(parsedAge) && parsedAge < 18 : true;

  const location = useLocation();
  // Check for saved student on mount
  useEffect(() => {
    const savedStudentData = localStorage.getItem('savedStudent');
    if (savedStudentData) {
      try {
        const parsed = JSON.parse(savedStudentData);
        // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
        setSavedStudent(parsed);
        setEmail(parsed.email);
      } catch {
        localStorage.removeItem('savedStudent');
      }
    }
  }, []);

  const handleQuickLogin = async () => {
    if (!savedStudent) return;

    // Show password input for quick login
    setShowFullLogin(true);
  };

  const handleForgetStudent = () => {
    localStorage.removeItem('savedStudent');
    setSavedStudent(null);
    setEmail('');
    setShowFullLogin(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await portalAPI.login(email, password);
      const redirectParam = new URLSearchParams(location.search).get('redirect');
      const safeRedirect = redirectParam && redirectParam.startsWith('/portal')
        ? redirectParam
        : null;

      // Sucesso - portalAPI já tratou erros automaticamente
      localStorage.setItem('studentToken', data.token);
      localStorage.setItem('student', JSON.stringify(data.student));

      // Save student for quick login next time
      localStorage.setItem('savedStudent', JSON.stringify({
        id: data.student.id,
        name: data.student.name,
        email: data.student.email,
        grade: data.student.grade,
        avatar: data.student.profile?.avatar
      }));

      toast.success(`Bem-vindo, ${data.student.name.split(' ')[0]}!`);

      // Check if onboarding was completed
      if (!data.student.onboardingCompleted) {
        navigate('/portal/onboarding');
      } else {
        navigate(safeRedirect || '/portal/dashboard');
      }
    } catch (error: any) {
      // Mostrar erro específico ou mensagem genérica
      const message = error?.message || 'Erro ao fazer login. Verifique suas credenciais.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações no frontend
    if (!name.trim() || !email.trim() || !age.trim() || !grade.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (Number.isNaN(parsedAge) || parsedAge < 3 || parsedAge > 120) {
      toast.error('Idade deve estar entre 3 e 120 anos');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (isMinor) {
      if (!parentName.trim() || !parentPhone.trim() || !parentEmail.trim()) {
        toast.error('Dados do responsável são obrigatórios para menores de 18 anos');
        return;
      }

      if (!parentEmail.includes('@')) {
        toast.error('Email do responsável inválido');
        return;
      }
    }

    setLoading(true);

    try {
      const registerData: Record<string, unknown> = {
        name,
        email,
        password,
        age: parsedAge,
        grade
      };

      if (isMinor) {
        registerData.parentName = parentName;
        registerData.parentPhone = parentPhone;
        registerData.parentEmail = parentEmail;
      }

      const data = await portalAPI.register(registerData);

      // Sucesso
      localStorage.setItem('studentToken', data.token);
      localStorage.setItem('student', JSON.stringify(data.student));
      localStorage.setItem('studentData', JSON.stringify(data.student));
      localStorage.setItem('savedStudent', JSON.stringify({
        id: data.student.id,
        name: data.student.name,
        email: data.student.email,
        grade: data.student.grade
      }));

      toast.success(`Bem-vindo ao Nexus Academy, ${data.student.name.split(' ')[0]}!`);

      // Always go to onboarding after registration
      navigate('/portal/onboarding');
    } catch (error: any) {
      // Mostrar erro específico ou mensagem genérica
      const message = error?.message || 'Erro ao criar conta. Tente novamente.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:outline-none transition-all duration-200 text-sm";
  const inputClassesSmall = "w-full pl-11 pr-3 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:outline-none transition-all duration-200 text-sm";

  // Quick login view for returning students
  if (savedStudent && !showFullLogin && !isRegistering) {
    return (
      <div className="min-h-screen bg-[#0f0f13] flex flex-col relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-25%] left-[-15%] w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-25%] right-[-15%] w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[150px]" />
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

        <div className="flex-1 flex items-center justify-center p-4 relative z-10">
          <div className="w-full max-w-md">
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
                <div className="text-center mb-6">
                  <div className="mb-4 flex justify-center">
                    <BrandLogo variant="mark" theme="dark" size="md" />
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    Bem-vindo de volta!
                  </h1>
                  <BlurText
                    text="Clique para entrar rapidamente"
                    className="text-slate-400 text-sm"
                    delay={0.2}
                  />
                </div>

                {/* Saved Student Card */}
                <div
                  onClick={handleQuickLogin}
                  className="group relative bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/50 rounded-2xl p-6 cursor-pointer hover:border-indigo-500/50 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {savedStudent.avatar ? (
                        <img
                          src={savedStudent.avatar}
                          alt={savedStudent.name}
                          className="w-full h-full rounded-2xl object-cover"
                        />
                      ) : (
                        savedStudent.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white truncate">
                        {savedStudent.name}
                      </h3>
                      <p className="text-slate-400 text-sm truncate">
                        {savedStudent.email}
                      </p>
                      {savedStudent.grade && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded-full">
                          {savedStudent.grade}
                        </span>
                      )}
                    </div>

                    {/* Enter Icon */}
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center group-hover:bg-indigo-500 transition-all duration-300">
                      <LogIn className="w-5 h-5 text-indigo-400 group-hover:text-white transition-colors" />
                    </div>
                  </div>

                  {/* Hover Glow */}
                  <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>

                {/* Other Actions */}
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => setShowFullLogin(true)}
                    className="w-full py-3 text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    Entrar com outra conta
                  </button>

                  <button
                    onClick={handleForgetStudent}
                    className="w-full py-2 text-slate-500 hover:text-red-400 text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={14} />
                    Remover conta salva
                  </button>
                </div>

                {/* Info */}
                <FadeContent delay={0.4} duration={0.4}>
                  <div className="mt-5 p-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Sua conta está salva neste dispositivo. Clique para entrar rapidamente.
                    </p>
                  </div>
                </FadeContent>
              </div>
            </FadeContent>
          </div>
        </div>

        <div className="relative z-10 pb-6 text-center text-slate-600 text-sm">
          Nexus Academy © 2025
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-25%] left-[-15%] w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[150px]" />
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

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <FadeContent delay={0} duration={0.4}>
            <button
              onClick={() => savedStudent && !isRegistering ? setShowFullLogin(false) : navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="text-sm">{savedStudent && !isRegistering ? 'Voltar' : 'Voltar ao início'}</span>
            </button>
          </FadeContent>

          <FadeContent delay={0.1} duration={0.6} blur>
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-800/60 shadow-2xl">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="mb-4 flex justify-center">
                  <BrandLogo variant="mark" theme="dark" size="md" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  {isRegistering ? 'Criar Conta' : (
                    <GradientText
                      text="Portal do Aluno"
                      colors={['#818cf8', '#a5b4fc', '#818cf8']}
                      animationSpeed={5}
                    />
                  )}
                </h1>
                <BlurText
                  text={isRegistering ? 'Preencha os dados para começar' : savedStudent ? `Olá, ${savedStudent.name.split(' ')[0]}!` : 'Acesse suas aulas e progresso'}
                  className="text-slate-400 text-sm"
                  delay={0.2}
                />
              </div>

              {/* Form */}
              <form onSubmit={isRegistering ? handleRegister : handleLogin} noValidate>
              <div className="space-y-3">
                {isRegistering && (
                  <>
                    {/* Student Info Section */}
                    <div>
                      <div className="border-b border-slate-700/30 pb-3 mb-3">
                        <p className="text-xs uppercase tracking-wider text-indigo-400/80 font-medium">Dados do Aluno</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Nome Completo
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className={inputClasses}
                          placeholder="Seu nome completo"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Idade
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                              type="number"
                              value={age}
                              onChange={(e) => setAge(e.target.value)}
                              min="5"
                              max="99"
                              className={inputClassesSmall}
                              placeholder="14"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Série/Ano
                          </label>
                          <div className="relative">
                            <BookOpen className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                              type="text"
                              value={grade}
                              onChange={(e) => setGrade(e.target.value)}
                              className={inputClassesSmall}
                              placeholder="9º Ano"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {isMinor && (
                      <>
                        {/* Parent Info Section */}
                        <div>
                          <div className="border-b border-slate-700/30 pb-3 mb-3 mt-4">
                            <p className="text-xs uppercase tracking-wider text-indigo-400/80 font-medium">Dados do Responsável</p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Nome do Responsável
                          </label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                              type="text"
                              value={parentName}
                              onChange={(e) => setParentName(e.target.value)}
                              className={inputClasses}
                              placeholder="Nome do pai/mãe"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Telefone
                              </label>
                              <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                  type="tel"
                                  value={parentPhone}
                                  onChange={(e) => setParentPhone(formatPhoneBR(e.target.value))}
                                  className={inputClassesSmall}
                                  placeholder="(99) 99999"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Email
                              </label>
                              <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                  type="email"
                                  value={parentEmail}
                                  onChange={(e) => setParentEmail(e.target.value)}
                                  className={inputClassesSmall}
                                  placeholder="email@"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Access Section */}
                    <div>
                      <div className="border-b border-slate-700/30 pb-3 mb-3 mt-4">
                        <p className="text-xs uppercase tracking-wider text-indigo-400/80 font-medium">Dados de Acesso</p>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Email {isRegistering && 'de Acesso'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClasses}
                      placeholder="seu@email.com"
                      disabled={!!savedStudent && !isRegistering}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClasses} pr-12`}
                      placeholder="••••••••"
                      autoFocus={!!savedStudent && !isRegistering}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isRegistering && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Confirmar Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={inputClasses}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <MagneticButton strength={0.1} className="w-full mt-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                    >
                      {loading
                        ? (isRegistering ? 'Criando...' : 'Entrando...')
                        : (isRegistering ? 'Criar Minha Conta' : 'Entrar')}
                    </button>
                  </MagneticButton>
                </div>
              </div>
            </form>

            {/* Toggle Register/Login */}
            <FadeContent delay={0.6} duration={0.4}>
              <div className="mt-5 text-center">
                <p className="text-slate-400 text-sm">
                  {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
                  <button
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="ml-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    {isRegistering ? 'Fazer login' : 'Cadastrar-se'}
                  </button>
                </p>
              </div>
            </FadeContent>

            {/* Info */}
            <FadeContent delay={0.7} duration={0.4}>
              <div className="mt-5 p-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isRegistering
                    ? 'Após o cadastro, você vai configurar seu perfil e metas de aprendizado.'
                    : 'Use o email e a senha cadastrados para acessar seu portal com segurança.'}
                </p>
              </div>
            </FadeContent>
          </div>
        </FadeContent>

        {/* Footer */}
        </div>
      </div>

      <FadeContent delay={0.8} duration={0.4}>
        <p className="relative z-10 pb-6 text-center text-slate-600 text-sm">
          Nexus Academy © 2025
        </p>
      </FadeContent>
    </div>
  );
};

export default StudentPortalLogin;
