import express from 'express';
import { Quiz, QuizAttempt } from '../models/Quiz.js';
import Student from '../models/Student.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'admin'));

/**
 * @swagger
 * /api/quizzes:
 *   get:
 *     summary: Listar quizzes do professor
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  try {
    const { status, relatedClass, relatedStudent } = req.query;
    const query = { teacher: req.user._id };

    if (status) query.status = status;
    if (relatedClass) query.relatedClass = relatedClass;
    if (relatedStudent) query.relatedStudent = relatedStudent;

    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 })
      .populate('relatedClass', 'title')
      .populate('relatedStudent', 'name');

    res.json({ success: true, quizzes });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

/**
 * @swagger
 * /api/quizzes:
 *   post:
 *     summary: Criar novo quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req, res) => {
  try {
    const quizData = {
      ...req.body,
      teacher: req.user._id
    };

    const quiz = await Quiz.create(quizData);
    res.status(201).json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

/**
 * @swagger
 * /api/quizzes/:id:
 *   get:
 *     summary: Obter quiz específico
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, teacher: req.user._id })
      .populate('relatedClass', 'title')
      .populate('relatedStudent', 'name');

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz não encontrado' });
    }

    res.json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

/**
 * @swagger
 * /api/quizzes/:id/attempts:
 *   post:
 *     summary: Iniciar tentativa de quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/attempts', async (req, res) => {
  try {
    const { studentId } = req.body;
    const quiz = await Quiz.findOne({ _id: req.params.id, teacher: req.user._id });

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz não encontrado' });
    }

    const student = await Student.findOne({ _id: studentId, teacher: req.user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }

    // Verificar tentativas anteriores
    const previousAttempts = await QuizAttempt.countDocuments({
      quiz: quiz._id,
      student: studentId
    });

    if (previousAttempts >= quiz.maxAttempts) {
      return res.status(400).json({ 
        success: false, 
        message: `Limite de ${quiz.maxAttempts} tentativa(s) atingido` 
      });
    }

    const attempt = await QuizAttempt.create({
      quiz: quiz._id,
      student: studentId,
      teacher: req.user._id,
      startedAt: new Date(),
      status: 'in_progress',
      attemptNumber: previousAttempts + 1
    });

    res.status(201).json({ success: true, attempt });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

/**
 * @swagger
 * /api/quizzes/attempts/:id/submit:
 *   post:
 *     summary: Submeter tentativa de quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/attempts/:id/submit', async (req, res) => {
  try {
    const { answers } = req.body;
    const attempt = await QuizAttempt.findOne({ 
      _id: req.params.id,
      teacher: req.user._id
    }).populate('quiz');

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Tentativa não encontrada' });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ 
        success: false, 
        message: 'Tentativa já foi submetida' 
      });
    }

    const quiz = attempt.quiz;
    let totalScore = 0;
    const processedAnswers = [];

    // Processar respostas e calcular pontuação
    for (const answer of answers) {
      const question = quiz.questions.find(q => 
        q._id.toString() === answer.questionId.toString()
      );

      if (!question) continue;

      let isCorrect = false;
      let pointsEarned = 0;

      // Verificar resposta baseado no tipo
      if (question.type === 'multiple_choice') {
        const selectedOption = question.options[answer.answer];
        isCorrect = selectedOption?.isCorrect || false;
        pointsEarned = isCorrect ? question.points : 0;
      } else if (question.type === 'true_false') {
        isCorrect = answer.answer === question.correctAnswer;
        pointsEarned = isCorrect ? question.points : 0;
      } else if (question.type === 'fill_blank') {
        // Verificar cada blank
        const blanksCorrect = question.blanks.every((blank, index) => {
          const answerText = answer.answer[index]?.toLowerCase().trim();
          const correctText = blank.correctAnswer.toLowerCase().trim();
          return answerText === correctText || 
                 blank.alternatives.some(alt => alt.toLowerCase().trim() === answerText);
        });
        isCorrect = blanksCorrect;
        pointsEarned = isCorrect ? question.points : 0;
      } else if (question.type === 'essay') {
        // Para dissertativas, marcar como pendente de correção manual
        isCorrect = false;
        pointsEarned = 0; // Será corrigido manualmente ou por IA
      }

      totalScore += pointsEarned;

      processedAnswers.push({
        questionId: question._id,
        questionIndex: quiz.questions.indexOf(question),
        answer: answer.answer,
        isCorrect,
        pointsEarned,
        timeSpent: answer.timeSpent || 0,
        answeredAt: new Date()
      });
    }

    // Atualizar tentativa
    attempt.answers = processedAnswers;
    attempt.submittedAt = new Date();
    attempt.status = 'submitted';
    attempt.totalPoints = totalScore;
    await attempt.save();

    // Atualizar estatísticas do quiz
    await quiz.calculateStatistics();

    res.json({ success: true, attempt });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

/**
 * @swagger
 * /api/quizzes/attempts/:id:
 *   get:
 *     summary: Obter tentativa específica
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/attempts/:id', async (req, res) => {
  try {
    const attempt = await QuizAttempt.findOne({ 
      _id: req.params.id,
      teacher: req.user._id
    })
      .populate('quiz')
      .populate('student', 'name email');

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Tentativa não encontrada' });
    }

    res.json({ success: true, attempt });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

export default router;

