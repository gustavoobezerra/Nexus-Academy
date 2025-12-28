import express from 'express';
import Course from '../models/Course.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all courses
router.get('/', protect, async (req, res) => {
  try {
    const courses = await Course.find({ teacher: req.user._id }).populate('enrollments.student', 'name email');
    res.json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single course
router.get('/:id', protect, async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, teacher: req.user._id }).populate('enrollments.student', 'name email');
    if (!course) return res.status(404).json({ success: false, message: 'Curso não encontrado' });
    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create course
router.post('/', protect, async (req, res) => {
  try {
    const course = await Course.create({ ...req.body, teacher: req.user._id });
    res.status(201).json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update course
router.put('/:id', protect, async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!course) return res.status(404).json({ success: false, message: 'Curso não encontrado' });
    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete course
router.delete('/:id', protect, async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    if (!course) return res.status(404).json({ success: false, message: 'Curso não encontrado' });
    res.json({ success: true, message: 'Curso removido' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Enroll student
router.post('/:id/enroll', protect, async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!course) return res.status(404).json({ success: false, message: 'Curso não encontrado' });

    const existingEnrollment = course.enrollments.find(e => e.student.toString() === req.body.studentId);
    if (existingEnrollment) return res.status(400).json({ success: false, message: 'Aluno já matriculado' });

    course.enrollments.push({ student: req.body.studentId, enrolledAt: new Date() });
    await course.save();

    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update student progress
router.put('/:id/progress/:studentId', protect, async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!course) return res.status(404).json({ success: false, message: 'Curso não encontrado' });

    const enrollment = course.enrollments.find(e => e.student.toString() === req.params.studentId);
    if (!enrollment) return res.status(404).json({ success: false, message: 'Matrícula não encontrada' });

    Object.assign(enrollment, req.body);
    await course.save();

    res.json({ success: true, enrollment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Complete lesson
router.post('/:id/complete-lesson', protect, async (req, res) => {
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
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
