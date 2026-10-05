import { useState } from 'react';
import { PartyPopper, Copy, Check, ExternalLink, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface Step4Props {
  slug: string;
  onFinish: () => void;
}

export const Step4_Success = ({ slug, onFinish }: Step4Props) => {
  const [copied, setCopied] = useState(false);

  const publicUrl = `https://nexusacademy.com/professor/${slug}`;
  const whatsappMessage = encodeURIComponent(
    `🎓 Oi! Confira minha página de professor no Nexus Academy: ${publicUrl}`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-center animate-in zoom-in duration-500">
      {/* Confete animation */}
      <div className="relative">
        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl animate-bounce">
          <PartyPopper size={48} />
        </div>
        {/* Sparkles effect */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
              style={{
                top: `${20 + i * 10}%`,
                left: `${30 + i * 8}%`,
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Tudo Pronto! 🎉
        </h3>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Sua conta foi configurada com sucesso!
        </p>
      </div>

      {/* Link único */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border-2 border-indigo-200 dark:border-indigo-800">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          ✨ Seu link único:
        </p>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 mb-4">
          <ExternalLink size={18} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm md:text-base flex-1 truncate">
            {publicUrl}
          </span>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Copiar link"
          >
            {copied ? (
              <Check size={18} className="text-emerald-600" />
            ) : (
              <Copy size={18} className="text-slate-600 dark:text-slate-400" />
            )}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-xl font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center justify-center gap-2"
          >
            <Copy size={18} />
            Copiar Link
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Compartilhar
          </a>
        </div>
      </div>

      {/* Resumo da configuração */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 text-left">
        <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Check size={18} className="text-emerald-600" />
          Configuração Concluída
        </h4>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            Link único configurado
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            Método de pagamento definido
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            Trial de 30 dias ativado
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            Acesso completo liberado
          </li>
        </ul>
      </div>

      {/* Próximos passos */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800 text-left">
        <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <ArrowRight size={18} className="text-amber-600" />
          Próximos Passos
        </h4>
        <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <span>Adicione seu primeiro aluno no dashboard</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <span>Agende sua primeira aula</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <span>Deixe a IA preparar o material automaticamente</span>
          </li>
        </ol>
      </div>

      {/* Botão principal */}
      <button
        onClick={onFinish}
        className="w-full px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg transition-all shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
      >
        Ir para Meu Dashboard
        <ArrowRight size={20} />
      </button>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Você pode alterar essas configurações a qualquer momento no dashboard.
      </p>
    </div>
  );
};
