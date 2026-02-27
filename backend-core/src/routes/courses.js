import express from 'express';
import Course from '../models/Course.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'admin'));

// Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({ teacher: req.user._id }).populate('enrollments.student', 'name email');
    res.json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

// Get single course
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, teacher: req.user._id }).populate('enrollments.student', 'name email');
    if (!course) return res.status(404).json({ success: false, message: 'Curso não encontrado' });
    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

// Create course
router.post('/', async (req, res) => {
  try {
    const course = await Course.create({ ...req.body, teacher: req.user._id });
    res.status(201).json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

// Update course
router.put('/:id', async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!course) return res.status(404).json({ success: false, message: 'Curso não encontrado' });
    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

// Delete course
router.delete('/:id', async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    if (!course) return res.status(404).json({ success: false, message: 'Curso não encontrado' });
    res.json({ success: true, message: 'Curso removido' });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

// Enroll student
router.post('/:id/enroll', async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!course) return res.status(404).json({ success: false, message: 'Curso não encontrado' });

    const existingEnrollment = course.enrollments.find(e => e.student.toString() === req.body.studentId);
    if (existingEnrollment) return res.status(400).json({ success: false, message: 'Aluno já matriculado' });

    course.enrollments.push({ student: req.body.studentId, enrolledAt: new Date() });
    await course.save();

    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

// Update student progress
router.put('/:id/progress/:studentId', async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!course) return res.status(404).json({ success: false, message: 'Curso não encontrado' });

    const enrollment = course.enrollments.find(e => e.student.toString() === req.params.studentId);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Matrícula não encontrada' });

    Object.assign(enrollment, req.body);
    await course.save();

    res.json({ success: true, enrollment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

// Complete lesson
router.post('/:id/complete-lesson', async (req, res) => {
  try {
    const { studentId, moduleIndex, lessonIndex } = req.body;
    const course = await Course.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!course) return res.status(404).json({ success: false, message: 'Curso não encontrado' });

    const enrollment = course.enrollments.find(e => e.student.toString() === studentId);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Matrícula não encontrada' });

    enrollment.completedLessons.push({ moduleIndex, lessonIndex, completedAt: new Date() });
    enrollment.progress = Math.round((enrollment.completedLessons.length / course.totalLessons) * 100);

    if (enrollment.progress === 100) {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
    }

    await course.save();
    res.json({ success: true, enrollment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

export default router;
