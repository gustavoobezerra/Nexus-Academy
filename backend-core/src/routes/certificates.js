import express from 'express';
import Certificate from '../models/Certificate.js';
import Student from '../models/Student.js';
import Course from '../models/Course.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'admin'));

/**
 * @swagger
 * /api/certificates:
 *   get:
 *     summary: Listar certificados
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  try {
    const { studentId, courseId, status } = req.query;
    const query = { teacher: req.user._id };

    if (studentId) query.student = studentId;
    if (courseId) query.course = courseId;
    if (status) query.status = status;

    const certificates = await Certificate.find(query)
      .populate('student', 'name email')
      .populate('course', 'title')
      .sort({ issueDate: -1 });

    res.json({ success: true, certificates });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

/**
 * @swagger
 * /api/certificates:
 *   post:
 *     summary: Emitir novo certificado
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req, res) => {
  try {
    const { studentId, courseId, classId, title, description, achievementType, score, grade } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID é obrigatório' });
    }

    const student = await Student.findOne({ _id: studentId, teacher: req.user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
    }

    const certificateData = {
      student: studentId,
      teacher: req.user._id,
      course: courseId,
      class: classId,
      title: title || 'Certificado de Conclusão',
      description,
      achievementType: achievementType || 'course_completion',
      score,
      grade,
      completionDate: new Date()
    };

    const certificate = await Certificate.create(certificateData);

    // Gerar PDF do certificado
    try {
      const pdfService = (await import('../services/pdfService.js')).default;
      const pdfResult = await pdfService.generateCertificate(
        certificate,
        student,
        student.teacher,
        courseId ? await Course.findById(courseId) : null
      );
      
      if (pdfResult && pdfResult.url) {
        certificate.pdfUrl = pdfResult.url;
        await certificate.save();
      }
    } catch (error) {
      console.error('Error generating certificate PDF:', error);
      // Continuar mesmo se PDF falhar
    }

    res.status(201).json({ success: true, certificate });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

/**
 * @swagger
 * /api/certificates/verify/:code:
 *   get:
 *     summary: Verificar certificado por código
 *     tags: [Certificates]
 */
router.get('/verify/:code', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ 
      verificationCode: req.params.code,
      status: 'issued'
    })
      .populate('student', 'name email')
      .populate('teacher', 'name email')
      .populate('course', 'title');

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificado não encontrado ou inválido' 
      });
    }

    res.json({ 
      success: true, 
      certificate: {
        certificateNumber: certificate.certificateNumber,
        title: certificate.title,
        student: certificate.student,
        teacher: certificate.teacher,
        course: certificate.course,
        issueDate: certificate.issueDate,
        isVerified: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

export default router;

