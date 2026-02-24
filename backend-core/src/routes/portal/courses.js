import express from 'express';
import Course from '../../models/Course.js';
import { authenticateStudent } from '../../middleware/studentAuth.js';

const router = express.Router();

// GET /api/portal/courses
router.get('/courses', authenticateStudent, async (req, res) => {
  try {
    const courses = await Course.find({
      enrollments: {
        $elemMatch: {
          student: req.studentId,
          status: 'active'
        }
      }
    })
      // enrollments incluído para acessar progresso do aluno
      .select('title description thumbnail modules totalLessons totalDuration enrollments')
      .lean();

    const coursesWithProgress = courses.map(course => {
      const enrollment = (course.enrollments || []).find(
        e => e.student.toString() === req.studentId.toString()
      );
      // Remover lista completa de enrollments da resposta
      const { enrollments: _, ...courseData } = course;
      return {
        ...courseData,
        progress: enrollment?.progress || 0,
        currentModule: enrollment?.currentModule || 0,
        currentLesson: enrollment?.currentLesson || 0,
        completedLessons: enrollment?.completedLessons?.length || 0
      };
    });

    res.json({ success: true, courses: coursesWithProgress });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao obter cursos' });
  }
});

export default router;
