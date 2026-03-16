import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Trash2, Clock, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { automationEngine } from '../services/automationEngine';
import { classesAPI, studentsAPI } from '../lib/api';
import { Skeleton, ModalConfirmacao } from './Common';
import type { Aula, Aluno } from '../types';

interface ClassesPageProps {
  onStartLive?: (classId: string, title: string) => void;
}

export const ClassesPage: React.FC<ClassesPageProps> = ({ onStartLive }) => {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [aulaParaExcluir, setAulaParaExcluir] = useState<Aula | null>(null);
  
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

  const handleCriarAula = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const title = formData.get('title') as string;
    const studentId = formData.get('studentId') as string;
    const subject = formData.get('subject') as string;
    const scheduledAt = formData.get('scheduledAt') as string;
    const duration = Number(formData.get('duration')) || 60;
    const notes = formData.get('notes') as string;

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
      title,
      studentId,
      subject,
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
      buscarDados();
    } catch (error) {
      toast.error('Erro ao criar aula');
      console.error(error);
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
          onClick={() => setMostrarFormulario(true)}
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
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Aluno *
              </label>
              <select
                name="studentId"
                required
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none transition-all"
              >
                <option value="" className="dark:bg-slate-700">
                  Selecione
                </option>
                {alunos.map((a) => (
                  <option
                    key={a._id || a.id}
                    value={a._id || a.id}
                    className="dark:bg-slate-700"
                  >
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Materia *
              </label>
              <input
                name="subject"
                required
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none transition-all"
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
                defaultValue={60}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Observacoes
              </label>
              <textarea
                name="notes"
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none transition-all"
                rows={3}
              ></textarea>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setMostrarFormulario(false)}
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
