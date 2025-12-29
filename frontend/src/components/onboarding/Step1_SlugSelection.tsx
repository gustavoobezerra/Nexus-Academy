import { useState, useEffect } from 'react';
import { Link2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/api.service';

interface Step1Props {
  onNext: (slug: string) => void;
  userEmail: string;
  userName: string;
}

export const Step1_SlugSelection = ({ onNext, userEmail, userName }: Step1Props) => {
  const [slug, setSlug] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Gerar sugestões baseadas no nome
  useEffect(() => {
    if (userName) {
      const nameParts = userName.toLowerCase().split(' ').filter(Boolean);
      const generated: string[] = [];

      if (nameParts.length >= 2) {
        // Ex: "João Silva" -> "joao-silva"
        generated.push(nameParts.join('-').normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

        // Ex: "João Silva" -> "prof-joao"
        generated.push(`prof-${nameParts[0]}`.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

        // Ex: "João Silva" -> "silva"
        generated.push(nameParts[nameParts.length - 1].normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
      } else if (nameParts.length === 1) {
        generated.push(nameParts[0].normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
        generated.push(`prof-${nameParts[0]}`.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
      }

      setSuggestions(generated.slice(0, 3));
    }
  }, [userName]);

  // Validação e verificação em tempo real
  useEffect(() => {
    const trimmed = slug.trim();

    if (!trimmed) {
      setAvailable(null);
      setErrorMessage('');
      return;
    }

    // Validação de formato
    if (!/^[a-z0-9-]+$/.test(trimmed)) {
      setAvailable(false);
      setErrorMessage('Use apenas letras minúsculas, números e hífen');
      return;
    }

    if (trimmed.length < 3) {
      setAvailable(false);
      setErrorMessage('Mínimo de 3 caracteres');
      return;
    }

    if (trimmed.length > 30) {
      setAvailable(false);
      setErrorMessage('Máximo de 30 caracteres');
      return;
    }

    // Debounce para verificação no backend
    const timer = setTimeout(async () => {
      setChecking(true);
      setErrorMessage('');

      try {
        const data = await apiService.post<{ success: boolean; available: boolean; message: string }>(
          '/onboarding/check-slug',
          { slug: trimmed }
        );

        if (data.success) {
          setAvailable(data.available);
          if (!data.available) {
            setErrorMessage(data.message || 'Slug indisponível');
          }
        } else {
          setAvailable(false);
          setErrorMessage(data.message || 'Erro ao verificar slug');
        }
      } catch (error) {
        console.error('Erro ao verificar slug:', error);
        setAvailable(null);
        setErrorMessage('Erro ao verificar. Tente novamente.');
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = slug.trim();

    if (!trimmed) {
      toast.error('Digite um slug');
      return;
    }

    if (!available) {
      toast.error('Escolha um slug disponível');
      return;
    }

    try {
      const data = await apiService.post<{ success: boolean; message: string; slug: string }>(
        '/onboarding/set-slug',
        { slug: trimmed }
      );

      if (data.success) {
        toast.success('Slug configurado!');
        onNext(trimmed);
      } else {
        toast.error(data.message || 'Erro ao salvar slug');
      }
    } catch (error) {
      console.error('Erro ao salvar slug:', error);
      toast.error('Erro ao salvar. Tente novamente.');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSlug(suggestion);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Link2 size={32} />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Seu Link Único</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Escolha um identificador único para sua página de professor
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Seu Slug
          </label>
          <div className="relative">
            <div className="flex items-center">
              <span className="inline-flex items-center px-4 py-3 rounded-l-xl bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm">
                nexusacademy.com/professor/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                className="flex-1 px-4 py-3 rounded-r-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="seu-nome"
                required
                minLength={3}
                maxLength={30}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {checking && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
                {!checking && available === true && <CheckCircle className="w-5 h-5 text-green-500" />}
                {!checking && available === false && <XCircle className="w-5 h-5 text-red-500" />}
              </div>
            </div>
          </div>

          {errorMessage && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          )}

          {available === true && slug && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle size={16} /> Slug disponível!
            </p>
          )}
        </div>

        {/* Sugestões */}
        {suggestions.length > 0 && !slug && (
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Sugestões para você:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors border border-indigo-200 dark:border-indigo-800"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <strong>Dica:</strong> Seu slug será usado no link que você compartilhará com seus alunos.
            Escolha algo fácil de lembrar!
          </p>
        </div>

        <button
          type="submit"
          disabled={!available || checking}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-semibold transition-all shadow-lg"
        >
          {checking ? 'Verificando...' : 'Continuar'}
        </button>
      </form>
    </div>
  );
};
