import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Trash2, Clock, Calendar, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { automationEngine } from '../services/automationEngine';
import { aiAPI, classesAPI, studentsAPI } from '../lib/api';
import { Skeleton, ModalConfirmacao } from './Common';
import { SearchableSelect } from './ui/SearchableSelect';
import type { Aula, Aluno, SubjectSuggestion } from '../types';

interface ClassesPageProps {
  onStartLive?: (classId: string, title: string) => void;
}

export const ClassesPage: React.FC<ClassesPageProps> = ({ onStartLive }) => {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [aulaParaExcluir, setAulaParaExcluir] = useState<Aula | null>(null);
  const [formularioAula, setFormularioAula] = useState({
    title: '',
    studentId: '',
    subject: '',
    topic: '',
    scheduledAt: '',
    duration: 60,
    notes: ''
  });
  const [subjectSuggestion, setSubjectSuggestion] = useState<{
    confidence: number;
    providerMode: 'live' | 'fallback';
    suggestion: SubjectSuggestion;
  } | null>(null);
  const [sugerindoMateria, setSugerindoMateria] = useState(false);
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalAulas, setTotalAulas] = useState(0);
  const limitePorPagina = 20;

  const buscarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [aulasRes, alunosRes] = await Promise.all([
        classesAPI.getAll({ page: paginaAtual, limit: limitePorPagina }),
        studentsAPI.getAll(),
      ]);
      const aulasData = aulasRes as any;
      setAulas(aulasData.classes || []);
      setTotalPaginas(aulasData.totalPages || 1);
      setTotalAulas(aulasData.total || 0);
      setAlunos((alunosRes as any).students || []);
    } catch (error) {
      setAulas([]);
      setAlunos([]);
      toast.error('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  }, [paginaAtual]);

  useEffect(() => {
    buscarDados();
  }, [buscarDados]);

  const resetFormulario = () => {
    setFormularioAula({
      title: '',
      studentId: '',
      subject: '',
      topic: '',
      scheduledAt: '',
      duration: 60,
      notes: ''
    });
    setSubjectSuggestion(null);
  };

  const handleCriarAula = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const {
      title,
      studentId,
      subject,
      topic,
      scheduledAt,
      duration,
      notes
    } = formularioAula;

    if (!title || !studentId || !subject || !scheduledAt) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      toast.error('Informe uma data válida');
      return;
    }

    const dados = {
      title: title.trim(),
      studentId,
      subject: subject.trim(),
      topic: topic.trim() || undefined,
      scheduledAt: scheduledDate.toISOString(),
      duration,
      notes
    };

    try {
      const response = await classesAPI.create(dados) as any;
      const createdClass = response?.class || response;
      const newId = createdClass?.id || createdClass?._id || 'new';
      automationEngine.fireTrigger('class_scheduled', 'class', newId, title, {
        subject,
        studentId,
      });
      toast.success('Aula agendada com sucesso!');
      setMostrarFormulario(false);
      resetFormulario();
      buscarDados();
    } catch (error) {
      toast.error('Erro ao criar aula');
      console.error(error);
    }
  };

  const sugerirMateria = async () => {
    if (!formularioAula.studentId) {
      toast.error('Selecione um aluno antes de pedir a sugestão pedagógica.');
      return;
    }

    setSugerindoMateria(true);

    try {
      const response = await aiAPI.getStudentSubjectSuggestion(formularioAula.studentId);
      setSubjectSuggestion(response);
      setFormularioAula((currentForm) => ({
        ...currentForm,
        subject: response.suggestion.subject,
        topic: response.suggestion.topic,
        title: currentForm.title || `${response.suggestion.subject} - ${response.suggestion.topic}`
      }));
      toast.success('Sugestão pedagógica aplicada ao formulário.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao sugerir a matéria.');
    } finally {
      setSugerindoMateria(false);
    }
  };

  const iniciarAula = async (aulaId: string, title?: string) => {
    try {
      await classesAPI.start(aulaId);
      automationEngine.fireTrigger('class_started', 'class', aulaId, title);
      toast.success('Aula iniciada!');
      buscarDados();
    } catch {
      toast.error('Erro ao iniciar aula');
    }
  };

  const encerrarAula = async (aulaId: string, title?: string) => {
    try {
      await classesAPI.end(aulaId);
      automationEngine.fireTrigger('class_ended', 'class', aulaId, title);
      toast.success('Aula encerrada!');
      buscarDados();
    } catch {
      toast.error('Erro ao encerrar aula');
    }
  };

  const excluirAula = async () => {
    if (!aulaParaExcluir) return;
    try {
      const id = aulaParaExcluir.id || aulaParaExcluir._id || '';
      await classesAPI.delete(id);
      automationEngine.fireTrigger(
        'class_cancelled',
        'class',
        id,
        aulaParaExcluir.title
      );
      toast.success('Aula removida!');
      setAulaParaExcluir(null);
      buscarDados();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao remover aula');
      setAulaParaExcluir(null);
    }
  };

  if (carregando)
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
      </div>
    );

  const formatarDataHora = (data: string) => {
    const d = new Date(data);
    return {
      data: d.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      }),
      hora: d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const getStudentName = (aula: Aula & { student?: { name?: string } }) =>
    aula.studentName || aula.student?.name || 'Aluno';

  const getStudentGrade = (aula: Aula & { student?: { grade?: string } }) =>
    aula.grade || aula.student?.grade || 'Sem série';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <ModalConfirmacao
        aberto={!!aulaParaExcluir}
        titulo="Cancelar Aula"
        mensagem={`Deseja cancelar a aula "${aulaParaExcluir?.title}"?`}
        onConfirmar={excluirAula}
        onCancelar={() => setAulaParaExcluir(null)}
        corBotao="red"
      />
      <div className="flex justify-between items-center">
        <h3 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
          Aulas
        </h3>
        <button
          onClick={() => {
            resetFormulario();
            setMostrarFormulario(true);
          }}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} /> Agendar Aula
        </button>
      </div>
      {mostrarFormulario && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-xl text-slate-800 dark:text-white">
              Agendar Nova Aula
            </h4>
            <button
              onClick={() => setMostrarFormulario(false)}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <X />
            </button>
          </div>
          <form
            onSubmit={handleCriarAula}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Titulo *
              </label>
              <input
                name="title"
                required
                value={formularioAula.title}
                onChange={(event) => setFormularioAula((currentForm) => ({ ...currentForm, title: event.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <SearchableSelect
                label="Aluno *"
                placeholder="Clique para ver sugestões e filtre por nome, série ou matéria..."
                options={alunos.map((aluno) => ({
                  id: aluno._id || aluno.id || '',
                  label: aluno.name,
                  description: `${aluno.grade} • ${aluno.subject || 'Matéria não informada'}`,
                  meta: `Desempenho ${aluno.performance?.overall || 0}%`,
                  group: 'Alunos ativos',
                  keywords: [
                    aluno.grade || '',
                    aluno.subject || '',
                    ...(aluno.performance?.weaknesses || [])
                  ],
                  recent: true
                }))}
                value={formularioAula.studentId}
                onChange={(studentId) => {
                  setFormularioAula((currentForm) => ({
                    ...currentForm,
                    studentId,
                    subject: currentForm.subject || (alunos.find((aluno) => (aluno._id || aluno.id) === studentId)?.subject || '')
                  }));
                  setSubjectSuggestion(null);
                }}
                helperText="Ao focar, aparecem sugestões da base ativa; ao digitar, filtra por nome, série, matéria e fraquezas registradas."
                emptyLabel="Nenhum aluno ativo disponível para agendamento."
              />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-[1fr,auto] gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Materia *
                </label>
                <input
                  name="subject"
                  required
                  value={formularioAula.subject}
                  onChange={(event) => setFormularioAula((currentForm) => ({ ...currentForm, subject: event.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none transition-all"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={sugerirMateria}
                  disabled={!formularioAula.studentId || sugerindoMateria}
                  className="px-4 py-2.5 border border-indigo-500 text-indigo-600 dark:text-indigo-300 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {sugerindoMateria ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Sugerir matéria
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Topico
              </label>
              <input
                name="topic"
                value={formularioAula.topic}
                onChange={(event) => setFormularioAula((currentForm) => ({ ...currentForm, topic: event.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none transition-all"
                placeholder="Ex: Frações equivalentes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data e Hora *
              </label>
              <input
                name="scheduledAt"
                type="datetime-local"
                required
                value={formularioAula.scheduledAt}
                onChange={(event) => setFormularioAula((currentForm) => ({ ...currentForm, scheduledAt: event.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duração (min)
              </label>
              <input
                name="duration"
                type="number"
                min="15"
                max="480"
                value={formularioAula.duration}
                onChange={(event) => setFormularioAula((currentForm) => ({ ...currentForm, duration: Number(event.target.value) || 60 }))}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none transition-all"
              />
            </div>
            {subjectSuggestion ? (
              <div className="md:col-span-2 p-4 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10">
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/60 text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                    confiança {subjectSuggestion.confidence}%
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/60 text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                    {subjectSuggestion.providerMode}
                  </span>
                </div>
                <p className="mt-3 font-semibold text-slate-800 dark:text-white">
                  {subjectSuggestion.suggestion.subject} • {subjectSuggestion.suggestion.topic}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {subjectSuggestion.suggestion.explanation}
                </p>
                <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  {subjectSuggestion.suggestion.evidence.map((evidence) => (
                    <p key={evidence}>• {evidence}</p>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Observacoes
              </label>
              <textarea
                name="notes"
                value={formularioAula.notes}
                onChange={(event) => setFormularioAula((currentForm) => ({ ...currentForm, notes: event.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none transition-all"
                rows={3}
              ></textarea>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  setMostrarFormulario(false);
                  resetFormulario();
                }}
                className="px-6 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold shadow-lg shadow-indigo-600/20"
              >
                Salvar Aula
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {aulas.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700">
            <Calendar size={64} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg mb-2">Nenhuma aula agendada</p>
          </div>
        ) : (
          <>
            {aulas.map((aula) => {
            const { hora } = formatarDataHora(aula.scheduledAt);
            const aulaId = aula.id || aula._id || '';
            const aulaAoVivo = aula.isLive || aula.status === 'in_progress';
            return (
              <div
                key={aulaId}
                className={`${
                  aulaAoVivo
                    ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                    : aula.status === 'completed'
                    ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                } p-5 rounded-2xl shadow-sm border-2`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center ${
                        aulaAoVivo
                          ? 'bg-red-500 text-white'
                          : aula.status === 'completed'
                          ? 'bg-green-500 text-white'
                          : 'bg-indigo-100 text-indigo-600'
                      }`}
                    >
                      {aulaAoVivo ? (
                        <div className="text-center">
                          <div className="w-3 h-3 bg-white rounded-full animate-pulse mx-auto mb-1"></div>
                          <span className="text-xs font-bold">LIVE</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-lg font-bold">
                            {new Date(aula.scheduledAt).getDate()}
                          </span>
                          <span className="text-xs">
                            {new Date(aula.scheduledAt).toLocaleDateString(
                              'pt-BR',
                              { month: 'short' }
                            )}
                          </span>
                        </>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg text-slate-800 dark:text-white">
                          {aula.title}
                        </h4>
                        {aula.status === 'completed' && (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
                            Concluida
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">
                        {getStudentName(aula as Aula & { student?: { name?: string; grade?: string } })} - {getStudentGrade(aula as Aula & { student?: { name?: string; grade?: string } })}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={14} /> {hora}
                        </span>
                        <span>{aula.duration} min</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (aulaAoVivo) {
                          encerrarAula(aulaId, aula.title);
                        } else {
                          iniciarAula(aulaId, aula.title);
                          onStartLive?.(aulaId, aula.title);
                        }
                      }}
                      className={`px-6 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                        aulaAoVivo
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {aulaAoVivo ? 'ENCERRAR' : 'INICIAR'}
                    </button>
                    <button
                      onClick={() => setAulaParaExcluir(aula)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Controles de paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Mostrando {((paginaAtual - 1) * limitePorPagina) + 1} a {Math.min(paginaAtual * limitePorPagina, totalAulas)} de {totalAulas} aulas
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                >
                  Anterior
                </button>
                <span className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium">
                  Página {paginaAtual} de {totalPaginas}
                </span>
                <button
                  onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
};

export default ClassesPage;
