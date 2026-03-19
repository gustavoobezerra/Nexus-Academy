import mongoose from 'mongoose';
import { tenantAwarePlugin } from '../middleware/tenantAware.js';

const normalizeHangmanText = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase();

const normalizeHangmanLetter = (value = '') => normalizeHangmanText(value).replace(/[^A-Z]/g, '');
const TURN_DURATION_OPTIONS = [15, 20, 25, 30, 35, 40];

const HangmanGameSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: false
  },
  
  // Configuração do jogo
  word: {
    type: String,
    required: true,
    uppercase: true
  },
  hint: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'Geral'
  },
  
  // Estado do jogo
  status: {
    type: String,
    enum: ['waiting', 'active', 'won', 'lost', 'finished'],
    default: 'waiting'
  },
  guessedLetters: [{
    type: String,
    uppercase: true
  }],
  wrongGuesses: {
    type: Number,
    default: 0
  },
  maxWrongGuesses: {
    type: Number,
    default: 6
  },
  
  // Jogadores
  players: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    name: String,
    avatar: String,
    score: {
      type: Number,
      default: 0
    },
    guesses: [{
      letter: String,
      correct: Boolean,
      timestamp: Date
    }]
  }],
  
  // Controle de turnos (para múltiplos jogadores)
  currentPlayerIndex: {
    type: Number,
    default: 0
  },
  turnBased: {
    type: Boolean,
    default: false
  },
  turnDurationSeconds: {
    type: Number,
    enum: TURN_DURATION_OPTIONS,
    default: 20
  },
  currentTurnStartedAt: Date,
  currentTurnExpiresAt: Date,
  roundNumber: {
    type: Number,
    default: 1
  },
  invitedStudents: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    name: String,
    email: String,
    status: {
      type: String,
      enum: ['pending', 'joined'],
      default: 'pending'
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    joinedAt: Date
  }],
  
  // Histórico
  gameHistory: [{
    action: String, // 'guess', 'win', 'lose', 'start', 'end'
    player: String,
    letter: String,
    correct: Boolean,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Metadados
  startedAt: Date,
  finishedAt: Date,
  duration: Number, // em segundos
  
  // Configurações de visualização
  theme: {
    type: String,
    enum: ['classic', 'modern', 'cartoon'],
    default: 'modern'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Aplicar plugin tenant-aware
HangmanGameSchema.plugin(tenantAwarePlugin);

// Método para verificar se a letra já foi tentada
HangmanGameSchema.methods.isLetterGuessed = function(letter) {
  const normalizedLetter = normalizeHangmanLetter(letter);
  if (!normalizedLetter) return false;

  return this.guessedLetters.some((guessedLetter) =>
    normalizeHangmanLetter(guessedLetter) === normalizedLetter
  );
};

/**
 * Retorna o jogador da vez sem expor detalhes internos do documento.
 */
HangmanGameSchema.methods.getCurrentPlayer = function() {
  if (!Array.isArray(this.players) || this.players.length === 0) {
    return null;
  }

  const safeIndex = this.currentPlayerIndex % this.players.length;
  return this.players[safeIndex] || null;
};

/**
 * Reinicia a janela de tempo do turno atual. O frontend so precisa ler
 * `currentTurnExpiresAt` para desenhar o countdown corretamente.
 */
HangmanGameSchema.methods.refreshTurnWindow = function(referenceDate = new Date()) {
  const baseDate = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  this.currentTurnStartedAt = baseDate;
  this.currentTurnExpiresAt = new Date(baseDate.getTime() + (this.turnDurationSeconds || 20) * 1000);
};

/**
 * Avanca a rodada. Em jogos com um unico aluno o indice continua no mesmo
 * jogador, mas a rodada e reiniciada para manter o timer consistente.
 */
HangmanGameSchema.methods.advanceTurn = function(reason = 'manual') {
  const previousPlayer = this.getCurrentPlayer();

  if (Array.isArray(this.players) && this.players.length > 0) {
    if (this.turnBased && this.players.length > 1) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      if (this.currentPlayerIndex === 0) {
        this.roundNumber += 1;
      }
    } else {
      this.currentPlayerIndex = 0;
      this.roundNumber += 1;
    }
  } else {
    this.currentPlayerIndex = 0;
  }

  this.refreshTurnWindow();
  const currentPlayer = this.getCurrentPlayer();

  this.gameHistory.push({
    action: 'turn-change',
    player: currentPlayer?.studentId?.toString() || previousPlayer?.studentId?.toString() || 'unknown',
    letter: reason,
    timestamp: new Date()
  });

  return {
    previousPlayer,
    currentPlayer,
    roundNumber: this.roundNumber
  };
};

/**
 * Aplica o comportamento de timeout da rodada:
 * - multiplos alunos em modo por turnos: passa para o proximo aluno
 * - um unico aluno ou modo livre: desenha mais uma parte da forca e reinicia o timer
 */
HangmanGameSchema.methods.handleTurnTimeout = function() {
  const timedOutPlayer = this.getCurrentPlayer();
  const shouldPenalize = !this.turnBased || this.players.length <= 1;

  this.gameHistory.push({
    action: 'timeout',
    player: timedOutPlayer?.studentId?.toString() || 'unknown',
    correct: false,
    timestamp: new Date()
  });

  if (shouldPenalize) {
    this.wrongGuesses += 1;

    if (this.wrongGuesses >= this.maxWrongGuesses) {
      this.status = 'lost';
      this.finishedAt = new Date();
      this.duration = this.startedAt
        ? Math.floor((this.finishedAt - this.startedAt) / 1000)
        : 0;

      this.gameHistory.push({
        action: 'lose',
        timestamp: new Date()
      });

      return {
        timedOutPlayer,
        penaltyApplied: true,
        status: this.status,
        wrongGuesses: this.wrongGuesses
      };
    }
  }

  const turnChange = this.advanceTurn('timeout');

  return {
    timedOutPlayer,
    currentPlayer: turnChange.currentPlayer,
    penaltyApplied: shouldPenalize,
    status: this.status,
    wrongGuesses: this.wrongGuesses,
    roundNumber: this.roundNumber
  };
};

// Método para processar tentativa de letra
HangmanGameSchema.methods.guessLetter = function(letter, playerId = null) {
  const upperLetter = normalizeHangmanLetter(letter);
  const normalizedWord = normalizeHangmanText(this.word);

  if (!upperLetter) {
    return {
      success: false,
      message: 'Letra inválida'
    };
  }
  
  // Verificar se letra já foi tentada
  if (this.isLetterGuessed(upperLetter)) {
    return {
      success: false,
      message: 'Letra já foi tentada',
      alreadyGuessed: true
    };
  }
  
  // Adicionar letra às tentativas
  this.guessedLetters.push(upperLetter);
  
  // Verificar se a letra está na palavra
  const isCorrect = normalizedWord.includes(upperLetter);
  
  if (!isCorrect) {
    this.wrongGuesses += 1;
  }
  
  // Atualizar pontuação do jogador
  if (playerId) {
    const player = this.players.find(p => p.studentId.toString() === playerId.toString());
    if (player) {
      player.guesses.push({
        letter: upperLetter,
        correct: isCorrect,
        timestamp: new Date()
      });
      
      if (isCorrect) {
        // Contar quantas vezes a letra aparece na palavra
        const occurrences = normalizedWord
          .split('')
          .filter((character) => character === upperLetter)
          .length;
        player.score += occurrences * 10;
      } else {
        player.score = Math.max(0, player.score - 5);
      }
    }
  }
  
  // Adicionar ao histórico
  this.gameHistory.push({
    action: 'guess',
    player: playerId ? playerId.toString() : 'unknown',
    letter: upperLetter,
    correct: isCorrect,
    timestamp: new Date()
  });
  
  // Verificar vitória
  const allLettersGuessed = this.word.split('').every((currentLetter) =>
    currentLetter === ' ' || this.isLetterGuessed(currentLetter)
  );
  
  if (allLettersGuessed) {
    this.status = 'won';
    this.finishedAt = new Date();
    this.duration = Math.floor((this.finishedAt - this.startedAt) / 1000);
    
    this.gameHistory.push({
      action: 'win',
      timestamp: new Date()
    });
  }
  
  // Verificar derrota
  if (this.wrongGuesses >= this.maxWrongGuesses) {
    this.status = 'lost';
    this.finishedAt = new Date();
    this.duration = Math.floor((this.finishedAt - this.startedAt) / 1000);
    
    this.gameHistory.push({
      action: 'lose',
      timestamp: new Date()
    });
  }
  
  return {
    success: true,
    correct: isCorrect,
    wrongGuesses: this.wrongGuesses,
    status: this.status,
    revealedWord: this.getRevealedWord()
  };
};

// Método para processar tentativa de palavra completa
HangmanGameSchema.methods.guessWord = function(word, playerId = null) {
  const normalized = normalizeHangmanText(word).trim();
  const normalizedTarget = normalizeHangmanText(this.word).trim();

  if (this.status !== 'active') {
    return { success: false, message: 'Jogo não está ativo' };
  }

  if (normalized.length !== normalizedTarget.length) {
    return { success: false, message: 'Palavra com tamanho incorreto' };
  }

  // Adicionar ao histórico
  this.gameHistory.push({
    action: 'word-guess',
    player: playerId ? playerId.toString() : 'unknown',
    letter: normalized,
    correct: normalized === normalizedTarget,
    timestamp: new Date()
  });

  if (normalized === normalizedTarget) {
    // Revelar todas as letras
    this.guessedLetters = [
      ...new Set([
        ...this.guessedLetters,
        ...normalizedTarget.replace(/\s/g, '').split('')
      ])
    ];
    this.status = 'won';
    this.finishedAt = new Date();
    this.duration = Math.floor((this.finishedAt - this.startedAt) / 1000);

    // Pontuar o jogador com bônus por adivinhar a palavra inteira
    if (playerId) {
      const player = this.players.find(p => p.studentId.toString() === playerId.toString());
      if (player) {
        player.score += 50;
      }
    }

    this.gameHistory.push({ action: 'win', timestamp: new Date() });

    return {
      success: true,
      correct: true,
      wrongGuesses: this.wrongGuesses,
      status: 'won',
      revealedWord: this.getRevealedWord()
    };
  } else {
    this.wrongGuesses += 1;

    // Penalizar o jogador
    if (playerId) {
      const player = this.players.find(p => p.studentId.toString() === playerId.toString());
      if (player) {
        player.score = Math.max(0, player.score - 10);
      }
    }

    if (this.wrongGuesses >= this.maxWrongGuesses) {
      this.status = 'lost';
      this.finishedAt = new Date();
      this.duration = Math.floor((this.finishedAt - this.startedAt) / 1000);
      this.gameHistory.push({ action: 'lose', timestamp: new Date() });
    }

    return {
      success: true,
      correct: false,
      wrongGuesses: this.wrongGuesses,
      status: this.status,
      revealedWord: this.getRevealedWord()
    };
  }
};

// Método para obter palavra com letras reveladas
HangmanGameSchema.methods.getRevealedWord = function() {
  return this.word.split('').map((letter) => {
    if (letter === ' ') return ' ';
    return this.isLetterGuessed(letter) ? letter : '_';
  }).join('');
};

// Método para iniciar o jogo
HangmanGameSchema.methods.startGame = function() {
  this.status = 'active';
  this.startedAt = new Date();
  this.currentPlayerIndex = 0;
  this.roundNumber = 1;
  this.refreshTurnWindow(this.startedAt);
  
  this.gameHistory.push({
    action: 'start',
    timestamp: new Date()
  });
};

// Método para adicionar jogador
HangmanGameSchema.methods.addPlayer = function(studentId, name, avatar) {
  const existingPlayer = this.players.find(p => 
    p.studentId.toString() === studentId.toString()
  );
  
  if (!existingPlayer) {
    this.players.push({
      studentId,
      name,
      avatar,
      score: 0,
      guesses: []
    });
  }
};

/**
 * Mantem a fila de convidados sincronizada com quem ja entrou no jogo.
 */
HangmanGameSchema.methods.markInvitedStudentJoined = function(studentId) {
  const invitedStudent = this.invitedStudents.find((item) =>
    item.studentId?.toString() === studentId.toString()
  );

  if (invitedStudent) {
    invitedStudent.status = 'joined';
    invitedStudent.joinedAt = new Date();
  }
};

// Método para obter estado do jogo (sem revelar a palavra)
HangmanGameSchema.methods.getGameState = function() {
  const currentPlayer = this.getCurrentPlayer();

  return {
    id: this._id,
    status: this.status,
    revealedWord: this.getRevealedWord(),
    hint: this.hint,
    category: this.category,
    guessedLetters: this.guessedLetters,
    wrongGuesses: this.wrongGuesses,
    maxWrongGuesses: this.maxWrongGuesses,
    players: this.players.map(p => ({
      id: p.studentId,
      name: p.name,
      avatar: p.avatar,
      score: p.score
    })),
    invitedStudents: this.invitedStudents.map((student) => ({
      id: student.studentId,
      name: student.name,
      email: student.email,
      status: student.status,
      invitedAt: student.invitedAt,
      joinedAt: student.joinedAt
    })),
    currentPlayerIndex: this.currentPlayerIndex,
    currentPlayer: currentPlayer ? {
      id: currentPlayer.studentId,
      name: currentPlayer.name,
      avatar: currentPlayer.avatar,
      score: currentPlayer.score
    } : null,
    turnBased: this.turnBased,
    turnDurationSeconds: this.turnDurationSeconds,
    currentTurnStartedAt: this.currentTurnStartedAt,
    currentTurnExpiresAt: this.currentTurnExpiresAt,
    roundNumber: this.roundNumber,
    theme: this.theme,
    startedAt: this.startedAt,
    duration: this.startedAt ? Math.floor((new Date() - this.startedAt) / 1000) : 0
  };
};

export default mongoose.model('HangmanGame', HangmanGameSchema);
