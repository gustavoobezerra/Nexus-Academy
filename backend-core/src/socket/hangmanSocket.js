import HangmanGame from '../models/HangmanGame.js';
import Student from '../models/Student.js';

// Armazena jogos ativos e jogadores conectados
const activeGames = new Map();
const gamePlayers = new Map();

export const setupHangmanSocket = (io) => {
  const hangmanNamespace = io.of('/hangman');
  
  hangmanNamespace.on('connection', (socket) => {
    console.log(`🎮 Jogador conectado ao Hangman: ${socket.id}`);
    
    // Criar novo jogo
    socket.on('create-game', async ({ teacherId, word, hint, category, maxWrongGuesses, turnBased }) => {
      try {
        const game = new HangmanGame({
          teacher: teacherId,
          word: word.toUpperCase().trim(),
          hint: hint || '',
          category: category || 'Geral',
          maxWrongGuesses: maxWrongGuesses || 6,
          turnBased: turnBased || false,
          status: 'waiting'
        });
        
        await game.save();
        
        const gameId = game._id.toString();
        activeGames.set(gameId, game);
        gamePlayers.set(gameId, new Map());
        
        socket.join(gameId);
        
        socket.emit('game-created', {
          gameId,
          gameState: game.getGameState()
        });
        
        console.log(`🎮 Jogo criado: ${gameId} - Palavra: ${word}`);
      } catch (error) {
        console.error('Erro ao criar jogo:', error);
        socket.emit('error', { message: 'Erro ao criar jogo' });
      }
    });
    
    // Entrar no jogo
    socket.on('join-game', async ({ gameId, studentId, studentName, studentAvatar }) => {
      try {
        let game = activeGames.get(gameId);
        
        if (!game) {
          game = await HangmanGame.findById(gameId);
          if (!game) {
            socket.emit('error', { message: 'Jogo não encontrado' });
            return;
          }
          activeGames.set(gameId, game);
          gamePlayers.set(gameId, new Map());
        }
        
        // Adicionar jogador ao jogo
        game.addPlayer(studentId, studentName, studentAvatar);
        await game.save();
        
        // Adicionar socket ao mapa de jogadores
        const players = gamePlayers.get(gameId);
        players.set(socket.id, {
          studentId,
          name: studentName,
          avatar: studentAvatar
        });
        
        socket.join(gameId);
        
        // Enviar estado do jogo para o jogador
        socket.emit('game-joined', {
          gameId,
          gameState: game.getGameState()
        });
        
        // Notificar todos os jogadores sobre novo jogador
        hangmanNamespace.to(gameId).emit('player-joined', {
          player: {
            id: studentId,
            name: studentName,
            avatar: studentAvatar
          },
          players: game.players.map(p => ({
            id: p.studentId,
            name: p.name,
            avatar: p.avatar,
            score: p.score
          }))
        });
        
        console.log(`👤 ${studentName} entrou no jogo ${gameId}`);
      } catch (error) {
        console.error('Erro ao entrar no jogo:', error);
        socket.emit('error', { message: 'Erro ao entrar no jogo' });
      }
    });
    
    // Iniciar jogo
    socket.on('start-game', async ({ gameId }) => {
      try {
        const game = activeGames.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Jogo não encontrado' });
          return;
        }
        
        game.startGame();
        await game.save();
        
        hangmanNamespace.to(gameId).emit('game-started', {
          gameState: game.getGameState()
        });
        
        console.log(`▶️ Jogo iniciado: ${gameId}`);
      } catch (error) {
        console.error('Erro ao iniciar jogo:', error);
        socket.emit('error', { message: 'Erro ao iniciar jogo' });
      }
    });
    
    // Tentar letra
    socket.on('guess-letter', async ({ gameId, letter, studentId }) => {
      try {
        const game = activeGames.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Jogo não encontrado' });
          return;
        }
        
        if (game.status !== 'active') {
          socket.emit('error', { message: 'Jogo não está ativo' });
          return;
        }
        
        // Verificar turno (se jogo for baseado em turnos)
        if (game.turnBased) {
          const currentPlayer = game.players[game.currentPlayerIndex];
          if (currentPlayer.studentId.toString() !== studentId.toString()) {
            socket.emit('error', { message: 'Não é seu turno' });
            return;
          }
        }
        
        // Processar tentativa
        const result = game.guessLetter(letter, studentId);
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
            id: studentId,
            name: game.players.find(p => p.studentId.toString() === studentId.toString())?.name
          }
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
            duration: game.duration
          });
          
          // Limpar jogo da memória após 5 minutos
          setTimeout(() => {
            activeGames.delete(gameId);
            gamePlayers.delete(gameId);
          }, 5 * 60 * 1000);
        }
        
        console.log(`🔤 Letra tentada: ${letter} - Correto: ${result.correct}`);
      } catch (error) {
        console.error('Erro ao tentar letra:', error);
        socket.emit('error', { message: 'Erro ao processar tentativa' });
      }
    });
    
    // Desenhar no quadro branco
    socket.on('draw-whiteboard', ({ gameId, drawData }) => {
      socket.to(gameId).emit('whiteboard-update', drawData);
    });
    
    // Limpar quadro branco
    socket.on('clear-whiteboard', ({ gameId }) => {
      hangmanNamespace.to(gameId).emit('whiteboard-cleared');
    });
    
    // Enviar mensagem de chat
    socket.on('send-chat', async ({ gameId, studentId, message }) => {
      try {
        const players = gamePlayers.get(gameId);
        const player = players?.get(socket.id);
        
        if (player) {
          hangmanNamespace.to(gameId).emit('chat-message', {
            player: {
              id: studentId,
              name: player.name,
              avatar: player.avatar
            },
            message,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
      }
    });
    
    // Sair do jogo
    socket.on('leave-game', ({ gameId }) => {
      handlePlayerLeave(socket, gameId, hangmanNamespace);
    });
    
    // Desconexão
    socket.on('disconnect', () => {
      // Remover jogador de todos os jogos
      for (const [gameId, players] of gamePlayers.entries()) {
        if (players.has(socket.id)) {
          handlePlayerLeave(socket, gameId, hangmanNamespace);
        }
      }
      console.log(`❌ Jogador desconectado: ${socket.id}`);
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
