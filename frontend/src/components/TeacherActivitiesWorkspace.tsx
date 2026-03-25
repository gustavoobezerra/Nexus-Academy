import { useEffect, useMemo, useState } from 'react';
import {
  BookCheck,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  Search,
  Sparkles,
  UserRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import { teacherActivitiesAPI } from '../lib/api';
import type {
  ActivityReviewSuggestion,
  TeacherActivityDetail,
  TeacherActivitySubmissionDetail,
  TeacherActivitySummary
} from '../types';

interface TeacherActivitiesWorkspaceProps {
  isDark: boolean;
  onRefreshWorkspace?: () => Promise<void> | void;
}

type ReviewDraft = {
  answers: ActivityReviewSuggestion['answers'];
  teacherFeedback: string;
};

const getStatusLabel = (status: TeacherActivitySummary['status']) => {
  switch (status) {
    case 'graded':
      return 'Corrigida';
    case 'completed':
      return 'Aguardando revisão';
    case 'published':
      return 'Enviada';
    default:
      return status;
  }
};

const getStatusTone = (status: TeacherActivitySummary['status']) => {
  switch (status) {
    case 'graded':
      return 'bg-emerald-500/15 text-emerald-300';
    case 'completed':
      return 'bg-amber-500/15 text-amber-300';
    default:
      return 'bg-cyan-500/15 text-cyan-300';
  }
};

const buildReviewDraft = (
  activity: TeacherActivityDetail | null,
  submissionIndex: number
): ReviewDraft => {
  if (!activity) {
    return { answers: [], teacherFeedback: '' };
  }

  const submission = activity.submissions[submissionIndex];
  if (!submission) {
    return { answers: [], teacherFeedback: '' };
  }

  return {
    answers: activity.questions.map((question) => {
      const answer = submission.answers.find((item) => item.questionNumber === question.questionNumber);
      const pointsEarned = typeof answer?.pointsEarned === 'number'
        ? answer.pointsEarned
        : (answer?.isCorrect ? question.points : 0);

      return {
        questionNumber: question.questionNumber,
        isCorrect: Boolean(answer?.isCorrect),
        pointsEarned,
        feedback: answer?.feedback || ''
      };
    }),
    teacherFeedback: submission.teacherFeedback || ''
  };
};

export const TeacherActivitiesWorkspace = ({
  isDark,
  onRefreshWorkspace
}: TeacherActivitiesWorkspaceProps) => {
  const [activities, setActivities] = useState<TeacherActivitySummary[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<TeacherActivityDetail | null>(null);
  const [selectedSubmissionIndex, setSelectedSubmissionIndex] = useState(0);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>({ answers: [], teacherFeedback: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiReviewing, setAiReviewing] = useState(false);
  const [reviewMode, setReviewMode] = useState<'manual' | 'ai'>('manual');

  const filteredActivities = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    if (!normalizedQuery) {
      return activities;
    }

    return activities.filter((activity) =>
      [
        activity.title,
        activity.studentName,
        activity.classTitle,
        activity.description
      ].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedQuery))
    );
  }, [activities, searchTerm]);

  const refreshWorkspaceInBackground = async () => {
    try {
      await onRefreshWorkspace?.();
    } catch (error) {
      console.error('Erro ao sincronizar workspace do professor:', error);
    }
  };

  const loadActivities = async () => {
    setLoadingList(true);
    try {
      const response = await teacherActivitiesAPI.getAll();
      const nextActivities = Array.isArray(response.activities) ? response.activities : [];
      setActivities(nextActivities);

      if (!selectedActivityId && nextActivities.length > 0) {
        setSelectedActivityId(nextActivities[0]._id);
      } else if (
        selectedActivityId &&
        !nextActivities.some((activity) => activity._id === selectedActivityId)
      ) {
        setSelectedActivityId(nextActivities[0]?._id || '');
      }
    } catch (error) {
      console.error('Erro ao carregar atividades do professor:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar atividades do professor');
    } finally {
      setLoadingList(false);
    }
  };

  const loadActivityDetail = async (activityId: string) => {
    if (!activityId) {
      setSelectedActivity(null);
      return;
    }

    setLoadingDetail(true);
    try {
      const response = await teacherActivitiesAPI.getDetail(activityId);
      const activity = response.activity;
      setSelectedActivity(activity);

      const latestIndex = Math.max(0, activity.submissions.length - 1);
      setSelectedSubmissionIndex(latestIndex);
      setReviewDraft(buildReviewDraft(activity, latestIndex));
      setReviewMode('manual');
    } catch (error) {
      console.error('Erro ao carregar detalhe da atividade:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar detalhe da atividade');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    void loadActivities();
  }, []);

  useEffect(() => {
    void loadActivityDetail(selectedActivityId);
  }, [selectedActivityId]);

  useEffect(() => {
    setReviewDraft(buildReviewDraft(selectedActivity, selectedSubmissionIndex));
    setReviewMode('manual');
  }, [selectedActivity, selectedSubmissionIndex]);

  const activeSubmission: TeacherActivitySubmissionDetail | null = selectedActivity?.submissions?.[selectedSubmissionIndex] || null;

  const updateDraftAnswer = (
    questionNumber: number,
    updates: Partial<ActivityReviewSuggestion['answers'][number]>
  ) => {
    setReviewDraft((currentDraft) => ({
      ...currentDraft,
      answers: currentDraft.answers.map((answer) => {
        if (answer.questionNumber !== questionNumber) {
          return answer;
        }

        const question = selectedActivity?.questions.find((item) => item.questionNumber === questionNumber);
        const maxPoints = question?.points || 0;
        const nextIsCorrect = updates.isCorrect ?? answer.isCorrect;
        const explicitPoints = updates.pointsEarned !== undefined
          ? updates.pointsEarned
          : answer.pointsEarned;
        const nextPoints = Math.max(
          0,
          Math.min(maxPoints, explicitPoints !== undefined ? explicitPoints : (nextIsCorrect ? maxPoints : 0))
        );

        return {
          ...answer,
          ...updates,
          isCorrect: nextIsCorrect,
          pointsEarned: nextPoints
        };
      })
    }));
    setReviewMode('manual');
  };

  const handleAiReview = async () => {
    if (!selectedActivity || !activeSubmission) {
      return;
    }

    setAiReviewing(true);
    try {
      const response = await teacherActivitiesAPI.reviewWithAI(
        selectedActivity._id,
        activeSubmission.submissionIndex
      );

      setReviewDraft({
        answers: response.review.answers,
        teacherFeedback: response.review.teacherFeedback
      });
      setReviewMode('ai');

      toast.success(
        response.providerMode === 'live'
          ? 'Sugestão de correção gerada com IA.'
          : 'Sugestão gerada com fallback local.'
      );
    } catch (error) {
      console.error('Erro ao corrigir com IA:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar sugestão de correção');
    } finally {
      setAiReviewing(false);
    }
  };

  const handleSaveReview = async () => {
    if (!selectedActivity || !activeSubmission) {
      return;
    }

    setSaving(true);
    try {
      const response = await teacherActivitiesAPI.saveReview(
        selectedActivity._id,
        activeSubmission.submissionIndex,
        {
          answers: reviewDraft.answers,
          teacherFeedback: reviewDraft.teacherFeedback,
          reviewMode
        }
      );

      setSelectedActivity(response.activity);
      setActivities((currentActivities) =>
        currentActivities.map((activity) =>
          activity._id === response.activity._id
            ? {
              ...activity,
              status: response.activity.status,
              latestSubmission: response.activity.latestSubmission,
              needsReview: response.activity.needsReview,
              submissionCount: response.activity.submissionCount
            }
            : activity
        )
      );
      setSelectedSubmissionIndex(Math.max(0, response.activity.submissions.length - 1));
      setReviewDraft(buildReviewDraft(response.activity, Math.max(0, response.activity.submissions.length - 1)));
      toast.success('Correção salva e enviada para o aluno.');
      void refreshWorkspaceInBackground();
    } catch (error) {
      console.error('Erro ao salvar correção:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar correção');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[0.82fr,1.18fr]">
      <section className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-xl p-6 shadow-lg`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <BookCheck className="mt-0.5 text-indigo-400" size={18} />
            <div>
              <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Atividades enviadas</p>
              <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Acompanhe envios, veja quem respondeu e abra a correção completa.
              </p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
            {activities.filter((activity) => activity.needsReview).length} pendentes
          </span>
        </div>

        <div className="relative mt-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por atividade, aluno ou aula..."
            className={`w-full rounded-xl border py-3 pl-11 pr-4 outline-none transition ${
              isDark
                ? 'border-slate-800 bg-slate-950 text-white placeholder:text-slate-500'
                : 'border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400'
            }`}
          />
        </div>

        <div className="mt-5 space-y-3">
          {loadingList ? (
            <div className="flex min-h-[14rem] items-center justify-center">
              <Loader2 className="animate-spin text-indigo-400" size={24} />
            </div>
          ) : filteredActivities.length === 0 ? (
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>Nenhuma atividade enviada encontrada.</p>
          ) : (
            filteredActivities.map((activity) => (
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
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{activity.title}</p>
                      {activity.needsReview ? (
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_6px_rgba(239,68,68,0.12)]" />
                      ) : null}
                    </div>
                    <div className={`mt-2 flex flex-wrap items-center gap-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <span className="inline-flex items-center gap-1">
                        <UserRound size={14} />
                        {activity.studentName}
                      </span>
                      {activity.classTitle ? <span>• {activity.classTitle}</span> : null}
                    </div>
                    <p className={`mt-2 text-xs uppercase tracking-[0.18em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {activity.submissionCount} envio(s)
                      {activity.dueDate ? ` • prazo ${new Date(activity.dueDate).toLocaleDateString('pt-BR')}` : ''}
                    </p>
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
            <Loader2 className="animate-spin text-indigo-400" size={24} />
          </div>
        ) : !selectedActivity ? (
          <div className="flex min-h-[24rem] items-center justify-center text-center">
            <div>
              <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Selecione uma atividade</p>
              <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                O envio escolhido abre aqui com respostas, correção e comentários por questão.
              </p>
            </div>
          </div>
        ) : selectedActivity.submissions.length === 0 ? (
          <div className="flex min-h-[24rem] items-center justify-center text-center">
            <div>
              <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Ainda sem resposta</p>
              <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Quando o aluno enviar a atividade, a correção aparece aqui.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className={`text-xs uppercase tracking-[0.22em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>atividade do professor</p>
                <h3 className={`mt-2 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedActivity.title}</h3>
                <p className={`mt-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Enviado para <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{selectedActivity.studentName}</strong>
                  {selectedActivity.classTitle ? ` • ${selectedActivity.classTitle}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedActivity.submissions.map((submission) => (
                  <button
                    key={submission.submissionIndex}
                    type="button"
                    onClick={() => setSelectedSubmissionIndex(submission.submissionIndex)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      selectedSubmissionIndex === submission.submissionIndex
                        ? 'bg-indigo-600 text-white'
                        : isDark
                          ? 'bg-slate-800 text-slate-200'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Envio {submission.submissionIndex + 1}
                  </button>
                ))}
              </div>
            </div>

            {activeSubmission ? (
              <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(selectedActivity.status)}`}>
                    {getStatusLabel(selectedActivity.status)}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                    {Math.round(activeSubmission.percentage || 0)}%
                  </span>
                  <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Recebido em {new Date(activeSubmission.submittedAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="space-y-4">
              {selectedActivity.questions.map((question) => {
                const submissionAnswer = activeSubmission?.answers.find((item) => item.questionNumber === question.questionNumber);
                const reviewAnswer = reviewDraft.answers.find((item) => item.questionNumber === question.questionNumber);

                return (
                  <article
                    key={question.questionNumber}
                    className={`rounded-xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                        Q{question.questionNumber}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                        {question.points} pts
                      </span>
                    </div>

                    <p className={`mt-3 font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{question.question}</p>

                    <div className={`mt-4 rounded-xl border px-4 py-3 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                      <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>resposta do aluno</p>
                      <p className={`mt-2 whitespace-pre-wrap text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {submissionAnswer?.answer || 'Sem resposta'}
                      </p>
                    </div>

                    <div className={`mt-4 rounded-xl border px-4 py-3 ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white/80'}`}>
                      <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>gabarito do professor</p>
                      <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {question.correctAnswer || question.explanation || 'Sem gabarito textual cadastrado para esta questão.'}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateDraftAnswer(question.questionNumber, {
                          isCorrect: true,
                          pointsEarned: question.points
                        })}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          reviewAnswer?.isCorrect
                            ? 'bg-emerald-600 text-white'
                            : isDark
                              ? 'bg-slate-800 text-slate-200'
                              : 'bg-white text-slate-700'
                        }`}
                      >
                        Certo
                      </button>
                      <button
                        type="button"
                        onClick={() => updateDraftAnswer(question.questionNumber, {
                          isCorrect: false,
                          pointsEarned: 0
                        })}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          reviewAnswer && !reviewAnswer.isCorrect
                            ? 'bg-rose-600 text-white'
                            : isDark
                              ? 'bg-slate-800 text-slate-200'
                              : 'bg-white text-slate-700'
                        }`}
                      >
                        Errado
                      </button>
                    </div>

                    <textarea
                      value={reviewAnswer?.feedback || ''}
                      onChange={(event) => updateDraftAnswer(question.questionNumber, {
                        feedback: event.target.value
                      })}
                      rows={3}
                      className={`mt-4 w-full rounded-xl border px-4 py-3 outline-none transition ${
                        isDark
                          ? 'border-slate-800 bg-slate-900 text-white placeholder:text-slate-500'
                          : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400'
                      }`}
                      placeholder="Comentário para o aluno nesta questão."
                    />
                  </article>
                );
              })}
            </div>

            <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-2">
                <MessageSquareText className="text-indigo-400" size={18} />
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Feedback geral para o aluno</p>
              </div>
              <textarea
                value={reviewDraft.teacherFeedback}
                onChange={(event) => setReviewDraft((currentDraft) => ({
                  ...currentDraft,
                  teacherFeedback: event.target.value
                }))}
                onInput={() => setReviewMode('manual')}
                rows={4}
                className={`mt-4 w-full rounded-xl border px-4 py-3 outline-none transition ${
                  isDark
                    ? 'border-slate-800 bg-slate-900 text-white placeholder:text-slate-500'
                    : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400'
                }`}
                placeholder="Resumo final da correção para o aluno."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleAiReview()}
                disabled={aiReviewing || saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                {aiReviewing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Corrigir com IA
              </button>
              <button
                type="button"
                onClick={() => void handleSaveReview()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Salvar correção
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default TeacherActivitiesWorkspace;
