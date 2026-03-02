import React, { useState } from 'react';
import { FileText, Send, CheckCircle, Copy, Download, MessageSquare, Mail, X, Sparkles, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import aiService from '../services/aiService';
import { automationEngine } from '../services/automationEngine';
import { classesAPI } from '../lib/api';
import type { Aula, Aluno } from '../types';

interface PostClassSummaryProps {
  classData: Aula;
  student: Aluno;
  transcript?: string;
  onClose: () => void;
}

export const PostClassSummary: React.FC<PostClassSummaryProps> = ({
  classData,
  student,
  transcript,
  onClose
}) => {
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<{
    summary: string;
    keyPoints: string[];
    homework: string[];
    nextSteps: string[];
    parentReport: string;
  } | null>(null);
  const [sentToParent, setSentToParent] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    toast.loading('Gerando resumo com IA...', { id: 'generating' });

    try {
      const result = await aiService.generateClassSummary(
        classData,
        student,
        notes || transcript
      );
      setSummary(result);

      // Disparar trigger de automacao
      await automationEngine.fireTrigger('class_ended', 'class', classData._id || classData.id || '', classData.title, {
        summary: result,
        student
      });

      toast.success('Resumo gerado!', { id: 'generating' });
    } catch (error) {
      toast.error('Erro ao gerar resumo', { id: 'generating' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!summary) return;
    const phone = student.parentPhone?.replace(/\D/g, '');
    const message = encodeURIComponent(summary.parentReport);
    const url = phone
      ? `https://wa.me/55${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
    setSentToParent(true);
    toast.success('WhatsApp aberto com o relatório!');
  };

  const handleSendEmail = async () => {
    if (!summary) return;
    if (!student.parentEmail) {
      toast.error('Email do responsável não cadastrado.');
      return;
    }
    toast.loading('Enviando por email...', { id: 'sending' });
    try {
      const classId = classData._id || classData.id;
      if (!classId) throw new Error('ID da aula não encontrado');
      await classesAPI.sendSummary(classId, {
        parentEmail: student.parentEmail,
        studentName: student.name,
        summary: summary.summary,
        keyPoints: summary.keyPoints,
        homework: summary.homework,
        className: classData.title
      });
      setSentToParent(true);
      toast.success('Resumo enviado por email para os responsáveis!', { id: 'sending' });
    } catch (error) {
      toast.error('Erro ao enviar email.', { id: 'sending' });
    }
  };

  const handleCopy = (text: string, what: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${what} copiado!`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-indigo-500/10">
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-indigo-900/20 to-transparent flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
              <Sparkles className="text-indigo-400" />
              Resumo Pós-Aula
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {classData.title} • {student.name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {!summary ? (
            <div className="max-w-2xl mx-auto space-y-6 pt-8 text-center">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText size={40} className="text-indigo-400" />
              </div>

              <div className="text-left bg-slate-950/50 border border-slate-800 rounded-2xl p-6">
                <label className="block text-sm font-bold text-indigo-400 uppercase tracking-wider mb-3">
                  Suas notas sobre a aula (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Como foi a aula? O que o aluno aprendeu? Houve dificuldades? Alguma observação especial?"
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all resize-none shadow-inner"
                />
              </div>

              {transcript && (
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex items-center gap-3 text-left">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <MessageSquare size={18} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Transcrição Detectada</p>
                    <p className="text-sm text-slate-500 line-clamp-1">{transcript}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="group relative w-full px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                    Sintetizando Conhecimento...
                  </>
                ) : (
                  <>
                    <Sparkles size={24} className="group-hover:animate-pulse" />
                    Gerar Resumo Inteligente
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/30 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={16} /> Resumo Executivo
                    </h3>
                    <button
                      onClick={() => handleCopy(summary.summary, 'Resumo')}
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{summary.summary}</p>
                </div>

                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-colors">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <CheckCircle size={16} /> Pontos-Chave
                  </h3>
                  <ul className="space-y-3">
                    {summary.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-300 group">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/30 transition-colors">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Save size={16} /> Tarefa Recomendada
                  </h3>
                  <ul className="space-y-3">
                    {summary.homework.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-300 group">
                        <div className="mt-1 w-2 h-2 rounded-sm bg-amber-500/30 border border-amber-500/50 rotate-45 group-hover:rotate-90 transition-transform" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors">
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Send size={16} /> Próximos Passos
                  </h3>
                  <ul className="space-y-3">
                    {summary.nextSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-300">
                        <span className="font-mono text-cyan-400/50 text-xs mt-1">0{idx + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Relatorio para pais */}
              <div className="bg-gradient-to-br from-indigo-500/10 via-slate-950/50 to-emerald-500/10 border border-indigo-500/20 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Mail size={120} />
                </div>

                <div className="flex items-center justify-between mb-6 relative">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Mail className="text-indigo-400" /> Relatório para os Responsáveis
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">Pronto para ser enviado via WhatsApp ou E-mail</p>
                  </div>
                  <button
                    onClick={() => handleCopy(summary.parentReport, 'Relatório')}
                    className="p-3 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white border border-slate-800 transition-all shadow-lg"
                  >
                    <Copy size={20} />
                  </button>
                </div>

                <div className="bg-slate-950/80 rounded-2xl p-6 mb-8 border border-white/5 relative">
                  <pre className="text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {summary.parentReport}
                  </pre>
                </div>

                {!sentToParent ? (
                  <div className="flex flex-col sm:flex-row gap-4 relative">
                    <button
                      onClick={handleSendWhatsApp}
                      className="flex-1 px-8 py-4 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-[#25D366]/20 active:scale-95"
                    >
                      <MessageSquare size={20} />
                      Enviar via WhatsApp
                    </button>
                    <button
                      onClick={handleSendEmail}
                      className="flex-1 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                      <Mail size={20} />
                      Enviar via E-mail
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 py-4 text-emerald-400 font-bold bg-emerald-500/10 rounded-2xl border border-emerald-500/20 animate-in zoom-in duration-300">
                    <CheckCircle size={24} />
                    Relatório enviado com sucesso!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-all active:scale-95"
          >
            Fechar Janela
          </button>
          {summary && (
            <button
              onClick={() => toast.success('Exportando PDF...', { icon: '📄' })}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-purple-600/20 active:scale-95"
            >
              <Download size={20} />
              Exportar como PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostClassSummary;
