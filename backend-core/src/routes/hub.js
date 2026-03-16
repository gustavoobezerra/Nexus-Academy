import express from 'express';
import User from '../models/User.js';
import { authorize, protect, requireCompletedOnboarding } from '../middleware/auth.js';

const router = express.Router();

const ensureArray = (value) => Array.isArray(value) ? value : [];
const createItemId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

router.use(protect);
router.use(authorize('teacher', 'admin'));
router.use(requireCompletedOnboarding);

router.get('/grades', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('teacherWorkspace.grades')
      .lean();

    res.json(ensureArray(user?.teacherWorkspace?.grades));
  } catch (error) {
    console.error('[Hub] Error fetching grades:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar notas' });
  }
});

router.post('/grades', async (req, res) => {
  try {
    const { studentId, classId, subject, score, maxScore, assessmentType } = req.body;
    const numericScore = Number(score) || 0;
    const numericMaxScore = Number(maxScore) || 100;

    const grade = {
      id: createItemId('grade'),
      studentId: String(studentId || ''),
      classId: String(classId || ''),
      subject: String(subject || 'Avaliação'),
      score: numericScore,
      maxScore: numericMaxScore,
      percentage: numericMaxScore > 0 ? (numericScore / numericMaxScore) * 100 : 0,
      assessmentType: ['quiz', 'exercise', 'test', 'participation'].includes(assessmentType)
        ? assessmentType
        : 'exercise',
      createdAt: new Date()
    };

    await User.findByIdAndUpdate(req.user._id, {
      $push: { 'teacherWorkspace.grades': grade }
    });

    res.status(201).json(grade);
  } catch (error) {
    console.error('[Hub] Error creating grade:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar nota' });
  }
});

router.get('/materials', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('teacherWorkspace.materials')
      .lean();

    res.json(ensureArray(user?.teacherWorkspace?.materials));
  } catch (error) {
    console.error('[Hub] Error fetching materials:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar materiais' });
  }
});

router.post('/materials', async (req, res) => {
  try {
    const material = {
      id: createItemId('material'),
      classId: String(req.body.classId || ''),
      className: String(req.body.className || ''),
      topic: String(req.body.topic || ''),
      title: String(req.body.title || '').trim(),
      type: ['pdf', 'video', 'link', 'exercise'].includes(req.body.type)
        ? req.body.type
        : 'pdf',
      url: String(req.body.url || '').trim(),
      description: String(req.body.description || '').trim(),
      uploadedAt: new Date()
    };

    if (!material.title || !material.url) {
      return res.status(400).json({ success: false, message: 'Título e URL são obrigatórios' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $push: { 'teacherWorkspace.materials': material }
    });

    res.status(201).json(material);
  } catch (error) {
    console.error('[Hub] Error creating material:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar material' });
  }
});

router.get('/teaching-templates', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('teacherWorkspace.teachingTemplates')
      .lean();

    res.json(ensureArray(user?.teacherWorkspace?.teachingTemplates));
  } catch (error) {
    console.error('[Hub] Error fetching teaching templates:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar templates' });
  }
});

router.post('/teaching-templates', async (req, res) => {
  try {
    const template = {
      id: createItemId('tpl'),
      name: String(req.body.name || '').trim(),
      description: String(req.body.description || '').trim(),
      subject: String(req.body.subject || '').trim(),
      duration: Number(req.body.duration) || 60,
      structure: {
        warmup: String(req.body.structure?.warmup || '').trim(),
        mainTopic: String(req.body.structure?.mainTopic || '').trim(),
        exercises: String(req.body.structure?.exercises || '').trim(),
        closing: String(req.body.structure?.closing || '').trim()
      },
      materials: ensureArray(req.body.materials).map((item) => String(item)),
      createdAt: new Date()
    };

    if (!template.name) {
      return res.status(400).json({ success: false, message: 'Nome do template é obrigatório' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $push: { 'teacherWorkspace.teachingTemplates': template }
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('[Hub] Error creating teaching template:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar template' });
  }
});

router.get('/referral', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('referralCode referralCount referralBonus')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    res.json({
      id: `ref_${req.user._id}`,
      teacherId: req.user._id.toString(),
      code: user.referralCode,
      fullUrl: `${frontendUrl}/register?ref=${user.referralCode}`,
      totalReferred: user.referralCount || 0,
      activeReferred: user.referralCount || 0,
      totalBonus: user.referralBonus || 0,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('[Hub] Error fetching referral data:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar referência' });
  }
});

router.get('/course-plans', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('teacherWorkspace.coursePlans')
      .lean();

    res.json(ensureArray(user?.teacherWorkspace?.coursePlans));
  } catch (error) {
    console.error('[Hub] Error fetching course plans:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar planos' });
  }
});

router.post('/course-plans', async (req, res) => {
  try {
    const modules = ensureArray(req.body.modules).map((module, index) => ({
      order: Number(module?.order) || index + 1,
      name: String(module?.name || '').trim(),
      topics: ensureArray(module?.topics).map((topic) => String(topic)),
      duration: Number(module?.duration) || 0,
      students: ensureArray(module?.students).map((student) => String(student))
    }));

    const coursePlan = {
      id: createItemId('plan'),
      name: String(req.body.name || '').trim(),
      description: String(req.body.description || '').trim(),
      totalModules: Number(req.body.totalModules) || modules.length,
      modules,
      createdAt: new Date()
    };

    if (!coursePlan.name) {
      return res.status(400).json({ success: false, message: 'Nome do plano é obrigatório' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $push: { 'teacherWorkspace.coursePlans': coursePlan }
    });

    res.status(201).json(coursePlan);
  } catch (error) {
    console.error('[Hub] Error creating course plan:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar plano' });
  }
});

export default router;
