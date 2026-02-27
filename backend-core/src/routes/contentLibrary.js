import express from 'express';
import ContentLibrary from '../models/ContentLibrary.js';
import { authorize, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'admin'));

/**
 * @swagger
 * /api/content-library:
 *   get:
 *     summary: Buscar conteúdo na biblioteca
 *     tags: [Content Library]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      type, 
      subject, 
      visibility, 
      isForSale,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    // Filtros
    if (search) {
      query.$text = { $search: search };
    }
    if (type) query.type = type;
    if (subject) query.subject = subject;
    if (visibility) {
      query.$or = [
        { visibility: visibility },
        { teacher: req.user._id } // Sempre mostrar conteúdo próprio
      ];
    } else {
      query.$or = [
        { visibility: 'public' },
        { teacher: req.user._id },
        { 'sharedWith.teacherId': req.user._id }
      ];
    }
    if (isForSale !== undefined) {
      query.isForSale = isForSale === 'true';
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === 'desc' ? -1 : 1;

    const contents = await ContentLibrary.find(query)
      .populate('teacher', 'name email avatar')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await ContentLibrary.countDocuments(query);

    res.json({
      success: true,
      contents,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

/**
 * @swagger
 * /api/content-library:
 *   post:
 *     summary: Adicionar conteúdo à biblioteca
 *     tags: [Content Library]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req, res) => {
  try {
    const contentData = {
      ...req.body,
      teacher: req.user._id
    };

    const content = await ContentLibrary.create(contentData);
    res.status(201).json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

/**
 * @swagger
 * /api/content-library/:id/review:
 *   post:
 *     summary: Adicionar review a um conteúdo
 *     tags: [Content Library]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/review', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const content = await ContentLibrary.findById(req.params.id);

    if (!content) {
      return res.status(404).json({ success: false, message: 'Conteúdo não encontrado' });
    }

    await content.addReview(req.user._id, rating, comment);
    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

/**
 * @swagger
 * /api/content-library/:id/favorite:
 *   post:
 *     summary: Favoritar/desfavoritar conteúdo
 *     tags: [Content Library]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/favorite', async (req, res) => {
  try {
    const content = await ContentLibrary.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ success: false, message: 'Conteúdo não encontrado' });
    }

    await content.toggleFavorite(req.user._id);
    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

export default router;

