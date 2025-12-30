import mongoose from 'mongoose';
import { tenantAwarePlugin } from '../middleware/tenantAware.js';

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
  return this.guessedLetters.includes(letter.toUpperCase());
};

// Método para processar tentativa de letra
HangmanGameSchema.methods.guessLetter = function(letter, playerId = null) {
  const upperLetter = letter.toUpperCase();
  
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
  const isCorrect = this.word.includes(upperLetter);
  
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
        const occurrences = (this.word.match(new RegExp(upperLetter, 'g')) || []).length;
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
  const allLettersGuessed = this.word.split('').every(letter => 
    this.guessedLetters.includes(letter) || letter === ' '
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

// Método para obter palavra com letras reveladas
HangmanGameSchema.methods.getRevealedWord = function() {
  return this.word.split('').map(letter => {
    if (letter === ' ') return ' ';
    return this.guessedLetters.includes(letter) ? letter : '_';
  }).join('');
};

// Método para iniciar o jogo
HangmanGameSchema.methods.startGame = function() {
  this.status = 'active';
  this.startedAt = new Date();
  
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

// Método para obter estado do jogo (sem revelar a palavra)
HangmanGameSchema.methods.getGameState = function() {
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
    currentPlayerIndex: this.currentPlayerIndex,
    turnBased: this.turnBased,
    theme: this.theme,
    startedAt: this.startedAt,
    duration: this.startedAt ? Math.floor((new Date() - this.startedAt) / 1000) : 0
  };
};

export default mongoose.model('HangmanGame', HangmanGameSchema);
