import express from 'express';
import {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentStats
} from '../controllers/studentController.js';
import { protect, requireCompletedOnboarding } from '../middleware/auth.js';

const router = express.Router();

// Proteger com autenticação E onboarding completo
router.use(protect);
router.use(requireCompletedOnboarding);

router.route('/')
  .get(getStudents)
  .post(createStudent);

router.get('/stats', getStudentStats);
router.get('/stats/summary', getStudentStats);

router.route('/:id')
  .get(getStudent)
  .put(updateStudent)
  .delete(deleteStudent);

export default router;
