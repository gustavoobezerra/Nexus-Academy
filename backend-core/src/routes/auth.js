import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Rota pública para buscar professor por slug (para cadastro de aluno)
router.get('/teacher/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const teacher = await User.findOne({ slug, role: 'teacher' }).select('name email slug subscriptionStatus');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Professor não encontrado'
      });
    }

    // Verificar se o professor está ativo
    if (!['active', 'trialing'].includes(teacher.subscriptionStatus)) {
      return res.status(403).json({
        success: false,
        message: 'Este professor não está aceitando novos alunos no momento'
      });
    }

    res.json({
      success: true,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        slug: teacher.slug
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar professor'
    });
  }
});

export default router;
