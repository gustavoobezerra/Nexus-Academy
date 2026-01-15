import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, Lock, User, ArrowRight, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/api.service';
import { formatPhoneBR } from '../../utils/security';

export function StudentRegister() {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teacher, setTeacher] = useState<any>(null);

  // Extrair slug da URL manualmente se useParams não funcionar
  // A URL é /professor/nome-do-professor
  const extractSlugFromPath = (): string | null => {
    const path = location.pathname;
    const match = path.match(/\/professor\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const rawSlug = paramSlug || extractSlugFromPath();
  const normalizedSlug = rawSlug ? rawSlug.trim().toLowerCase() : null;
  const isValidSlug = !!normalizedSlug && /^[a-z0-9-]+$/.test(normalizedSlug) && normalizedSlug.length >= 3;
  const slug = isValidSlug ? normalizedSlug : null;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    grade: '',
    parentName: '',
    parentEmail: '',
    parentPhone: ''
  });

  // Verifica se é menor de idade para mostrar campos do responsável
  const isMinor = formData.age ? parseInt(formData.age) < 18 : true;

  useEffect(() => {
    const fetchTeacher = async () => {
      if (!slug) {
        toast.error('Link do professor invalido');
        // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
        setLoading(false);
        navigate('/');
        return;
      }

      try {
        const response = await apiService.get(`/auth/teacher/${slug}`) as any;
        // apiService já retorna response.data diretamente
        if (response.success) {
          setTeacher(response.teacher);
        } else {
          toast.error('Professor não encontrado');
          navigate('/');
        }
      } catch (error: unknown) {
        console.error('Erro ao buscar professor:', error);
        toast.error(error.message || 'Erro ao buscar professor');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchTeacher();
  }, [slug, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name: fieldName, value } = e.target;
    const formattedValue = fieldName === 'parentPhone' ? formatPhoneBR(value) : value;

    setFormData({
      ...formData,
      [fieldName]: formattedValue
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    const age = parseInt(formData.age);
    if (isNaN(age) || age < 3 || age > 120) {
      toast.error('A idade deve estar entre 3 e 120 anos');
      return;
    }

    // Validar dados do responsável apenas para menores de 18
    if (age < 18) {
      if (!formData.parentName.trim()) {
        toast.error('Nome do responsável é obrigatório para menores de 18 anos');
        return;
      }
      if (!formData.parentEmail.trim()) {
        toast.error('Email do responsável é obrigatório para menores de 18 anos');
        return;
      }
      if (!formData.parentPhone.trim()) {
        toast.error('Telefone do responsável é obrigatório para menores de 18 anos');
        return;
      }
    }

    setSubmitting(true);

    try {
      // Preparar dados - incluir responsável apenas se menor de 18
      const registerData: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        age: formData.age,
        grade: formData.grade,
        teacherId: teacher.id
      };

      // Adicionar dados do responsável apenas para menores de 18
      if (age < 18) {
        registerData.parentName = formData.parentName;
        registerData.parentEmail = formData.parentEmail;
        registerData.parentPhone = formData.parentPhone;
      }

      const response = await apiService.post('/portal/auth/register', registerData) as any;

      // apiService já retorna response.data diretamente
      if (response.success) {
        localStorage.setItem('studentToken', response.token);
        localStorage.setItem('studentData', JSON.stringify(response.student));
        toast.success('Conta criada com sucesso! Bem-vindo ao Nexus Academy!');
        // Redirecionar direto para o dashboard
        navigate('/portal/dashboard');
      }
    } catch (error: unknown) {
      toast.error(error.message || 'Erro ao criar conta');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Bem-vindo ao Nexus Academy!
          </h1>
          <p className="text-xl text-white/90">
            Cadastre-se para estudar com <span className="font-bold">{teacher?.name}</span>
          </p>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados do Aluno */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Dados do Aluno
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="João Silva"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="joao@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idade *
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    required
                    min="3"
                    max="120"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Série/Ano *
                  </label>
                  <input
                    type="text"
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="9º ano"
                  />
                </div>
              </div>
            </div>

            {/* Senha */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                Segurança
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Digite novamente"
                  />
                </div>
              </div>
            </div>

            {/* Dados do Responsável - apenas para menores de 18 */}
            {isMinor && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  Dados do Responsável
                  <span className="text-xs font-normal text-gray-500">(obrigatório para menores de 18 anos)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Responsável *
                    </label>
                    <input
                      type="text"
                      name="parentName"
                      value={formData.parentName}
                      onChange={handleChange}
                      required={isMinor}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Maria Silva"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email do Responsável *
                    </label>
                    <input
                      type="email"
                      name="parentEmail"
                      value={formData.parentEmail}
                      onChange={handleChange}
                      required={isMinor}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="maria@email.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone do Responsável *
                    </label>
                    <input
                      type="tel"
                      name="parentPhone"
                      value={formData.parentPhone}
                      onChange={handleChange}
                      required={isMinor}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Botão Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  Criar Conta
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Link para login */}
            <p className="text-center text-sm text-gray-600">
              Já tem uma conta?{' '}
              <a href="/portal/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Fazer login
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
