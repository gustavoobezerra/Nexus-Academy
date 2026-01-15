import express from 'express';
import {
  getClasses,
  getClass,
  createClass,
  updateClass,
  generateAISummary,
  getClassStats
} from '../controllers/classController.js';
import { authorize, protect, requireCompletedOnboarding } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'admin'));
router.use(requireCompletedOnboarding);

router.route('/')
  .get(getClasses)
  .post(createClass);

router.get('/stats', getClassStats);

router.post('/:id/generate-summary', generateAISummary);

router.route('/:id')
  .get(getClass)
  .put(updateClass)
  .patch(updateClass);

export default router;
