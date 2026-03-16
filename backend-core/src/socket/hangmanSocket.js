import HangmanGame from '../models/HangmanGame.js';
import {
  authenticateSocket,
  validateGameAccess,
  checkRateLimit,
  cleanupRateLimit,
  sanitizeEventData,
  createSocketError,
  logSecurityEvent
} from './socketSecurity.js';

// Armazena jogos ativos e jogadores conectados
const activeGames = new Map();
const gamePlayers = new Map();

export const setupHangmanSocket = (io) => {
  const hangmanNamespace = io.of('/hangman');

  // Apply authentication to hangman namespace
  hangmanNamespace.use(authenticateSocket);

  hangmanNamespace.on('connection', (socket) => {
    const user = socket.data.user;

    // Double-check authentication
    if (!user) {
      logSecurityEvent('UNAUTHENTICATED_HANGMAN_CONNECTION', socket);
      socket.disconnect();
      return;
    }

    console.log(`🎮 Player connected to Hangman: ${socket.id} | ${user.name} (${user.role})`);
    
    // Criar novo jogo
    socket.on('create-game', async (data) => {
      try {
        const sanitizedData = sanitizeEventData(data);
        const { word, hint, category, maxWrongGuesses, turnBased } = sanitizedData;

        // Rate limiting
        if (!checkRateLimit(socket, 'event')) {
          socket.emit('error', createSocketError('RATE_LIMIT_EXCEEDED', 'Too many requests'));
          return;
        }

        // Authorization check
        if (user.role === 'student') {
          socket.emit('error', createSocketError('UNAUTHORIZED', 'Only teachers can create games'));
          logSecurityEvent('UNAUTHORIZED_GAME_CREATE', socket);
          return;
        }

        // Validation
        if (!word || typeof word !== 'string' || word.trim().length < 2 || word.trim().length > 50) {
          socket.emit('error', createSocketError('INVALID_WORD', 'Word must be 2-50 characters'));
          return;
        }

        const game = new HangmanGame({
          teacher: user.id,
          word: word.toUpperCase().trim(),
          hint: hint || '',
          category: category || 'Geral',
          maxWrongGuesses: maxWrongGuesses || 6,
          turnBased: turnBased || false,
          status: 'waiting'
        });

        // O professor tambem participa da partida, para poder jogar junto com o aluno.
        game.addPlayer(user.id, user.name, null);

        await game.save();

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
    
    // Entrar no jogo
    socket.on('join-game', async (data) => {
      try {
        const sanitizedData = sanitizeEventData(data);
        const { gameId, studentName, studentAvatar } = sanitizedData;

        // Rate limiting
        if (!checkRateLimit(socket, 'join')) {
          socket.emit('error', createSocketError('RATE_LIMIT_EXCEEDED', 'Too many join requests'));
          return;
        }

        // Authorization check
        if (user.role !== 'student') {
          socket.emit('error', createSocketError('UNAUTHORIZED', 'Only students can join games'));
          logSecurityEvent('UNAUTHORIZED_GAME_JOIN', socket, { gameId });
          return;
        }

        // Validation
        if (!gameId || !studentName) {
          socket.emit('error', createSocketError('MISSING_FIELDS', 'Game ID and student name required'));
          return;
        }

        let game = activeGames.get(gameId);

        if (!game) {
          game = await HangmanGame.findById(gameId);
          if (!game) {
            socket.emit('error', createSocketError('GAME_NOT_FOUND', 'Game does not exist'));
            return;
          }
          activeGames.set(gameId, game);
          gamePlayers.set(gameId, new Map());
        }

        // Validate tenant access
        const validation = await validateGameAccess(game, user);
        if (!validation.allowed) {
          socket.emit('error', createSocketError(validation.reason, 'Cannot join this game'));
          logSecurityEvent('UNAUTHORIZED_GAME_ACCESS', socket, { gameId, reason: validation.reason });
          return;
        }

        // Adicionar jogador ao jogo
        game.addPlayer(user.id, studentName, studentAvatar);
        await game.save();

        // Adicionar socket ao mapa de jogadores
        const players = gamePlayers.get(gameId);
        players.set(socket.id, {
          studentId: user.id,
          name: studentName,
          avatar: studentAvatar
        });

        socket.join(gameId);

        // Enviar estado do jogo para o jogador
        socket.emit('game-joined', {
          gameId,
          gameState: game.getGameState(),
          timestamp: new Date().toISOString()
        });

        // Notificar todos os jogadores sobre novo jogador
        hangmanNamespace.to(gameId).emit('player-joined', {
          player: {
            id: user.id,
            name: studentName,
            avatar: studentAvatar
          },
          players: game.players.map(p => ({
            id: p.studentId,
            name: p.name,
            avatar: p.avatar,
            score: p.score
          })),
          timestamp: new Date().toISOString()
        });

        console.log(`👤 ${studentName} joined game ${gameId}`);
      } catch (error) {
        console.error('Error joining game:', error);
        socket.emit('error', createSocketError('SERVER_ERROR', 'Failed to join game'));
      }
    });
    
    // Iniciar jogo
    socket.on('start-game', async (data) => {
      try {
        const sanitizedData = sanitizeEventData(data);
        const { gameId } = sanitizedData;

        // Rate limiting
        if (!checkRateLimit(socket, 'event')) {
          socket.emit('error', createSocketError('RATE_LIMIT_EXCEEDED', 'Too many requests'));
          return;
        }

        const game = activeGames.get(gameId);

        if (!game) {
          socket.emit('error', createSocketError('GAME_NOT_FOUND', 'Game does not exist'));
          return;
        }

        // Validate game ownership (only teacher can start)
        const validation = await validateGameAccess(game, user);
        if (!validation.allowed || user.role !== 'teacher') {
          socket.emit('error', createSocketError('UNAUTHORIZED', 'Only the game owner can start the game'));
          logSecurityEvent('UNAUTHORIZED_GAME_START', socket, { gameId });
          return;
        }

        game.startGame();
        await game.save();

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
    
    // Tentar letra
    socket.on('guess-letter', async (data) => {
      try {
        const sanitizedData = sanitizeEventData(data);
        const { gameId, letter } = sanitizedData;

        // Rate limiting (more lenient for game actions)
        if (!checkRateLimit(socket, 'event')) {
          socket.emit('error', createSocketError('RATE_LIMIT_EXCEEDED', 'Guessing too fast'));
          return;
        }

        // Validation
        if (!letter || typeof letter !== 'string' || letter.length !== 1) {
          socket.emit('error', createSocketError('INVALID_LETTER', 'Letter must be a single character'));
          return;
        }

        const game = activeGames.get(gameId);

        if (!game) {
          socket.emit('error', createSocketError('GAME_NOT_FOUND', 'Game does not exist'));
          return;
        }

        if (game.status !== 'active') {
          socket.emit('error', createSocketError('GAME_NOT_ACTIVE', 'Game is not active'));
          return;
        }

        // Validate game access
        const validation = await validateGameAccess(game, user);
        if (!validation.allowed) {
          socket.emit('error', createSocketError('UNAUTHORIZED', 'Cannot guess in this game'));
          logSecurityEvent('UNAUTHORIZED_GAME_GUESS', socket, { gameId });
          return;
        }

        // Verificar turno (se jogo for baseado em turnos)
        if (game.turnBased) {
          const currentPlayer = game.players[game.currentPlayerIndex];
          if (currentPlayer.studentId.toString() !== user.id.toString()) {
            socket.emit('error', createSocketError('NOT_YOUR_TURN', 'Wait for your turn'));
            return;
          }
        }

        // Processar tentativa
        const result = game.guessLetter(letter, user.id);
        if (!result.success) {
          socket.emit('error', createSocketError(
            result.alreadyGuessed ? 'LETTER_ALREADY_GUESSED' : 'INVALID_LETTER',
            result.message || 'Failed to process guess'
          ));
          return;
        }

        await game.save();

        // Avançar turno se for baseado em turnos
        if (game.turnBased && game.status === 'active') {
          game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
          await game.save();
        }

        // Emitir resultado para todos os jogadores
        hangmanNamespace.to(gameId).emit('letter-guessed', {
          letter: letter.toUpperCase(),
          correct: result.correct,
          wrongGuesses: result.wrongGuesses,
          revealedWord: result.revealedWord,
          status: result.status,
          gameState: game.getGameState(),
          player: {
            id: user.id,
            name: game.players.find(p => p.studentId.toString() === user.id.toString())?.name
          },
          timestamp: new Date().toISOString()
        });

        // Se jogo terminou
        if (result.status === 'won' || result.status === 'lost') {
          hangmanNamespace.to(gameId).emit('game-ended', {
            status: result.status,
            word: game.word,
            players: game.players.map(p => ({
              id: p.studentId,
              name: p.name,
              avatar: p.avatar,
              score: p.score
            })).sort((a, b) => b.score - a.score),
            duration: game.duration,
            timestamp: new Date().toISOString()
          });

          // Limpar jogo da memória após 5 minutos
          setTimeout(() => {
            activeGames.delete(gameId);
            gamePlayers.delete(gameId);
          }, 5 * 60 * 1000);
        }

        console.log(`[GAME] Letter guessed: ${letter} - Correct: ${result.correct} - Player: ${user.name}`);
      } catch (error) {
        console.error('Error guessing letter:', error);
        socket.emit('error', createSocketError('SERVER_ERROR', 'Failed to process guess'));
      }
    });

    // Tentar palavra completa
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

        const game = activeGames.get(gameId);

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

        const result = game.guessWord(word, user.id);

        if (!result.success) {
          socket.emit('error', createSocketError('INVALID_WORD', result.message));
          return;
        }

        await game.save();

        hangmanNamespace.to(gameId).emit('word-guessed', {
          word: word.toUpperCase(),
          correct: result.correct,
          wrongGuesses: result.wrongGuesses,
          revealedWord: result.revealedWord,
          status: result.status,
          gameState: game.getGameState(),
          player: {
            id: user.id,
            name: game.players.find(p => p.studentId.toString() === user.id.toString())?.name
          },
          timestamp: new Date().toISOString()
        });

        if (result.status === 'won' || result.status === 'lost') {
          hangmanNamespace.to(gameId).emit('game-ended', {
            status: result.status,
            word: game.word,
            players: game.players.map(p => ({
              id: p.studentId,
              name: p.name,
              avatar: p.avatar,
              score: p.score
            })).sort((a, b) => b.score - a.score),
            duration: game.duration,
            timestamp: new Date().toISOString()
          });

          setTimeout(() => {
            activeGames.delete(gameId);
            gamePlayers.delete(gameId);
          }, 5 * 60 * 1000);
        }

        console.log(`Word guessed: ${word} - Correct: ${result.correct} - Player: ${user.name}`);
      } catch (error) {
        console.error('Error guessing word:', error);
        socket.emit('error', createSocketError('SERVER_ERROR', 'Failed to process word guess'));
      }
    });

    // Desenhar no quadro branco
    socket.on('draw-whiteboard', (data) => {
      const sanitizedData = sanitizeEventData(data);
      const { gameId, drawData } = sanitizedData;

      // Rate limiting
      if (!checkRateLimit(socket, 'event')) {
        return;
      }

      if (!gameId || !drawData) {
        return;
      }

      socket.to(gameId).emit('whiteboard-update', drawData);
    });

    // Limpar quadro branco
    socket.on('clear-whiteboard', (data) => {
      const sanitizedData = sanitizeEventData(data);
      const { gameId } = sanitizedData;

      // Rate limiting
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

    // Enviar mensagem de chat
    socket.on('send-chat', async (data) => {
      try {
        const sanitizedData = sanitizeEventData(data);
        const { gameId, message } = sanitizedData;

        // Rate limiting for messages
        if (!checkRateLimit(socket, 'message')) {
          socket.emit('error', createSocketError('RATE_LIMIT_EXCEEDED', 'Sending messages too fast'));
          return;
        }

        // Validate message
        if (!message || typeof message !== 'string' || message.length > 500) {
          socket.emit('error', createSocketError('INVALID_MESSAGE', 'Message must be 1-500 characters'));
          return;
        }

        const players = gamePlayers.get(gameId);
        const player = players?.get(socket.id);

        if (player) {
          hangmanNamespace.to(gameId).emit('chat-message', {
            player: {
              id: user.id,
              name: player.name,
              avatar: player.avatar
            },
            message: message.trim(),
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error sending chat message:', error);
      }
    });
    
    // Sair do jogo
    socket.on('leave-game', (data) => {
      const sanitizedData = sanitizeEventData(data);
      const { gameId } = sanitizedData;

      if (gameId) {
        handlePlayerLeave(socket, gameId, hangmanNamespace);
      }
    });

    // Desconexão
    socket.on('disconnect', () => {
      // Remover jogador de todos os jogos
      for (const [gameId, players] of gamePlayers.entries()) {
        if (players.has(socket.id)) {
          handlePlayerLeave(socket, gameId, hangmanNamespace);
        }
      }
      // Cleanup rate limit tracking
      cleanupRateLimit(socket.id);
      console.log(`❌ Player disconnected: ${socket.id}`);
    });

    // Error handler
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
      remainingPlayers: Array.from(players.values()).map(p => ({
        id: p.studentId,
        name: p.name,
        avatar: p.avatar
      }))
    });
    
    // Se não há mais jogadores, limpar jogo
    if (players.size === 0) {
      activeGames.delete(gameId);
      gamePlayers.delete(gameId);
      console.log(`🗑️ Jogo ${gameId} removido (sem jogadores)`);
    }
  }
  
  socket.leave(gameId);
}
