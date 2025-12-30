import express from 'express';
import HangmanGame from '../models/HangmanGame.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/hangman/games:
 *   get:
 *     summary: Listar jogos da forca do professor
 *     tags: [Hangman]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [waiting, active, won, lost, finished]
 *         description: Filtrar por status do jogo
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Número de jogos a retornar
 *     responses:
 *       200:
 *         description: Lista de jogos
 */
router.get('/games', authenticate, async (req, res) => {
  try {
    const { status, limit = 20 } = req.query;
    const teacherId = req.user._id;
    
    const query = { teacher: teacherId };
    if (status) {
      query.status = status;
    }
    
    const games = await HangmanGame.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('players.studentId', 'name email avatar');
    
    res.json({
      success: true,
      data: games.map(game => ({
        id: game._id,
        status: game.status,
        category: game.category,
        hint: game.hint,
        playersCount: game.players.length,
        wrongGuesses: game.wrongGuesses,
        maxWrongGuesses: game.maxWrongGuesses,
        startedAt: game.startedAt,
        finishedAt: game.finishedAt,
        duration: game.duration,
        createdAt: game.createdAt
      }))
    });
  } catch (error) {
    console.error('Erro ao listar jogos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar jogos'
    });
  }
});

/**
 * @swagger
 * /api/hangman/games/{id}:
 *   get:
 *     summary: Obter detalhes de um jogo específico
 *     tags: [Hangman]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do jogo
 *     responses:
 *       200:
 *         description: Detalhes do jogo
 */
router.get('/games/:id', authenticate, async (req, res) => {
  try {
    const game = await HangmanGame.findById(req.params.id)
      .populate('players.studentId', 'name email avatar');
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Jogo não encontrado'
      });
    }
    
    // Verificar se o usuário tem permissão (é o professor ou um dos jogadores)
    const isTeacher = game.teacher.toString() === req.user._id.toString();
    const isPlayer = game.players.some(p => 
      p.studentId._id.toString() === req.user._id.toString()
    );
    
    if (!isTeacher && !isPlayer) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    // Se o jogo ainda está ativo, não revelar a palavra
    const response = {
      success: true,
      data: {
        id: game._id,
        status: game.status,
        revealedWord: game.getRevealedWord(),
        hint: game.hint,
        category: game.category,
        guessedLetters: game.guessedLetters,
        wrongGuesses: game.wrongGuesses,
        maxWrongGuesses: game.maxWrongGuesses,
        players: game.players.map(p => ({
          id: p.studentId._id,
          name: p.studentId.name,
          avatar: p.studentId.avatar,
          score: p.score,
          guessesCount: p.guesses.length
        })),
        turnBased: game.turnBased,
        currentPlayerIndex: game.currentPlayerIndex,
        theme: game.theme,
        difficulty: game.difficulty,
        startedAt: game.startedAt,
        finishedAt: game.finishedAt,
        duration: game.duration,
        createdAt: game.createdAt
      }
    };
    
    // Se o jogo terminou ou o usuário é o professor, revelar a palavra
    if (game.status !== 'active' && game.status !== 'waiting' || isTeacher) {
      response.data.word = game.word;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Erro ao obter jogo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter jogo'
    });
  }
});

/**
 * @swagger
 * /api/hangman/games:
 *   post:
 *     summary: Criar novo jogo da forca
 *     tags: [Hangman]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - word
 *             properties:
 *               word:
 *                 type: string
 *                 description: Palavra a ser adivinhada
 *               hint:
 *                 type: string
 *                 description: Dica para os jogadores
 *               category:
 *                 type: string
 *                 description: Categoria da palavra
 *               maxWrongGuesses:
 *                 type: integer
 *                 default: 6
 *               turnBased:
 *                 type: boolean
 *                 default: false
 *               classId:
 *                 type: string
 *                 description: ID da turma (opcional)
 *     responses:
 *       201:
 *         description: Jogo criado com sucesso
 */
router.post('/games', authenticate, async (req, res) => {
  try {
    const { word, hint, category, maxWrongGuesses, turnBased, classId } = req.body;
    
    if (!word || word.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Palavra é obrigatória'
      });
    }
    
    // Validar palavra (apenas letras e espaços)
    const cleanWord = word.trim().toUpperCase();
    if (!/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+$/.test(cleanWord)) {
      return res.status(400).json({
        success: false,
        message: 'Palavra deve conter apenas letras e espaços'
      });
    }
    
    const game = new HangmanGame({
      teacher: req.user._id,
      word: cleanWord,
      hint: hint || '',
      category: category || 'Geral',
      maxWrongGuesses: maxWrongGuesses || 6,
      turnBased: turnBased || false,
      classId: classId || null,
      status: 'waiting'
    });
    
    await game.save();
    
    res.status(201).json({
      success: true,
      message: 'Jogo criado com sucesso',
      data: {
        gameId: game._id,
        gameState: game.getGameState()
      }
    });
  } catch (error) {
    console.error('Erro ao criar jogo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar jogo'
    });
  }
});

/**
 * @swagger
 * /api/hangman/games/{id}:
 *   delete:
 *     summary: Deletar jogo da forca
 *     tags: [Hangman]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do jogo
 *     responses:
 *       200:
 *         description: Jogo deletado com sucesso
 */
router.delete('/games/:id', authenticate, async (req, res) => {
  try {
    const game = await HangmanGame.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Jogo não encontrado'
      });
    }
    
    // Verificar se o usuário é o professor que criou o jogo
    if (game.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }
    
    await game.deleteOne();
    
    res.json({
      success: true,
      message: 'Jogo deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar jogo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar jogo'
    });
  }
});

/**
 * @swagger
 * /api/hangman/stats:
 *   get:
 *     summary: Obter estatísticas de jogos da forca
 *     tags: [Hangman]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas dos jogos
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const teacherId = req.user._id;
    
    const stats = await HangmanGame.aggregate([
      { $match: { teacher: teacherId } },
      {
        $group: {
          _id: null,
          totalGames: { $sum: 1 },
          gamesWon: {
            $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] }
          },
          gamesLost: {
            $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] }
          },
          totalPlayers: { $sum: { $size: '$players' } },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);
    
    const result = stats[0] || {
      totalGames: 0,
      gamesWon: 0,
      gamesLost: 0,
      totalPlayers: 0,
      avgDuration: 0
    };
    
    res.json({
      success: true,
      data: {
        totalGames: result.totalGames,
        gamesWon: result.gamesWon,
        gamesLost: result.gamesLost,
        winRate: result.totalGames > 0 
          ? ((result.gamesWon / result.totalGames) * 100).toFixed(1) 
          : 0,
        totalPlayers: result.totalPlayers,
        avgPlayersPerGame: result.totalGames > 0
          ? (result.totalPlayers / result.totalGames).toFixed(1)
          : 0,
        avgDuration: Math.round(result.avgDuration || 0)
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas'
    });
  }
});

export default router;
