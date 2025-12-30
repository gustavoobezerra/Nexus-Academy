import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { 
  Users, Trophy, Clock, MessageCircle, Eraser, 
  Play, X, Check, AlertCircle 
} from 'lucide-react';

interface Player {
  id: string;
  name: string;
  avatar?: string;
  score: number;
}

interface GameState {
  id: string;
  status: 'waiting' | 'active' | 'won' | 'lost';
  revealedWord: string;
  hint: string;
  category: string;
  guessedLetters: string[];
  wrongGuesses: number;
  maxWrongGuesses: number;
  players: Player[];
  currentPlayerIndex: number;
  turnBased: boolean;
  theme: string;
  startedAt?: Date;
  duration: number;
}

interface HangmanGameProps {
  gameId?: string;
  isTeacher: boolean;
  userId: string;
  userName: string;
  userAvatar?: string;
  onClose?: () => void;
}

const HangmanGame: React.FC<HangmanGameProps> = ({
  gameId: initialGameId,
  isTeacher,
  userId,
  userName,
  userAvatar,
  onClose
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameId, setGameId] = useState<string | null>(initialGameId || null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  
  // Whiteboard state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  
  // Create game form (teacher only)
  const [createForm, setCreateForm] = useState({
    word: '',
    hint: '',
    category: 'Inglês',
    maxWrongGuesses: 6,
    turnBased: false
  });
  
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  // Conectar ao Socket.IO
  useEffect(() => {
    const socketInstance = io(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/hangman`, {
      transports: ['websocket', 'polling']
    });
    
    setSocket(socketInstance);
    
    socketInstance.on('connect', () => {
      console.log('Conectado ao servidor Hangman');
      
      // Se já tem gameId, entrar no jogo
      if (initialGameId) {
        socketInstance.emit('join-game', {
          gameId: initialGameId,
          studentId: userId,
          studentName: userName,
          studentAvatar: userAvatar
        });
      }
    });
    
    socketInstance.on('game-created', ({ gameId: newGameId, gameState: state }) => {
      setGameId(newGameId);
      setGameState(state);
    });
    
    socketInstance.on('game-joined', ({ gameId: joinedGameId, gameState: state }) => {
      setGameId(joinedGameId);
      setGameState(state);
    });
    
    socketInstance.on('player-joined', ({ player, players }) => {
      setGameState(prev => prev ? { ...prev, players } : null);
      setChatMessages(prev => [...prev, {
        type: 'system',
        message: `${player.name} entrou no jogo`,
        timestamp: new Date()
      }]);
    });
    
    socketInstance.on('game-started', ({ gameState: state }) => {
      setGameState(state);
      setChatMessages(prev => [...prev, {
        type: 'system',
        message: 'Jogo iniciado! Boa sorte!',
        timestamp: new Date()
      }]);
    });
    
    socketInstance.on('letter-guessed', ({ letter, correct, wrongGuesses, revealedWord, status, gameState: state, player }) => {
      setGameState(state);
      setSelectedLetter(null);
      
      const message = correct
        ? `${player.name} acertou a letra ${letter}! 🎉`
        : `${player.name} errou... A letra ${letter} não está na palavra ❌`;
      
      setChatMessages(prev => [...prev, {
        type: correct ? 'success' : 'error',
        message,
        timestamp: new Date()
      }]);
    });
    
    socketInstance.on('game-ended', ({ status, word, players }) => {
      const message = status === 'won'
        ? `🎉 Parabéns! A palavra era: ${word}`
        : `😢 Que pena! A palavra era: ${word}`;
      
      setChatMessages(prev => [...prev, {
        type: 'system',
        message,
        timestamp: new Date()
      }]);
    });
    
    socketInstance.on('player-left', ({ player }) => {
      setChatMessages(prev => [...prev, {
        type: 'system',
        message: `${player.name} saiu do jogo`,
        timestamp: new Date()
      }]);
    });
    
    socketInstance.on('chat-message', ({ player, message, timestamp }) => {
      setChatMessages(prev => [...prev, {
        type: 'chat',
        player,
        message,
        timestamp: new Date(timestamp)
      }]);
    });
    
    socketInstance.on('whiteboard-update', (drawData) => {
      drawOnCanvas(drawData, false);
    });
    
    socketInstance.on('whiteboard-cleared', () => {
      clearCanvas();
    });
    
    socketInstance.on('error', ({ message }) => {
      alert(message);
    });
    
    return () => {
      socketInstance.disconnect();
    };
  }, [initialGameId, userId, userName, userAvatar]);
  
  // Criar jogo (professor)
  const handleCreateGame = () => {
    if (!socket || !createForm.word.trim()) {
      alert('Digite uma palavra válida');
      return;
    }
    
    socket.emit('create-game', {
      teacherId: userId,
      word: createForm.word.trim(),
      hint: createForm.hint.trim(),
      category: createForm.category,
      maxWrongGuesses: createForm.maxWrongGuesses,
      turnBased: createForm.turnBased
    });
  };
  
  // Iniciar jogo (professor)
  const handleStartGame = () => {
    if (!socket || !gameId) return;
    socket.emit('start-game', { gameId });
  };
  
  // Tentar letra
  const handleGuessLetter = (letter: string) => {
    if (!socket || !gameId || !gameState || gameState.status !== 'active') return;
    
    if (gameState.guessedLetters.includes(letter)) {
      alert('Essa letra já foi tentada!');
      return;
    }
    
    setSelectedLetter(letter);
    socket.emit('guess-letter', {
      gameId,
      letter,
      studentId: userId
    });
  };
  
  // Enviar mensagem de chat
  const handleSendChat = () => {
    if (!socket || !gameId || !chatInput.trim()) return;
    
    socket.emit('send-chat', {
      gameId,
      studentId: userId,
      message: chatInput.trim()
    });
    
    setChatInput('');
  };
  
  // Whiteboard drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showWhiteboard) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !showWhiteboard) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    // Emitir para outros jogadores
    if (socket && gameId) {
      socket.emit('draw-whiteboard', {
        gameId,
        drawData: { x, y, color: drawColor, lineWidth, isDrawing: true }
      });
    }
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
  };
  
  const drawOnCanvas = (drawData: any, emit = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (ctx && drawData.isDrawing) {
      ctx.strokeStyle = drawData.color;
      ctx.lineWidth = drawData.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineTo(drawData.x, drawData.y);
      ctx.stroke();
    }
  };
  
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  
  const handleClearWhiteboard = () => {
    clearCanvas();
    if (socket && gameId) {
      socket.emit('clear-whiteboard', { gameId });
    }
  };
  
  // Renderizar boneco da forca
  const renderHangman = () => {
    const parts = [
      // Cabeça
      <motion.circle
        key="head"
        cx="200"
        cy="80"
        r="20"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      />,
      // Corpo
      <motion.line
        key="body"
        x1="200"
        y1="100"
        x2="200"
        y2="150"
        stroke="currentColor"
        strokeWidth="3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      />,
      // Braço esquerdo
      <motion.line
        key="left-arm"
        x1="200"
        y1="120"
        x2="170"
        y2="140"
        stroke="currentColor"
        strokeWidth="3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      />,
      // Braço direito
      <motion.line
        key="right-arm"
        x1="200"
        y1="120"
        x2="230"
        y2="140"
        stroke="currentColor"
        strokeWidth="3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      />,
      // Perna esquerda
      <motion.line
        key="left-leg"
        x1="200"
        y1="150"
        x2="180"
        y2="190"
        stroke="currentColor"
        strokeWidth="3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      />,
      // Perna direita
      <motion.line
        key="right-leg"
        x1="200"
        y1="150"
        x2="220"
        y2="190"
        stroke="currentColor"
        strokeWidth="3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      />
    ];
    
    const wrongGuesses = gameState?.wrongGuesses || 0;
    return parts.slice(0, wrongGuesses);
  };
  
  // Tela de criação de jogo (professor)
  if (isTeacher && !gameId) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Criar Jogo da Forca</h2>
            {onClose && (
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Palavra *</label>
              <input
                type="text"
                value={createForm.word}
                onChange={(e) => setCreateForm({ ...createForm, word: e.target.value.toUpperCase() })}
                placeholder="Digite a palavra"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                maxLength={20}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2">Dica</label>
              <input
                type="text"
                value={createForm.hint}
                onChange={(e) => setCreateForm({ ...createForm, hint: e.target.value })}
                placeholder="Dica para os alunos"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2">Categoria</label>
              <select
                value={createForm.category}
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option>Inglês</option>
                <option>Português</option>
                <option>Matemática</option>
                <option>Ciências</option>
                <option>História</option>
                <option>Geografia</option>
                <option>Geral</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2">Tentativas Máximas</label>
              <input
                type="number"
                value={createForm.maxWrongGuesses}
                onChange={(e) => setCreateForm({ ...createForm, maxWrongGuesses: parseInt(e.target.value) })}
                min={3}
                max={10}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="turnBased"
                checked={createForm.turnBased}
                onChange={(e) => setCreateForm({ ...createForm, turnBased: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="turnBased" className="text-sm">Baseado em turnos</label>
            </div>
            
            <button
              onClick={handleCreateGame}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Criar Jogo
            </button>
          </div>
        </motion.div>
      </div>
    );
  }
  
  // Tela principal do jogo
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col z-50">
      {/* Header */}
      <div className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">🎮 Jogo da Forca</h1>
          {gameState && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              {gameState.category}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {gameState && (
            <>
              <div className="flex items-center gap-2 text-gray-600">
                <Users size={20} />
                <span>{gameState.players.length}</span>
              </div>
              
              {gameState.startedAt && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={20} />
                  <span>{Math.floor(gameState.duration / 60)}:{(gameState.duration % 60).toString().padStart(2, '0')}</span>
                </div>
              )}
            </>
          )}
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
            >
              <X size={24} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Área principal do jogo */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {gameState && gameState.status === 'waiting' && isTeacher && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartGame}
              className="mb-8 bg-green-600 text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-2 shadow-lg"
            >
              <Play size={24} />
              Iniciar Jogo
            </motion.button>
          )}
          
          {gameState && gameState.status === 'waiting' && !isTeacher && (
            <div className="mb-8 text-center">
              <p className="text-xl text-gray-600">Aguardando o professor iniciar o jogo...</p>
            </div>
          )}
          
          {/* Forca */}
          <div className="mb-8">
            <svg width="300" height="250" className="text-gray-800">
              {/* Base */}
              <line x1="20" y1="230" x2="150" y2="230" stroke="currentColor" strokeWidth="4" />
              {/* Poste vertical */}
              <line x1="50" y1="230" x2="50" y2="20" stroke="currentColor" strokeWidth="4" />
              {/* Poste horizontal */}
              <line x1="50" y1="20" x2="200" y2="20" stroke="currentColor" strokeWidth="4" />
              {/* Corda */}
              <line x1="200" y1="20" x2="200" y2="60" stroke="currentColor" strokeWidth="3" />
              
              {/* Boneco */}
              <AnimatePresence>
                {renderHangman()}
              </AnimatePresence>
            </svg>
          </div>
          
          {/* Palavra revelada */}
          {gameState && (
            <div className="mb-8">
              <div className="flex gap-2 justify-center">
                {gameState.revealedWord.split('').map((char, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="w-12 h-16 flex items-center justify-center border-b-4 border-blue-600 text-3xl font-bold"
                  >
                    {char === '_' ? '' : char}
                  </motion.div>
                ))}
              </div>
              
              {gameState.hint && (
                <p className="text-center mt-4 text-gray-600">
                  💡 Dica: {gameState.hint}
                </p>
              )}
            </div>
          )}
          
          {/* Teclado */}
          {gameState && gameState.status === 'active' && (
            <div className="grid grid-cols-9 gap-2 max-w-3xl">
              {alphabet.map((letter) => {
                const isGuessed = gameState.guessedLetters.includes(letter);
                const isCorrect = isGuessed && gameState.revealedWord.includes(letter);
                
                return (
                  <motion.button
                    key={letter}
                    whileHover={!isGuessed ? { scale: 1.1 } : {}}
                    whileTap={!isGuessed ? { scale: 0.9 } : {}}
                    onClick={() => handleGuessLetter(letter)}
                    disabled={isGuessed}
                    className={`
                      w-12 h-12 rounded-lg font-bold text-lg transition
                      ${isGuessed
                        ? isCorrect
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-white hover:bg-blue-100 text-gray-800 shadow'
                      }
                      ${isGuessed ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                    `}
                  >
                    {letter}
                  </motion.button>
                );
              })}
            </div>
          )}
          
          {/* Status do jogo */}
          {gameState && (gameState.status === 'won' || gameState.status === 'lost') && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`mt-8 p-6 rounded-xl text-center ${
                gameState.status === 'won' ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              <h2 className={`text-3xl font-bold mb-2 ${
                gameState.status === 'won' ? 'text-green-700' : 'text-red-700'
              }`}>
                {gameState.status === 'won' ? '🎉 Vitória!' : '😢 Derrota!'}
              </h2>
              <p className="text-lg">
                A palavra era: <strong>{gameState.revealedWord.replace(/_/g, '')}</strong>
              </p>
            </motion.div>
          )}
          
          {/* Botão do quadro branco */}
          {isTeacher && (
            <button
              onClick={() => setShowWhiteboard(!showWhiteboard)}
              className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition"
            >
              {showWhiteboard ? 'Esconder' : 'Mostrar'} Quadro Branco
            </button>
          )}
        </div>
        
        {/* Sidebar direita */}
        <div className="w-80 bg-white shadow-lg flex flex-col">
          {/* Placar */}
          <div className="p-4 border-b">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Trophy className="text-yellow-500" />
              Placar
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {gameState?.players.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">#{index + 1}</span>
                    <span className="text-sm">{player.name}</span>
                  </div>
                  <span className="font-bold text-blue-600">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Chat */}
          <div className="flex-1 flex flex-col p-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <MessageCircle />
              Chat
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-2 rounded text-sm ${
                    msg.type === 'system' ? 'bg-gray-100 text-gray-600 text-center' :
                    msg.type === 'success' ? 'bg-green-50 text-green-700' :
                    msg.type === 'error' ? 'bg-red-50 text-red-700' :
                    'bg-blue-50'
                  }`}
                >
                  {msg.type === 'chat' && (
                    <span className="font-semibold">{msg.player.name}: </span>
                  )}
                  {msg.message}
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Digite uma mensagem..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <button
                onClick={handleSendChat}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quadro Branco Modal */}
      <AnimatePresence>
        {showWhiteboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-xl p-6 max-w-4xl w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Quadro Branco Colaborativo</h3>
                <button
                  onClick={() => setShowWhiteboard(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex gap-4 mb-4">
                <input
                  type="color"
                  value={drawColor}
                  onChange={(e) => setDrawColor(e.target.value)}
                  className="w-12 h-12 rounded cursor-pointer"
                />
                
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(parseInt(e.target.value))}
                  className="flex-1"
                />
                
                <button
                  onClick={handleClearWhiteboard}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Eraser size={20} />
                  Limpar
                </button>
              </div>
              
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="border-2 border-gray-300 rounded-lg cursor-crosshair bg-white"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HangmanGame;
