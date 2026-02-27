import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { generateTeachingSuggestions, generateStudentReport } from '../services/teachingAssistantService.js';

const router = express.Router();

/**
 * GET /api/teaching-assistant/suggestions
 * Get AI-powered teaching suggestions
 */
router.get('/suggestions', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { studentId } = req.query;
    const teacherId = req.user._id;

    const result = await generateTeachingSuggestions(teacherId, studentId || null);

    return res.json(result);
  } catch (error) {
    console.error('Error fetching teaching suggestions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating teaching suggestions'
    });
  }
});

/**
 * GET /api/teaching-assistant/student-report/:studentId
 * Get comprehensive student report with recommendations
 */
router.get('/student-report/:studentId', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.user._id;

    const result = await generateStudentReport(teacherId, studentId);

    return res.json(result);
  } catch (error) {
    console.error('Error generating student report:', error);
    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor" || 'Error generating student report'
    });
  }
});

export default router;
