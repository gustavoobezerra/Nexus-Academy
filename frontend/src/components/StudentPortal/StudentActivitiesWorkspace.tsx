import { useEffect, useState } from 'react';
import { BookOpenCheck, CheckCircle2, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { portalAPI } from '../../lib/api';
import type { PortalActivityDetail, PortalActivitySummary } from '../../types';

interface StudentActivitiesWorkspaceProps {
  activities: PortalActivitySummary[];
  isDark: boolean;
  onRefresh: () => Promise<void>;
}

const getStatusLabel = (status: PortalActivitySummary['status']) => {
  switch (status) {
    case 'graded':
      return 'Corrigida';
    case 'completed':
      return 'Enviada';
    case 'published':
      return 'Pendente';
    default:
      return status;
  }
};

const getStatusTone = (status: PortalActivitySummary['status']) => {
  switch (status) {
    case 'graded':
      return 'bg-emerald-500/20 text-emerald-300';
    case 'completed':
      return 'bg-cyan-500/20 text-cyan-300';
    default:
      return 'bg-amber-500/20 text-amber-300';
  }
};

const buildAnswerMap = (activity: PortalActivityDetail | null) => {
  const answers: Record<number, string> = {};
  if (!activity) {
    return answers;
  }

  const sourceAnswers = activity.latestSubmission?.answers || [];

  if (sourceAnswers.length > 0) {
    for (const answer of sourceAnswers) {
      answers[answer.questionNumber] = answer.answer || '';
    }
    return answers;
  }

  for (const question of activity.questions || []) {
    answers[question.questionNumber] = '';
  }

  return answers;
};

/**
 * Workspace real de atividades do portal do aluno.
 *
 * Mostra a lista recebida do professor, permite responder e envia a submissão
 * para o backend, onde a atividade é corrigida e convertida em sinais de aprendizagem.
 */
export const StudentActivitiesWorkspace = ({
  activities,
  isDark,
  onRefresh
}: StudentActivitiesWorkspaceProps) => {
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<PortalActivityDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedActivityId && activities.length > 0) {
      setSelectedActivityId(activities[0]._id);
    }
  }, [activities, selectedActivityId]);

  useEffect(() => {
    const loadActivity = async () => {
      if (!selectedActivityId) {
        setSelectedActivity(null);
        setAnswers({});
        return;
      }

      setLoadingDetail(true);

      try {
        const response = await portalAPI.getActivityDetail(selectedActivityId);
        setSelectedActivity(response.activity);
        setAnswers(buildAnswerMap(response.activity));
      } catch (error) {
        console.error('Erro ao carregar atividade:', error);
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar atividade');
      } finally {
        setLoadingDetail(false);
      }
    };

    void loadActivity();
  }, [selectedActivityId]);

  const alreadySubmitted = Boolean(selectedActivity?.latestSubmission);

  const handleSubmit = async () => {
    if (!selectedActivity) {
      return;
    }

    const payload = selectedActivity.questions.map((question) => ({
      questionNumber: question.questionNumber,
      answer: answers[question.questionNumber] || ''
    }));

    if (payload.every((answer) => !answer.answer.trim())) {
      toast.error('Responda pelo menos uma questão antes de enviar.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await portalAPI.submitActivity(selectedActivity._id, { answers: payload });
      setSelectedActivity(response.activity);
      setAnswers(buildAnswerMap(response.activity));
      toast.success('Atividade enviada com sucesso.');
      await onRefresh();
    } catch (error) {
      console.error('Erro ao enviar atividade:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar atividade');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[0.82fr,1.18fr]">
      <section className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
        <div className="flex items-center gap-3">
          <BookOpenCheck className="text-indigo-400" size={18} />
          <div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Atividades recebidas</h3>
            <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} text-sm`}>
              Ao clicar no card, você abre a atividade completa para responder.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {activities.length === 0 ? (
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>Nenhuma atividade encontrada</p>
          ) : (
            activities.map((activity) => (
              <button
                key={activity._id}
                type="button"
                onClick={() => setSelectedActivityId(activity._id)}
                className={`w-full rounded-xl border px-4 py-4 text-left transition ${
                  selectedActivityId === activity._id
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : isDark
                      ? 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{activity.title}</p>
                    <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {activity.type} • {activity.totalQuestions} questão(ões)
                    </p>
                    {activity.dueDate ? (
                      <p className={`mt-2 text-xs uppercase tracking-[0.18em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Prazo {new Date(activity.dueDate).toLocaleDateString('pt-BR')}
                      </p>
                    ) : null}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(activity.status)}`}>
                    {getStatusLabel(activity.status)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
        {loadingDetail ? (
          <div className="flex min-h-[24rem] items-center justify-center">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : !selectedActivity ? (
          <div className="flex min-h-[24rem] items-center justify-center text-center">
            <div>
              <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Selecione uma atividade</p>
              <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                A atividade escolhida abre aqui com as questões e o envio real para o professor.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className={`text-xs uppercase tracking-[0.22em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>atividade ativa</p>
                <h3 className={`mt-2 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedActivity.title}</h3>
                {selectedActivity.description ? (
                  <p className={`mt-3 text-sm leading-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {selectedActivity.description}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(selectedActivity.status)}`}>
                  {getStatusLabel(selectedActivity.status)}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                  {selectedActivity.totalPoints} pts
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {selectedActivity.questions.map((question) => (
                <article key={question.questionNumber} className={`rounded-xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                      Q{question.questionNumber}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                      {question.difficulty}
                    </span>
                  </div>
                  <p className={`mt-3 font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{question.question}</p>

                  <div className="mt-4">
                    {question.type === 'multiple_choice' && question.options?.length ? (
                      <div className="grid gap-2">
                        {question.options.map((option) => {
                          const checked = answers[question.questionNumber] === option.letter;

                          return (
                            <button
                              key={`${question.questionNumber}-${option.letter}`}
                              type="button"
                              onClick={() => !alreadySubmitted && setAnswers((currentAnswers) => ({
                                ...currentAnswers,
                                [question.questionNumber]: option.letter
                              }))}
                              disabled={alreadySubmitted}
                              className={`rounded-xl border px-4 py-3 text-left transition ${
                                checked
                                  ? 'border-indigo-500 bg-indigo-500/10'
                                  : isDark
                                    ? 'border-slate-800 bg-slate-900'
                                    : 'border-slate-200 bg-white'
                              } ${alreadySubmitted ? 'cursor-default' : ''}`}
                            >
                              <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{option.letter}.</span>{' '}
                              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{option.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <textarea
                        value={answers[question.questionNumber] || ''}
                        onChange={(event) => setAnswers((currentAnswers) => ({
                          ...currentAnswers,
                          [question.questionNumber]: event.target.value
                        }))}
                        disabled={alreadySubmitted}
                        rows={question.type === 'essay' ? 4 : 2}
                        className={`w-full rounded-xl border px-4 py-3 outline-none transition ${
                          isDark
                            ? 'border-slate-800 bg-slate-950 text-white placeholder:text-slate-500'
                            : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400'
                        }`}
                        placeholder={question.type === 'essay' ? 'Escreva sua resposta com calma.' : 'Digite sua resposta.'}
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>

            {selectedActivity.latestSubmission ? (
              <div className={`rounded-xl border p-4 ${isDark ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    Último resultado: {Math.round(selectedActivity.latestSubmission.percentage || 0)}%
                  </p>
                </div>
                <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Enviado em {new Date(selectedActivity.latestSubmission.submittedAt).toLocaleString('pt-BR')}.
                </p>
              </div>
            ) : null}

            {!alreadySubmitted ? (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Enviar atividade
              </button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentActivitiesWorkspace;
