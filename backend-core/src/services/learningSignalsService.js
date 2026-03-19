import mongoose from 'mongoose';
import LearningSignal from '../models/LearningSignal.js';

const OBJECTIVE_QUESTION_TYPES = new Set(['multiple_choice', 'true_false', 'fill_blank']);
const LANGUAGE_SUBJECT_PATTERN = /(ingles|english|idioma|pronunci|speaking|conversation)/i;

const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const toIdString = (value) => value?._id?.toString?.() || value?.id || value?.toString?.() || '';

const clampPercent = (value) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numericValue)));
};

const looksGenericTopic = (value) => {
  const normalizedValue = normalizeText(value).toLowerCase();
  return !normalizedValue || ['geral', 'atividade', 'atividade publicada', 'pratica', 'prática'].includes(normalizedValue);
};

const toObjectId = (value) => {
  const normalizedValue = toIdString(value);
  return normalizedValue && mongoose.Types.ObjectId.isValid(normalizedValue)
    ? new mongoose.Types.ObjectId(normalizedValue)
    : null;
};

const sortByWeakestFirst = (items) => {
  return [...items].sort((left, right) => {
    if (left.averageScore !== right.averageScore) {
      return left.averageScore - right.averageScore;
    }

    if (left.signalCount !== right.signalCount) {
      return right.signalCount - left.signalCount;
    }

    return left.label.localeCompare(right.label, 'pt-BR');
  });
};

const getActivitySubject = (activity) => {
  return normalizeText(
    activity?.aiMetadata?.topics?.[0]
    || activity?.subject
    || activity?.class?.subject
    || activity?.studentSubject
    || 'Geral'
  );
};

const getQuestionTopic = (question, activity) => {
  const topicFromQuestion = Array.isArray(question?.topics)
    ? question.topics.find((topic) => !looksGenericTopic(topic))
    : '';

  return normalizeText(
    topicFromQuestion
    || activity?.aiMetadata?.topics?.find((topic) => !looksGenericTopic(topic))
    || activity?.aiMetadata?.learningObjective
    || activity?.title
    || 'Geral'
  );
};

const buildInsightSnapshot = (studentId, signals) => {
  const subjectMap = new Map();
  const topicMap = new Map();
  let weightedScore = 0;
  let totalWeight = 0;
  let objectiveScore = 0;
  let objectiveCount = 0;
  let pronunciationScore = 0;
  let pronunciationCount = 0;
  let latestSignalAt = null;

  for (const signal of signals) {
    const weight = Number(signal.signalWeight) || 1;
    const score = clampPercent(signal.score);
    const subject = normalizeText(signal.subject || 'Geral');
    const topic = normalizeText(signal.topic || 'Geral');
    const capturedAt = signal.capturedAt || signal.createdAt || new Date();

    weightedScore += score * weight;
    totalWeight += weight;

    if (!latestSignalAt || new Date(capturedAt) > new Date(latestSignalAt)) {
      latestSignalAt = capturedAt;
    }

    const currentSubject = subjectMap.get(subject) || {
      label: subject,
      averageScore: 0,
      weightedScore: 0,
      totalWeight: 0,
      signalCount: 0
    };
    currentSubject.weightedScore += score * weight;
    currentSubject.totalWeight += weight;
    currentSubject.signalCount += 1;
    currentSubject.averageScore = Math.round(currentSubject.weightedScore / currentSubject.totalWeight);
    subjectMap.set(subject, currentSubject);

    const topicKey = `${subject}::${topic}`;
    const currentTopic = topicMap.get(topicKey) || {
      label: topic,
      subject,
      averageScore: 0,
      weightedScore: 0,
      totalWeight: 0,
      signalCount: 0,
      sourceType: signal.sourceType
    };
    currentTopic.weightedScore += score * weight;
    currentTopic.totalWeight += weight;
    currentTopic.signalCount += 1;
    currentTopic.averageScore = Math.round(currentTopic.weightedScore / currentTopic.totalWeight);
    topicMap.set(topicKey, currentTopic);

    if (signal.sourceType === 'activity' && signal.eventType === 'question_response') {
      objectiveScore += score;
      objectiveCount += 1;
    }

    if (signal.sourceType === 'pronunciation') {
      pronunciationScore += score;
      pronunciationCount += 1;
    }
  }

  const weakestSubjects = sortByWeakestFirst([...subjectMap.values()]).slice(0, 4);
  const weakestTopics = sortByWeakestFirst([...topicMap.values()]).slice(0, 6);

  return {
    studentId,
    totalSignals: signals.length,
    averageScore: totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0,
    objectiveAccuracy: objectiveCount > 0 ? Math.round(objectiveScore / objectiveCount) : null,
    pronunciationAverage: pronunciationCount > 0 ? Math.round(pronunciationScore / pronunciationCount) : null,
    weakestSubjects,
    weakestTopics,
    lastSignalAt: latestSignalAt ? new Date(latestSignalAt).toISOString() : null
  };
};

/**
 * Grava sinais granulares a partir da submissão de uma atividade do portal.
 */
export const recordActivitySubmissionSignals = async ({ activity, submission }) => {
  if (!activity?._id || !submission) {
    return [];
  }

  const submissionTimestamp = submission.submittedAt || new Date();
  const activitySubject = getActivitySubject(activity);
  const answersByQuestion = new Map(
    Array.isArray(submission.answers)
      ? submission.answers.map((answer) => [Number(answer.questionNumber), answer])
      : []
  );

  const signals = (activity.questions || []).map((question) => {
    const questionNumber = Number(question.questionNumber);
    const answer = answersByQuestion.get(questionNumber);
    const questionPoints = Number(question.points) || 0;
    const pointsEarned = Number(answer?.pointsEarned) || 0;
    const isObjectiveQuestion = OBJECTIVE_QUESTION_TYPES.has(question.type);
    const score = questionPoints > 0
      ? clampPercent((pointsEarned / questionPoints) * 100)
      : clampPercent(answer?.isCorrect ? 100 : 0);

    return {
      student: activity.student,
      teacher: activity.teacher,
      class: activity.class || null,
      activity: activity._id,
      sourceType: 'activity',
      eventType: 'question_response',
      subject: activitySubject,
      topic: getQuestionTopic(question, activity),
      difficulty: normalizeText(question.difficulty || 'medium'),
      correctness: typeof answer?.isCorrect === 'boolean'
        ? answer.isCorrect
        : (isObjectiveQuestion ? false : null),
      score,
      maxScore: 100,
      signalWeight: question.type === 'essay' ? 1.15 : 1,
      metadata: {
        questionNumber,
        answer: normalizeText(answer?.answer),
        expectedAnswer: normalizeText(question.correctAnswer),
        feedback: normalizeText(answer?.feedback || question.explanation),
        sourceId: toIdString(activity._id),
        tags: Array.isArray(question.topics) ? question.topics.filter(Boolean) : [],
        details: {
          question: question.question,
          points: questionPoints,
          pointsEarned,
          activityTitle: activity.title,
          activityType: activity.type
        }
      },
      capturedAt: submissionTimestamp
    };
  });

  signals.push({
    student: activity.student,
    teacher: activity.teacher,
    class: activity.class || null,
    activity: activity._id,
    sourceType: 'activity',
    eventType: 'activity_submission',
    subject: activitySubject,
    topic: normalizeText(activity.title || 'Atividade publicada'),
    difficulty: 'mixed',
    correctness: submission.percentage >= 70,
    score: clampPercent(submission.percentage),
    maxScore: 100,
    signalWeight: 2,
    metadata: {
      sourceId: toIdString(activity._id),
      feedback: normalizeText(submission.teacherFeedback),
      details: {
        activityTitle: activity.title,
        activityType: activity.type,
        totalQuestions: Array.isArray(activity.questions) ? activity.questions.length : 0,
        score: Number(submission.score) || 0,
        percentage: clampPercent(submission.percentage),
        autoGraded: Boolean(submission.autoGraded)
      }
    },
    capturedAt: submissionTimestamp
  });

  if (signals.length > 0) {
    await LearningSignal.insertMany(signals);
  }

  return signals;
};

/**
 * Persiste sinais detalhados de pronúncia para alimentar insights e recomendações.
 */
export const recordPronunciationSignals = async ({ pronunciationTest, studentSubject }) => {
  if (!pronunciationTest?._id) {
    return [];
  }

  const normalizedSubject = normalizeText(
    LANGUAGE_SUBJECT_PATTERN.test(studentSubject || '')
      ? studentSubject
      : (studentSubject || 'Pronúncia')
  );

  const timestamp = pronunciationTest.createdAt || new Date();
  const signals = [
    {
      student: pronunciationTest.student,
      teacher: pronunciationTest.teacher,
      pronunciationTest: pronunciationTest._id,
      sourceType: 'pronunciation',
      eventType: 'pronunciation_phrase',
      subject: normalizedSubject,
      topic: normalizeText(`Pronúncia ${pronunciationTest.difficulty}`),
      difficulty: normalizeText(pronunciationTest.difficulty || 'intermediate'),
      correctness: Number(pronunciationTest.pronunciationScore) >= 0.85,
      score: clampPercent(Number(pronunciationTest.pronunciationScore) * 100),
      maxScore: 100,
      signalWeight: 2,
      metadata: {
        phrase: normalizeText(pronunciationTest.phrase),
        feedback: normalizeText(pronunciationTest.feedback),
        sourceId: toIdString(pronunciationTest._id),
        details: {
          accuracyScore: clampPercent(Number(pronunciationTest.accuracyScore) * 100),
          fluencyScore: clampPercent(Number(pronunciationTest.fluencyScore) * 100)
        }
      },
      capturedAt: timestamp
    }
  ];

  for (const wordScore of pronunciationTest.wordScores || []) {
    signals.push({
      student: pronunciationTest.student,
      teacher: pronunciationTest.teacher,
      pronunciationTest: pronunciationTest._id,
      sourceType: 'pronunciation',
      eventType: 'pronunciation_word',
      subject: normalizedSubject,
      topic: normalizeText(wordScore.word || 'Pronúncia'),
      difficulty: normalizeText(pronunciationTest.difficulty || 'intermediate'),
      correctness: Number(wordScore.score) >= 0.85,
      score: clampPercent(Number(wordScore.score) * 100),
      maxScore: 100,
      signalWeight: 1,
      metadata: {
        word: normalizeText(wordScore.word),
        sourceId: toIdString(pronunciationTest._id),
        tags: Array.isArray(wordScore.phonemes) ? wordScore.phonemes.filter(Boolean) : [],
        details: {
          phonetic: normalizeText(wordScore.phonetic),
          syllables: Array.isArray(wordScore.syllables) ? wordScore.syllables : []
        }
      },
      capturedAt: timestamp
    });
  }

  await LearningSignal.insertMany(signals);
  return signals;
};

/**
 * Constrói snapshots resumidos por aluno para o AI Hub.
 */
export const buildLearningSnapshots = async ({ teacherId, studentIds = [] }) => {
  const teacherObjectId = toObjectId(teacherId);
  if (!teacherObjectId) {
    return [];
  }

  const query = {
    teacher: teacherObjectId
  };

  if (studentIds.length > 0) {
    const studentObjectIds = studentIds
      .map((studentId) => toObjectId(studentId))
      .filter(Boolean);

    if (studentObjectIds.length > 0) {
      query.student = { $in: studentObjectIds };
    }
  }

  const signals = await LearningSignal.find(query)
    .sort({ capturedAt: -1 })
    .limit(5000)
    .lean();

  const groupedSignals = new Map();

  for (const signal of signals) {
    const studentId = toIdString(signal.student);
    const currentSignals = groupedSignals.get(studentId) || [];
    currentSignals.push(signal);
    groupedSignals.set(studentId, currentSignals);
  }

  return [...groupedSignals.entries()]
    .map(([studentId, studentSignals]) => buildInsightSnapshot(studentId, studentSignals))
    .sort((left, right) => (right.totalSignals || 0) - (left.totalSignals || 0));
};

/**
 * Sugestão pedagógica principal para o professor ao criar uma nova aula.
 */
export const buildStudentSubjectSuggestion = async ({ teacherId, student, classes = [] }) => {
  const studentId = toIdString(student);
  const snapshots = await buildLearningSnapshots({ teacherId, studentIds: [studentId] });
  const snapshot = snapshots[0] || {
    totalSignals: 0,
    averageScore: student?.performance?.overall || 0,
    weakestSubjects: [],
    weakestTopics: [],
    pronunciationAverage: null
  };

  const weakestTopic = snapshot.weakestTopics?.[0];
  const weakestSubject = snapshot.weakestSubjects?.[0];
  const recentClass = [...classes]
    .sort((left, right) => new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime())[0];

  const suggestedSubject = normalizeText(
    weakestSubject?.label
    || student.subject
    || recentClass?.subject
    || 'Revisão personalizada'
  );

  const suggestedTopic = normalizeText(
    weakestTopic?.label
    || student?.performance?.weaknesses?.[0]
    || recentClass?.topic
    || recentClass?.title
    || 'Consolidação do conteúdo recente'
  );

  const evidence = [];

  if (weakestTopic) {
    evidence.push(`Tema com média recente de ${weakestTopic.averageScore}% em ${weakestTopic.signalCount} sinal(is): ${weakestTopic.label}.`);
  }

  if (weakestSubject) {
    evidence.push(`Área com maior atrito recente: ${weakestSubject.label}, média ${weakestSubject.averageScore}%.`);
  }

  if (snapshot.pronunciationAverage !== null && snapshot.pronunciationAverage < 80) {
    evidence.push(`Pronúncia recente com média ${snapshot.pronunciationAverage}%, indicando espaço para reforço guiado.`);
  }

  if (student?.performance?.weaknesses?.length) {
    evidence.push(`Fraquezas registradas no perfil: ${student.performance.weaknesses.join(', ')}.`);
  }

  if (recentClass?.title) {
    evidence.push(`Última aula registrada: ${recentClass.title}${recentClass.subject ? ` (${recentClass.subject})` : ''}.`);
  }

  if (evidence.length === 0) {
    evidence.push('Ainda há poucos sinais detalhados; a recomendação usa o histórico cadastrado e a matéria principal do aluno.');
  }

  const confidenceBase = snapshot.totalSignals >= 12 ? 88 : snapshot.totalSignals >= 6 ? 76 : 62;
  const confidence = weakestTopic ? confidenceBase : Math.max(55, confidenceBase - 8);

  return {
    providerMode: 'fallback',
    confidence,
    suggestion: {
      subject: suggestedSubject,
      topic: suggestedTopic,
      explanation: `A melhor próxima aula para ${student.name} deve atacar ${suggestedTopic} dentro de ${suggestedSubject}, porque essa é a frente com mais atrito no histórico recente.`,
      evidence,
      basedOn: {
        signalCount: snapshot.totalSignals || 0,
        averageScore: snapshot.averageScore || 0,
        sourceTypes: uniqueSourceTypes(snapshot, weakestTopic)
      }
    }
  };
};

const uniqueSourceTypes = (snapshot, weakestTopic) => {
  const sourceTypes = new Set();

  if (weakestTopic?.sourceType) {
    sourceTypes.add(weakestTopic.sourceType);
  }

  if (snapshot.pronunciationAverage !== null) {
    sourceTypes.add('pronunciation');
  }

  if (snapshot.objectiveAccuracy !== null) {
    sourceTypes.add('activity');
  }

  return [...sourceTypes];
};

export default {
  buildLearningSnapshots,
  buildStudentSubjectSuggestion,
  recordActivitySubmissionSignals,
  recordPronunciationSignals
};
