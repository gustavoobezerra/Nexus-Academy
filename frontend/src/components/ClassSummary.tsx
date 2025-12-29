import { useState, useEffect } from 'react';
import { Download, Copy, Check, FileText, Sparkles, X, Share2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { classesAPI } from '../lib/api';

interface ClassSummaryProps {
  classId: string;
  className: string;
  transcript: string;
  onClose: () => void;
}

const ClassSummary = ({ classId, className, transcript, onClose }: ClassSummaryProps) => {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateSummary();
  }, [classId, transcript]);

  const generateSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await classesAPI.generateSummary(classId, transcript) as any;

      // apiService já retorna response.data diretamente
      if (response.success) {
        setSummary(response.summary);
        toast.success('Resumo gerado com sucesso!');
      }
    } catch (err) {
      setError('Erro ao gerar resumo. A transcrição pode estar muito curta ou houve um problema na conexão.');
      toast.error('Erro ao gerar resumo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copiado para a área de transferência!');
  };

  const downloadAsText = () => {
    const element = document.createElement('a');
    const file = new Blob([summary], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `resumo-aula-${classId}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Resumo baixado!');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 z-[70] animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl shadow-indigo-500/10 overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-white/5 bg-gradient-to-r from-indigo-600/10 via-transparent to-cyan-600/10 relative">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20">
                  <Sparkles size={20} className="text-white" />
                </div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Relatório de IA</span>
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight pt-2">Resumo da Aula</h2>
              <p className="text-slate-400 font-medium flex items-center gap-2">
                <FileText size={16} /> {className}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto text-indigo-400 animate-pulse" size={24} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-bold text-white">Sintetizando conhecimento...</p>
                <p className="text-slate-500 text-sm">Nossa IA está analisando a transcrição para criar o melhor resumo.</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <X className="text-red-500" size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Ops! Algo deu errado</h3>
                <p className="text-slate-400 mt-2 max-w-sm mx-auto">{error}</p>
              </div>
              <button
                onClick={generateSummary}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-bold"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <div className="bg-slate-950/50 border border-white/5 rounded-[2rem] p-8 md:p-10 shadow-inner">
                <p className="whitespace-pre-wrap text-slate-300 text-lg leading-relaxed first-letter:text-4xl first-letter:font-bold first-letter:text-indigo-400 first-letter:mr-2 first-letter:float-left">
                  {summary}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-slate-950/50 border-t border-white/5 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              disabled={loading || !!error}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all disabled:opacity-50"
              title="Imprimir"
            >
              <Printer size={20} />
            </button>
            <button
              onClick={() => toast.success('Link de compartilhamento gerado!')}
              disabled={loading || !!error}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all disabled:opacity-50"
              title="Compartilhar"
            >
              <Share2 size={20} />
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={downloadAsText}
              disabled={loading || !!error}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all font-bold disabled:opacity-50 active:scale-95"
            >
              <Download size={20} />
              Baixar TXT
            </button>
            <button
              onClick={copyToClipboard}
              disabled={loading || !!error}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50 active:scale-95"
            >
              {copied ? (
                <>
                  <Check size={20} />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy size={20} />
                  Copiar Tudo
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-white text-slate-950 hover:bg-slate-200 rounded-2xl transition-all font-bold active:scale-95"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassSummary;
