import HangmanGame from '../models/HangmanGame.js';
import Student from '../models/Student.js';
import { Notification } from '../models/Notification.js';
import {
  authenticateSocket,
  validateGameAccess,
  checkRateLimit,
  cleanupRateLimit,
  sanitizeEventData,
  createSocketError,
  logSecurityEvent
} from './socketSecurity.js';

const activeGames = new Map();
const gamePlayers = new Map();
const turnTimers = new Map();
const TURN_DURATION_OPTIONS = new Set([15, 20, 25, 30, 35, 40]);

const buildPlayerPayload = (player) => ({
  id: player.studentId?.toString?.() || player.id?.toString?.() || '',
  name: player.name,
  avatar: player.avatar || null,
  score: player.score || 0
});

const buildPlayersPayload = (game) =>
  game.players.map((player) => buildPlayerPayload(player)).sort((a, b) => b.score - a.score);

const clearTurnTimer = (gameId) => {
  const timer = turnTimers.get(gameId);
  if (timer) {
    clearTimeout(timer);
    turnTimers.delete(gameId);
  }
};

const clearGameCache = (gameId) => {
  clearTurnTimer(gameId);
  activeGames.delete(gameId);
  gamePlayers.delete(gameId);
};

const emitGameEnded = (namespace, gameId, game) => {
  clearTurnTimer(gameId);

  namespace.to(gameId).emit('game-ended', {
    status: game.status,
    word: game.word,
    players: buildPlayersPayload(game),
    duration: game.duration,
    timestamp: new Date().toISOString()
  });

  setTimeout(() => {
    clearGameCache(gameId);
  }, 5 * 60 * 1000);
};

const scheduleTurnTimer = (namespace, gameId) => {
  clearTurnTimer(gameId);

  const game = activeGames.get(gameId);
  if (!game || game.status !== 'active' || !game.currentTurnExpiresAt) {
    return;
  }

  const delay = Math.max(new Date(game.currentTurnExpiresAt).getTime() - Date.now(), 0);
  const timer = setTimeout(async () => {
    try {
      let freshGame = activeGames.get(gameId);

      if (!freshGame) {
        freshGame = await HangmanGame.findById(gameId);
      }

      if (!freshGame || freshGame.status !== 'active') {
        clearTurnTimer(gameId);
        return;
      }

      const expiresAt = freshGame.currentTurnExpiresAt
        ? new Date(freshGame.currentTurnExpiresAt).getTime()
        : 0;

      if (expiresAt > Date.now() + 250) {
        activeGames.set(gameId, freshGame);
        scheduleTurnTimer(namespace, gameId);
        return;
      }

      const timeoutResult = freshGame.handleTurnTimeout();
      await freshGame.save();
      activeGames.set(gameId, freshGame);

      namespace.to(gameId).emit('turn-expired', {
        gameState: freshGame.getGameState(),
        timedOutPlayer: timeoutResult.timedOutPlayer
          ? buildPlayerPayload(timeoutResult.timedOutPlayer)
          : null,
        penaltyApplied: timeoutResult.penaltyApplied,
        wrongGuesses: freshGame.wrongGuesses,
        timestamp: new Date().toISOString()
      });

      if (freshGame.status === 'lost') {
        emitGameEnded(namespace, gameId, freshGame);
        return;
      }

      namespace.to(gameId).emit('turn-changed', {
        reason: 'timeout',
        gameState: freshGame.getGameState(),
        currentPlayer: freshGame.getCurrentPlayer()
          ? buildPlayerPayload(freshGame.getCurrentPlayer())
          : null,
        roundNumber: freshGame.roundNumber,
        timestamp: new Date().toISOString()
      });

      scheduleTurnTimer(namespace, gameId);
    } catch (error) {
      console.error('Error processing hangman timeout:', error);
      clearTurnTimer(gameId);
    }
  }, delay + 100);

  turnTimers.set(gameId, timer);
};

const sendHangmanInvites = async (game, teacherUser) => {
  if (!Array.isArray(game.invitedStudents) || game.invitedStudents.length === 0) {
    return;
  }

  await Promise.all(
    game.invitedStudents.map((student) =>
      Notification.create({
        teacher: game.teacher,
        recipientType: 'student',
        recipientId: student.studentId,
        recipientName: student.name,
        recipientContact: student.email || '',
        channel: 'in_app',
        subject: 'Convite para o jogo da forca',
        body: `${teacherUser.name} convidou voce para jogar uma rodada de Forca.`,
        status: 'delivered',
        entityType: 'system',
        entityId: game._id,
        providerResponse: {
          type: 'hangman_invite',
          route: `/portal/hangman?gameId=${game._id.toString()}`,
          gameId: game._id.toString(),
          category: game.category,
          hint: game.hint,
          invitedBy: teacherUser.name,
          turnDurationSeconds: game.turnDurationSeconds
        }
      })
    )
  );
};

const loadGame = async (gameId) => {
  let game = activeGames.get(gameId);

  if (!game) {
    game = await HangmanGame.findById(gameId);
    if (game) {
      activeGames.set(gameId, game);
      if (!gamePlayers.has(gameId)) {
        gamePlayers.set(gameId, new Map());
      }
    }
  }

  return game;
};

const handlePostGuessState = async (namespace, gameId, game, reason = 'guess') => {
  if (game.status !== 'active') {
    emitGameEnded(namespace, gameId, game);
    return;
  }

  if (game.turnBased) {
    const turnChange = game.advanceTurn(reason);
    await game.save();
    activeGames.set(gameId, game);

    namespace.to(gameId).emit('turn-changed', {
      reason,
      gameState: game.getGameState(),
      currentPlayer: turnChange.currentPlayer ? buildPlayerPayload(turnChange.currentPlayer) : null,
      roundNumber: game.roundNumber,
      timestamp: new Date().toISOString()
    });
  } else {
    game.refreshTurnWindow();
    await game.save();
    activeGames.set(gameId, game);
  }

  scheduleTurnTimer(namespace, gameId);
};

export const setupHangmanSocket = (io) => {
  const hangmanNamespace = io.of('/hangman');

  hangmanNamespace.use(authenticateSocket);

  hangmanNamespace.on('connection', (socket) => {
    const user = socket.data.user;

    if (!user) {
      logSecurityEvent('UNAUTHENTICATED_HANGMAN_CONNECTION', socket);
      socket.disconnect();
      return;
    }

    console.log(`🎮 Player connected to Hangman: ${socket.id} | ${user.name} (${user.role})`);

    socket.on('create-game', async (data) => {
      try {
        const sanitizedData = sanitizeEventData(data);
        const {
          word,
          hint,
          category,
          maxWrongGuesses,
          turnBased,
          turnDurationSeconds,
          invitedStudentIds = []
        } = sanitizedData;

        if (!checkRateLimit(socket, 'event')) {
          socket.emit('error', createSocketError('RATE_LIMIT_EXCEEDED', 'Too many requests'));
          return;
        }

        if (user.role === 'student') {
          socket.emit('error', createSocketError('UNAUTHORIZED', 'Only teachers can create games'));
          logSecurityEvent('UNAUTHORIZED_GAME_CREATE', socket);
          return;
        }

        if (!word || typeof word !== 'string' || word.trim().length < 2 || word.trim().length > 50) {
          socket.emit('error', createSocketError('INVALID_WORD', 'Word must be 2-50 characters'));
          return;
        }

        const normalizedDuration = TURN_DURATION_OPTIONS.has(Number(turnDurationSeconds))
          ? Number(turnDurationSeconds)
          : 20;

        const uniqueInvitedIds = Array.isArray(invitedStudentIds)
          ? [...new Set(invitedStudentIds.filter((id) => typeof id === 'string'))]
          : [];

        const invitedStudents = uniqueInvitedIds.length > 0
          ? await Student.find({
            _id: { $in: uniqueInvitedIds },
            teacher: user.id,
            active: true
          }).select('_id name email portalAccess')
          : [];

        const game = new HangmanGame({
          teacher: user.id,
          word: word.toUpperCase().trim(),
          hint: hint || '',
          category: category || 'Geral',
          maxWrongGuesses: maxWrongGuesses || 6,
          turnBased: Boolean(turnBased),
          turnDurationSeconds: normalizedDuration,
          invitedStudents: invitedStudents.map((student) => ({
            studentId: student._id,
            name: student.name,
            email: student.portalAccess?.email || student.email || '',
            status: 'pending'
          })),
          status: 'waiting'
        });

        await game.save();
        await sendHangmanInvites(game, user);

        const gameId = game._id.toString();
        activeGames.set(gameId, game);
        gamePlayers.set(gameId, new Map());

        socket.join(gameId);

        socket.emit('game-created', {
          gameId,
          gameState: game.getGameState(),
          timestamp: new Date().toISOString()
        });

        console.log(`🎮 Game created: ${gameId} - Word: ${word} - Teacher: ${user.name}`);
      } catch (error) {
        console.error('Error creating game:', error);
        socket.emit('error', createSocketError('SERVER_ERROR', 'Failed to create game'));
      }
    });

    socket.on('join-game', async (data) => {
      try {
        const sanitizedData = sanitizeEventData(data);
        const { gameId, studentName, studentAvatar } = sanitizedData;

        if (!checkRateLimit(socket, 'join')) {
          socket.emit('error', createSocketError('RATE_LIMIT_EXCEEDED', 'Too many join requests'));
          return;
        }

        if (user.role !== 'student') {
          socket.emit('error', createSocketError('UNAUTHORIZED', 'Only students can join games'));
          logSecurityEvent('UNAUTHORIZED_GAME_JOIN', socket, { gameId });
          return;
        }

        if (!gameId || !studentName) {
          socket.emit('error', createSocketError('MISSING_FIELDS', 'Game ID and student name required'));
          return;
        }

        const game = await loadGame(gameId);

        if (!game) {
          socket.emit('error', createSocketError('GAME_NOT_FOUND', 'Game does not exist'));
          return;
        }

        const validation = await validateGameAccess(game, user);
        if (!validation.allowed) {
          socket.emit('error', createSocketError(validation.reason, 'Cannot join this game'));
          logSecurityEvent('UNAUTHORIZED_GAME_ACCESS', socket, { gameId, reason: validation.reason });
          return;
        }

        if (
          Array.isArray(game.invitedStudents) &&
          game.invitedStudents.length > 0 &&
          !game.invitedStudents.some((student) => student.studentId?.toString() === user.id.toString())
        ) {
          socket.emit('error', createSocketError('INVITE_REQUIRED', 'Only invited students can join this game'));
          return;
        }

        game.addPlayer(user.id, studentName, studentAvatar);
        game.markInvitedStudentJoined(user.id);
        await game.save();
        activeGames.set(gameId, game);

        const connectedPlayers = gamePlayers.get(gameId) || new Map();
        connectedPlayers.set(socket.id, {
          studentId: user.id,
          name: studentName,
          avatar: studentAvatar
        });
        gamePlayers.set(gameId, connectedPlayers);

        socket.join(gameId);

        await Notification.updateMany(
          {
            teacher: game.teacher,
            recipientId: user.id,
            channel: 'in_app',
            entityId: game._id,
            status: { $in: ['pending', 'sent', 'delivered'] }
          },
          {
            status: 'read',
            readAt: new Date()
          }
        );

        socket.emit('game-joined', {
          gameId,
          gameState: game.getGameState(),
          timestamp: new Date().toISOString()
        });

        hangmanNamespace.to(gameId).emit('player-joined', {
          player: {
            id: user.id,
            name: studentName,
            avatar: studentAvatar
          },
          players: buildPlayersPayload(game),
          invitedStudents: game.getGameState().invitedStudents,
          timestamp: new Date().toISOString()
        });

        console.log(`👤 ${studentName} joined game ${gameId}`);
      } catch (error) {
        console.error('Error joining game:', error);
        socket.emit('error', createSocketError('SERVER_ERROR', 'Failed to join game'));
      }
    });

    socket.on('start-game', async (data) => {
      try {
        const sanitizedData = sanitizeEventData(data);
        const { gameId } = sanitizedData;

        if (!checkRateLimit(socket, 'event')) {
          socket.emit('error', createSocketError('RATE_LIMIT_EXCEEDED', 'Too many requests'));
          return;
        }

        const game = await loadGame(gameId);

        if (!game) {
          socket.emit('error', createSocketError('GAME_NOT_FOUND', 'Game does not exist'));
          return;
        }

        const validation = await validateGameAccess(game, user);
        if (!validation.allowed || user.role !== 'teacher') {
          socket.emit('error', createSocketError('UNAUTHORIZED', 'Only the game owner can start the game'));
          logSecurityEvent('UNAUTHORIZED_GAME_START', socket, { gameId });
          return;
        }

        if (!Array.isArray(game.players) || game.players.length === 0) {
          socket.emit('error', createSocketError('NO_PLAYERS', 'Invite or connect at least one student before starting'));
          return;
        }

        game.startGame();
        await game.save();
        activeGames.set(gameId, game);
        scheduleTurnTimer(hangmanNamespace, gameId);

        hangmanNamespace.to(gameId).emit('game-started', {
          gameState: game.getGameState(),
          timestamp: new Date().toISOString()
        });

        console.log(`[GAME] Game started: ${gameId} by ${user.name}`);
      } catch (error) {
        console.error('Error starting game:', error);
        socket.emit('error', createSocketError('SERVER_ERROR', 'Failed to start game'));
      }
    });

    socket.on('guess-letter', async (data) => {
      try {
        const sanitizedData = sanitizeEventData(data);
        const { gameId, letter } = sanitizedData;

        if (!checkRateLimit(socket, 'event')) {
          socket.emit('error', createSocketError('RATE_LIMIT_EXCEEDED', 'Guessing too fast'));
          return;
        }

        if (!letter || typeof letter !== 'string' || letter.length !== 1) {
          socket.emit('error', createSocketError('INVALID_LETTER', 'Letter must be a single character'));
          return;
        }

        const game = await loadGame(gameId);

        if (!game) {
          socket.emit('error', createSocketError('GAME_NOT_FOUND', 'Game does not exist'));
          return;
        }

        if (game.status !== 'active') {
          socket.emit('error', createSocketError('GAME_NOT_ACTIVE', 'Game is not active'));
          return;
        }

        const validation = await validateGameAccess(game, user);
        if (!validation.allowed) {
          socket.emit('error', createSocketError('UNAUTHORIZED', 'Cannot guess in this game'));
          logSecurityEvent('UNAUTHORIZED_GAME_GUESS', socket, { gameId });
          return;
        }

        if (game.turnBased && game.players.length > 0) {
          const currentPlayer = game.getCurrentPlayer();
          if (currentPlayer?.studentId.toString() !== user.id.toString()) {
            socket.emit('error', createSocketError('NOT_YOUR_TURN', 'Wait for your turn'));
            return;
          }
        }

        const result = game.guessLetter(letter, user.id);
        if (!result.success) {
          socket.emit('error', createSocketError(
            result.alreadyGuessed ? 'LETTER_ALREADY_GUESSED' : 'INVALID_LETTER',
            result.message || 'Failed to process guess'
          ));
          return;
        }

        await game.save();
        activeGames.set(gameId, game);

        hangmanNamespace.to(gameId).emit('letter-guessed', {
          letter: letter.toUpperCase(),
          correct: result.correct,
          wrongGuesses: result.wrongGuesses,
          revealedWord: result.revealedWord,
          status: result.status,
          gameState: game.getGameState(),
          player: {
            id: user.id,
            name: game.players.find((player) => player.studentId.toString() === user.id.toString())?.name
          },
          timestamp: new Date().toISOString()
        });

        if (result.status === 'won' || result.status === 'lost') {
          emitGameEnded(hangmanNamespace, gameId, game);
          return;
        }

        await handlePostGuessState(hangmanNamespace, gameId, game, 'letter');

        console.log(`[GAME] Letter guessed: ${letter} - Correct: ${result.correct} - Player: ${user.name}`);
      } catch (error) {
        console.error('Error guessing letter:', error);
        socket.emit('error', createSocketError('SERVER_ERROR', 'Failed to process guess'));
      }
    });

    socket.on('guess-word', async (data) => {
      try {
        const sanitizedData = sanitizeEventData(data);
        const { gameId, word } = sanitizedData;

        if (!checkRateLimit(socket, 'event')) {
          socket.emit('error', createSocketError('RATE_LIMIT_EXCEEDED', 'Guessing too fast'));
          return;
        }

        if (!word || typeof word !== 'string' || word.trim().length === 0) {
          socket.emit('error', createSocketError('INVALID_WORD', 'Word must be a non-empty string'));
          return;
        }

        const game = await loadGame(gameId);

        if (!game) {
          socket.emit('error', createSocketError('GAME_NOT_FOUND', 'Game does not exist'));
          return;
        }

        if (game.status !== 'active') {
          socket.emit('error', createSocketError('GAME_NOT_ACTIVE', 'Game is not active'));
          return;
        }

        const validation = await validateGameAccess(game, user);
        if (!validation.allowed) {
          socket.emit('error', createSocketError('UNAUTHORIZED', 'Cannot guess in this game'));
          logSecurityEvent('UNAUTHORIZED_GAME_GUESS', socket, { gameId });
          return;
        }

        if (game.turnBased && game.players.length > 0) {
          const currentPlayer = game.getCurrentPlayer();
          if (currentPlayer?.studentId.toString() !== user.id.toString()) {
            socket.emit('error', createSocketError('NOT_YOUR_TURN', 'Wait for your turn'));
            return;
          }
        }

        const result = game.guessWord(word, user.id);

        if (!result.success) {
          socket.emit('error', createSocketError('INVALID_WORD', result.message));
          return;
        }

        await game.save();
        activeGames.set(gameId, game);

        hangmanNamespace.to(gameId).emit('word-guessed', {
          word: word.toUpperCase(),
          correct: result.correct,
          wrongGuesses: result.wrongGuesses,
          revealedWord: result.revealedWord,
          status: result.status,
          gameState: game.getGameState(),
          player: {
            id: user.id,
            name: game.players.find((player) => player.studentId.toString() === user.id.toString())?.name
          },
          timestamp: new Date().toISOString()
        });

        if (result.status === 'won' || result.status === 'lost') {
          emitGameEnded(hangmanNamespace, gameId, game);
          return;
        }

        await handlePostGuessState(hangmanNamespace, gameId, game, 'word');

        console.log(`Word guessed: ${word} - Correct: ${result.correct} - Player: ${user.name}`);
      } catch (error) {
        console.error('Error guessing word:', error);
        socket.emit('error', createSocketError('SERVER_ERROR', 'Failed to process word guess'));
      }
    });

    socket.on('draw-whiteboard', (data) => {
      const sanitizedData = sanitizeEventData(data);
      const { gameId, drawData } = sanitizedData;

      if (!checkRateLimit(socket, 'event')) {
        return;
      }

      if (!gameId || !drawData) {
        return;
      }

      socket.to(gameId).emit('whiteboard-update', drawData);
    });

    socket.on('clear-whiteboard', (data) => {
      const sanitizedData = sanitizeEventData(data);
      const { gameId } = sanitizedData;

      if (!checkRateLimit(socket, 'event')) {
        return;
      }

      if (!gameId) {
        return;
      }

      hangmanNamespace.to(gameId).emit('whiteboard-cleared', {
        timestamp: new Date().toISOString()
      });
    });

    socket.on('send-chat', async (data) => {
      try {
        const sanitizedData = sanitizeEventData(data);
        const { gameId, message } = sanitizedData;

        if (!checkRateLimit(socket, 'message')) {
          socket.emit('error', createSocketError('RATE_LIMIT_EXCEEDED', 'Sending messages too fast'));
          return;
        }

        if (!message || typeof message !== 'string' || message.length > 500) {
          socket.emit('error', createSocketError('INVALID_MESSAGE', 'Message must be 1-500 characters'));
          return;
        }

        const players = gamePlayers.get(gameId);
        const player = players?.get(socket.id);

        hangmanNamespace.to(gameId).emit('chat-message', {
          player: {
            id: user.id,
            name: player?.name || user.name,
            avatar: player?.avatar || null
          },
          message: message.trim(),
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error sending chat message:', error);
      }
    });

    socket.on('leave-game', (data) => {
      const sanitizedData = sanitizeEventData(data);
      const { gameId } = sanitizedData;

      if (gameId) {
        handlePlayerLeave(socket, gameId, hangmanNamespace);
      }
    });

    socket.on('disconnect', () => {
      for (const [gameId, players] of gamePlayers.entries()) {
        if (players.has(socket.id)) {
          handlePlayerLeave(socket, gameId, hangmanNamespace);
        }
      }

      cleanupRateLimit(socket.id);
      console.log(`❌ Player disconnected: ${socket.id}`);
    });

    socket.on('error', (error) => {
      console.error(`Hangman socket error for ${socket.id}:`, error);
      logSecurityEvent('HANGMAN_SOCKET_ERROR', socket, { error: error.message });
    });
  });
};

function handlePlayerLeave(socket, gameId, namespace) {
  const players = gamePlayers.get(gameId);

  if (players && players.has(socket.id)) {
    const player = players.get(socket.id);
    players.delete(socket.id);

    namespace.to(gameId).emit('player-left', {
      player: {
        id: player.studentId,
        name: player.name
      },
      remainingPlayers: Array.from(players.values()).map((currentPlayer) => ({
        id: currentPlayer.studentId,
        name: currentPlayer.name,
        avatar: currentPlayer.avatar
      }))
    });
  }

  socket.leave(gameId);
}
