import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, type Socket } from 'socket.io-client';
import { AlertCircle, Check, Clock3, Copy, Eraser, MessageCircle, Play, Search, Sparkles, Trophy, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentsAPI } from '../lib/api';
import { getSocketBaseUrl } from '../services/api.service';
import { createDashboardMockData } from '../mocks/demoData';
import type { Aluno } from '../types';

type Player = { id: string; name: string; avatar?: string | null; score: number };
type InvitedStudent = { id: string; name: string; email?: string | null; status: 'pending' | 'joined' };
type GameState = {
  id: string;
  status: 'waiting' | 'active' | 'won' | 'lost';
  revealedWord: string;
  hint: string;
  category: string;
  guessedLetters: string[];
  wrongGuesses: number;
  maxWrongGuesses: number;
  players: Player[];
  invitedStudents: InvitedStudent[];
  currentPlayer: Player | null;
  turnBased: boolean;
  turnDurationSeconds: number;
  currentTurnExpiresAt?: string;
  roundNumber: number;
  duration: number;
};
type ChatEntry = { type: 'system' | 'success' | 'error' | 'chat'; message: string; player?: { name: string }; timestamp: Date };
type HangmanGameProps = { gameId?: string; isTeacher: boolean; userId: string; userName: string; userAvatar?: string; onClose?: () => void };

const TIME_OPTIONS = [15, 20, 25, 30, 35, 40];
const CATEGORIES = ['Ingles', 'Portugues', 'Matematica', 'Ciencias', 'Historia', 'Geografia', 'Geral'];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const SUGGESTIONS: Record<string, { word: string; hint: string }[]> = {
  ingles: [{ word: 'LANGUAGE', hint: 'Sistema usado para comunicar ideias' }, { word: 'VOCABULARY', hint: 'Conjunto de palavras conhecidas' }],
  portugues: [{ word: 'APRENDIZADO', hint: 'Processo de aprender' }, { word: 'PROFESSOR', hint: 'Quem conduz a aula' }],
  matematica: [{ word: 'EQUACAO', hint: 'Expressao matematica com igualdade' }, { word: 'GEOMETRIA', hint: 'Area das formas e espacos' }],
  ciencias: [{ word: 'ECOSSISTEMA', hint: 'Seres vivos em equilibrio com o ambiente' }, { word: 'ENERGIA', hint: 'Capacidade de realizar trabalho' }],
  historia: [{ word: 'REVOLUCAO', hint: 'Mudanca profunda em uma sociedade' }],
  geografia: [{ word: 'CONTINENTE', hint: 'Grande massa de terra' }],
  geral: [{ word: 'CRIATIVIDADE', hint: 'Capacidade de criar novas ideias' }, { word: 'DISCIPLINA', hint: 'Constancia para seguir um plano' }]
};

const normalizeCategory = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const randomSuggestion = (category: string) => {
  const list = SUGGESTIONS[normalizeCategory(category)] || SUGGESTIONS.geral;
  return list[Math.floor(Math.random() * list.length)];
};
const systemEntry = (message: string, type: ChatEntry['type'] = 'system'): ChatEntry => ({ type, message, timestamp: new Date() });
const clockLabel = (seconds: number) => `${Math.floor(Math.max(seconds, 0) / 60)}:${(Math.max(seconds, 0) % 60).toString().padStart(2, '0')}`;

/**
 * O backend passa a ser a fonte de verdade para turnos, timer e convites.
 * O componente apenas reflete o estado recebido pelos eventos do socket.
 */
const HangmanGame: React.FC<HangmanGameProps> = ({ gameId: initialGameId, isTeacher, userId, userName, userAvatar, onClose }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameId, setGameId] = useState<string | null>(initialGameId || null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [students, setStudents] = useState<Aluno[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatEntry[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [joinCode, setJoinCode] = useState(initialGameId || '');
  const [joinError, setJoinError] = useState('');
  const [copied, setCopied] = useState(false);
  const [turnTimeLeft, setTurnTimeLeft] = useState(0);
  const [wordGuess, setWordGuess] = useState('');
  const [finalWord, setFinalWord] = useState('');
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [createForm, setCreateForm] = useState({ word: '', hint: '', category: 'Ingles', maxWrongGuesses: 6, turnBased: true, turnDurationSeconds: 20, invitedStudentIds: [] as string[] });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(3);

  useEffect(() => {
    if (!isTeacher) return;
    const load = async () => {
      try {
        const response = await studentsAPI.getAll() as { students?: Aluno[] };
        setStudents(Array.isArray(response?.students) && response.students.length > 0 ? response.students : createDashboardMockData().students);
      } catch (error) {
        console.error('Erro ao carregar alunos da Forca:', error);
        setStudents(createDashboardMockData().students);
        toast.error('Nao foi possivel carregar a base real. Usando exemplos.');
      }
    };
    void load();
  }, [isTeacher]);

  useEffect(() => {
    const token = isTeacher ? localStorage.getItem('token') : (localStorage.getItem('studentToken') || localStorage.getItem('token'));
    const instance = io(`${getSocketBaseUrl()}/hangman`, { auth: token ? { token } : undefined, transports: ['websocket', 'polling'] });
    setSocket(instance);
    instance.on('connect', () => {
      setJoinError('');
      if (initialGameId && !isTeacher) {
        instance.emit('join-game', { gameId: initialGameId, studentName: userName, studentAvatar: userAvatar });
      }
    });
    instance.on('game-created', ({ gameId: id, gameState: state }) => {
      setGameId(id);
      setGameState(state);
      setChatMessages([systemEntry('Sala criada. Convide os alunos e inicie quando todos estiverem prontos.')]);
    });
    instance.on('game-joined', ({ gameId: id, gameState: state }) => {
      setGameId(id);
      setGameState(state);
      setChatMessages((current) => [...current, systemEntry('Voce entrou na sala.')]);
    });
    instance.on('player-joined', ({ player, players, invitedStudents }) => {
      setGameState((current) => current ? { ...current, players, invitedStudents: invitedStudents || current.invitedStudents } : null);
      setChatMessages((current) => [...current, systemEntry(`${player.name} entrou na sala.`)]);
    });
    instance.on('player-left', ({ player }) => setChatMessages((current) => [...current, systemEntry(`${player.name} saiu da sala.`)]));
    instance.on('game-started', ({ gameState: state }) => {
      setFinalWord('');
      setGameState(state);
      setChatMessages((current) => [...current, systemEntry(state.currentPlayer ? `Rodada iniciada. Vez de ${state.currentPlayer.name}.` : 'Rodada iniciada.')]);
    });
    instance.on('turn-changed', ({ gameState: state, currentPlayer, reason }) => {
      setGameState(state);
      setChatMessages((current) => [...current, systemEntry(reason === 'timeout' ? `Tempo encerrado. Agora e a vez de ${currentPlayer?.name || 'outro aluno'}.` : `Proxima rodada: ${currentPlayer?.name || 'aluno da vez'}.`)]);
    });
    instance.on('turn-expired', ({ gameState: state, timedOutPlayer, penaltyApplied }) => {
      setGameState(state);
      setChatMessages((current) => [...current, systemEntry(penaltyApplied ? `Tempo de ${timedOutPlayer?.name || 'um aluno'} acabou. Mais uma parte da forca foi desenhada.` : `Tempo de ${timedOutPlayer?.name || 'um aluno'} acabou. A rodada passou para o proximo aluno.`, penaltyApplied ? 'error' : 'system')]);
    });
    instance.on('letter-guessed', ({ letter, correct, gameState: state, player }) => {
      setGameState(state);
      setChatMessages((current) => [...current, systemEntry(correct ? `${player.name} acertou a letra ${letter}.` : `${player.name} errou a letra ${letter}.`, correct ? 'success' : 'error')]);
    });
    instance.on('word-guessed', ({ word, correct, gameState: state, player }) => {
      setGameState(state);
      setWordGuess('');
      setChatMessages((current) => [...current, systemEntry(correct ? `${player.name} acertou a palavra ${word}.` : `${player.name} tentou ${word}, mas nao acertou.`, correct ? 'success' : 'error')]);
    });
    instance.on('game-ended', ({ status, word, players }) => {
      setFinalWord(word);
      setGameState((current) => current ? { ...current, status, players } : current);
      setChatMessages((current) => [...current, systemEntry(status === 'won' ? `Fim de jogo. A palavra ${word} foi descoberta.` : `Fim de jogo. A palavra correta era ${word}.`, status === 'won' ? 'success' : 'error')]);
    });
    instance.on('chat-message', ({ player, message, timestamp }) => setChatMessages((current) => [...current, { type: 'chat', player, message, timestamp: new Date(timestamp) }]));
    instance.on('whiteboard-update', (drawData) => drawOnCanvas(drawData));
    instance.on('whiteboard-cleared', () => clearCanvas());
    instance.on('connect_error', (error) => {
      console.error('Erro de conexao no Hangman:', error?.message || error);
      setJoinError('Nao foi possivel conectar ao jogo. Verifique seu login.');
    });
    instance.on('error', ({ message }) => toast.error(message || 'Erro ao interagir com o jogo.'));
    return () => {
      instance.disconnect();
    };
  }, [initialGameId, isTeacher, userAvatar, userName]);

  useEffect(() => {
    if (!gameState?.currentTurnExpiresAt || gameState.status !== 'active') {
      setTurnTimeLeft(0);
      return;
    }
    const tick = () => setTurnTimeLeft(Math.max(Math.ceil((new Date(gameState.currentTurnExpiresAt as string).getTime() - Date.now()) / 1000), 0));
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [gameState?.currentTurnExpiresAt, gameState?.status]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return !query ? students : students.filter((student) => student.name.toLowerCase().includes(query) || (student.email || '').toLowerCase().includes(query));
  }, [studentSearch, students]);
  const canGuess = Boolean(!isTeacher && gameState && gameState.status === 'active' && (!gameState.turnBased || gameState.currentPlayer?.id === userId));
  const timerRatio = gameState?.turnDurationSeconds ? turnTimeLeft / gameState.turnDurationSeconds : 0;
  const timerTextClass = timerRatio > 0.66 ? 'text-white' : timerRatio > 0.33 ? 'text-amber-300' : 'text-red-400';
  const timerBarClass = timerRatio > 0.66 ? 'bg-white' : timerRatio > 0.33 ? 'bg-amber-400' : 'bg-red-500';

  const toggleInvite = (studentId: string) => setCreateForm((current) => ({ ...current, invitedStudentIds: current.invitedStudentIds.includes(studentId) ? current.invitedStudentIds.filter((id) => id !== studentId) : [...current.invitedStudentIds, studentId] }));
  const generateSuggestion = () => {
    const suggestion = randomSuggestion(createForm.category);
    setCreateForm((current) => ({ ...current, word: suggestion.word, hint: suggestion.hint }));
  };
  const createGame = () => {
    if (!socket) return toast.error('Conexao indisponivel no momento.');
    if (!createForm.word.trim()) return toast.error('Digite uma palavra valida para criar a sala.');
    socket.emit('create-game', { word: createForm.word.trim().toUpperCase(), hint: createForm.hint.trim(), category: createForm.category, maxWrongGuesses: createForm.maxWrongGuesses, turnBased: createForm.turnBased, turnDurationSeconds: createForm.turnDurationSeconds, invitedStudentIds: createForm.invitedStudentIds });
  };
  const joinGame = () => {
    if (!socket) return setJoinError('Conexao indisponivel no momento.');
    if (!joinCode.trim()) return setJoinError('Informe o codigo da sala.');
    setJoinError('');
    socket.emit('join-game', { gameId: joinCode.trim(), studentName: userName, studentAvatar: userAvatar });
  };
  const startGame = () => {
    if (!socket || !gameId) return;
    if ((gameState?.players.length || 0) === 0) return toast.error('Espere pelo menos um aluno entrar antes de iniciar.');
    socket.emit('start-game', { gameId });
  };
  const copyGameCode = async () => {
    if (!gameId) return;
    try {
      await navigator.clipboard.writeText(gameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error('Nao foi possivel copiar o codigo da sala.');
    }
  };
  const guessLetter = (letter: string) => {
    if (!socket || !gameId || !gameState || !canGuess) return;
    if (gameState.guessedLetters.includes(letter)) return toast.error('Essa letra ja foi usada.');
    socket.emit('guess-letter', { gameId, letter });
  };
  const guessWord = () => {
    if (!socket || !gameId || !gameState || !canGuess || !wordGuess.trim()) return;
    socket.emit('guess-word', { gameId, word: wordGuess.trim().toUpperCase() });
  };
  const sendChat = () => {
    if (!socket || !gameId || !chatInput.trim()) return;
    socket.emit('send-chat', { gameId, message: chatInput.trim() });
    setChatInput('');
  };
  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showWhiteboard) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const context = canvas.getContext('2d');
    if (context) {
      context.beginPath();
      context.moveTo(x, y);
    }
    if (socket && gameId) socket.emit('draw-whiteboard', { gameId, drawData: { x, y, color: drawColor, lineWidth, isStart: true } });
  };
  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !showWhiteboard) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const context = canvas.getContext('2d');
    if (context) {
      context.strokeStyle = drawColor;
      context.lineWidth = lineWidth;
      context.lineCap = 'round';
      context.lineTo(x, y);
      context.stroke();
    }
    if (socket && gameId) socket.emit('draw-whiteboard', { gameId, drawData: { x, y, color: drawColor, lineWidth, isDrawing: true } });
  };
  const stopDrawing = () => {
    setIsDrawing(false);
    const context = canvasRef.current?.getContext('2d');
    if (context) context.closePath();
    if (socket && gameId) socket.emit('draw-whiteboard', { gameId, drawData: { isStop: true } });
  };
  const drawOnCanvas = (drawData: { x?: number; y?: number; color?: string; lineWidth?: number; isStart?: boolean; isDrawing?: boolean; isStop?: boolean }) => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    if (drawData.isStart) {
      context.beginPath();
      context.moveTo(drawData.x || 0, drawData.y || 0);
      return;
    }
    if (drawData.isStop) {
      context.closePath();
      return;
    }
    if (drawData.isDrawing) {
      context.strokeStyle = drawData.color || '#ffffff';
      context.lineWidth = drawData.lineWidth || 3;
      context.lineCap = 'round';
      context.lineTo(drawData.x || 0, drawData.y || 0);
      context.stroke();
    }
  };
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  };
  const clearWhiteboard = () => {
    clearCanvas();
    if (socket && gameId) socket.emit('clear-whiteboard', { gameId });
  };
  const hangmanParts = [
    <motion.circle key="head" cx="200" cy="84" r="20" stroke="currentColor" strokeWidth="3" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />,
    <motion.line key="body" x1="200" y1="104" x2="200" y2="156" stroke="currentColor" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />,
    <motion.line key="left-arm" x1="200" y1="122" x2="170" y2="140" stroke="currentColor" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />,
    <motion.line key="right-arm" x1="200" y1="122" x2="230" y2="140" stroke="currentColor" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />,
    <motion.line key="left-leg" x1="200" y1="156" x2="178" y2="194" stroke="currentColor" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />,
    <motion.line key="right-leg" x1="200" y1="156" x2="222" y2="194" stroke="currentColor" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />
  ];

  if (isTeacher && !gameId) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/84 px-4 py-6 backdrop-blur-sm">
        <div className="mx-auto flex h-full max-w-6xl items-center">
          <div className="w-full rounded-[32px] border border-white/10 bg-[#0d1524] p-6 text-slate-100 shadow-[0_40px_100px_rgba(2,6,23,0.55)]">
            <div className="flex items-center justify-between border-b border-white/8 pb-5">
              <div><p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Forca ao vivo</p><h2 className="mt-2 text-3xl font-semibold text-white">Configurar nova rodada</h2></div>
              {onClose && <button onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:border-white/20 hover:text-white"><X size={20} /></button>}
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.95fr]">
              <section className="space-y-4 rounded-[28px] border border-white/10 bg-[#11192a] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-sm font-semibold text-white">Palavra, tempo e regras</p><p className="mt-1 text-xs text-slate-400">Configure a sala antes de convidar a turma.</p></div>
                  <button type="button" onClick={generateSuggestion} className="inline-flex items-center gap-2 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:border-indigo-300/40 hover:bg-indigo-500/18"><Sparkles size={16} />Sugestao</button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input value={createForm.word} onChange={(event) => setCreateForm((current) => ({ ...current, word: event.target.value.toUpperCase().replace(/[^A-ZÀ-ÿ\s]/g, '') }))} placeholder="Palavra" className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-white outline-none placeholder:text-slate-500" />
                  <input value={createForm.hint} onChange={(event) => setCreateForm((current) => ({ ...current, hint: event.target.value }))} placeholder="Dica" className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-white outline-none placeholder:text-slate-500" />
                  <select value={createForm.category} onChange={(event) => setCreateForm((current) => ({ ...current, category: event.target.value }))} className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-white outline-none">{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
                  <select value={createForm.turnDurationSeconds} onChange={(event) => setCreateForm((current) => ({ ...current, turnDurationSeconds: Number(event.target.value) }))} className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-white outline-none">{TIME_OPTIONS.map((time) => <option key={time} value={time}>{time} segundos</option>)}</select>
                </div>
                <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                  <input type="number" min={3} max={10} value={createForm.maxWrongGuesses} onChange={(event) => setCreateForm((current) => ({ ...current, maxWrongGuesses: Number(event.target.value) }))} className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-white outline-none" />
                  <button type="button" onClick={() => setCreateForm((current) => ({ ...current, turnBased: !current.turnBased }))} className={`rounded-2xl border px-4 py-3 text-left ${createForm.turnBased ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-100' : 'border-white/10 bg-[#0b1220] text-slate-300'}`}>{createForm.turnBased ? 'Rodadas por aluno ativas' : 'Modo livre ativo'}</button>
                </div>
                <button onClick={createGame} className="w-full rounded-[24px] bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">Criar sala da Forca</button>
              </section>
              <section className="space-y-4 rounded-[28px] border border-white/10 bg-[#11192a] p-5">
                <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white">Convidar alunos</p><p className="mt-1 text-xs text-slate-400">Cada convite aparece no portal do aluno.</p></div><span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">{createForm.invitedStudentIds.length} selecionado(s)</span></div>
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-slate-300"><Search size={16} className="text-slate-500" /><input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Buscar aluno" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" /></label>
                <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
                  {filteredStudents.map((student, index) => {
                    const id = student._id || student.id || `${student.name}-${index}`;
                    const invited = createForm.invitedStudentIds.includes(id);
                    const portalEnabled = student.portalAccess?.enabled !== false;
                    return <div key={id} className={`rounded-[24px] border px-4 py-4 ${invited ? 'border-indigo-400/40 bg-indigo-500/10' : 'border-white/10 bg-[#0b1220]'}`}><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white">{student.name}</p><p className="mt-1 text-xs text-slate-400">{student.email || 'Sem email cadastrado'}</p></div><button type="button" onClick={() => toggleInvite(id)} disabled={!portalEnabled} className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${invited ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/[0.03] text-slate-100'} disabled:cursor-not-allowed disabled:opacity-40`}>{invited ? 'Convidado' : 'Convidar'}</button></div></div>;
                  })}
                  {filteredStudents.length === 0 && <div className="rounded-[24px] border border-dashed border-white/10 bg-[#0b1220] px-4 py-8 text-center text-sm text-slate-400">Nenhum aluno encontrado.</div>}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isTeacher && !gameId) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/84 px-4 py-6 backdrop-blur-sm">
        <div className="mx-auto flex h-full max-w-xl items-center">
          <div className="w-full rounded-[32px] border border-white/10 bg-[#0d1524] p-6 text-slate-100 shadow-[0_40px_100px_rgba(2,6,23,0.55)]">
            <div className="flex items-center justify-between">
              <div><p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Entrar na partida</p><h2 className="mt-2 text-3xl font-semibold text-white">Jogo da Forca</h2></div>
              {onClose && <button onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:border-white/20 hover:text-white"><X size={20} /></button>}
            </div>
            <div className="mt-6 space-y-4">
              <p className="text-sm text-slate-400">Cole o codigo da sala enviado pelo professor ou use o link recebido no portal.</p>
              <input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && joinGame()} placeholder="Codigo da sala" className="w-full rounded-2xl border border-white/10 bg-[#11192a] px-4 py-3 text-white outline-none placeholder:text-slate-500" />
              {joinError && <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"><AlertCircle size={18} className="mt-0.5 flex-shrink-0" /><span>{joinError}</span></div>}
              <button onClick={joinGame} className="w-full rounded-[24px] bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">Entrar na sala</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#050a13] text-slate-100">
      <header className="border-b border-white/8 bg-[#0b1220] px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div><p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Sala interativa</p><h1 className="mt-2 text-2xl font-semibold text-white">Jogo da Forca</h1></div>
            {gameState && <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-slate-300">{gameState.category} • Rodada {gameState.roundNumber || 1}</div>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {gameId && <button onClick={copyGameCode} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-200 transition hover:border-white/20 hover:text-white">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Codigo copiado' : `Codigo ${gameId}`}</button>}
            {gameState?.status === 'active' && <div className="min-w-[170px] rounded-2xl border border-white/10 bg-[#11192a] px-4 py-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500"><Clock3 size={14} />Timer</div><span className={`text-xl font-semibold ${timerTextClass}`}>{clockLabel(turnTimeLeft)}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className={`h-full rounded-full ${timerBarClass}`} style={{ width: `${Math.min(((turnTimeLeft || 0) / Math.max(gameState.turnDurationSeconds || 20, 1)) * 100, 100)}%` }} /></div></div>}
            {onClose && <button onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:border-white/20 hover:text-white"><X size={20} /></button>}
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 xl:flex-row">
            <section className="flex-1 space-y-5">
              <div className="rounded-[30px] border border-white/8 bg-[#0b1220] p-6">
                {gameState?.status === 'waiting' && <div className="mb-5 rounded-[24px] border border-white/8 bg-[#11192a] px-5 py-4">{isTeacher ? <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-semibold text-white">Sala pronta para iniciar</p><p className="mt-1 text-xs text-slate-400">{(gameState.players.length || 0) > 0 ? `${gameState.players.length} aluno(s) ja entraram.` : 'Envie os convites e espere pelo menos um aluno entrar.'}</p></div><button onClick={startGame} disabled={(gameState.players.length || 0) === 0} className="rounded-[24px] bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"><Play size={16} className="mr-2 inline" />Iniciar rodada</button></div> : <div><p className="text-sm font-semibold text-white">Aguardando o professor iniciar</p><p className="mt-1 text-xs text-slate-400">Sua entrada foi registrada. Fique nesta tela.</p></div>}</div>}
                {gameState?.status === 'active' && <div className="mb-5 flex flex-col gap-3 rounded-[24px] border border-white/8 bg-[#11192a] px-5 py-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Aluno da vez</p><p className="mt-2 text-xl font-semibold text-white">{gameState.currentPlayer?.name || 'Rodada livre'}</p><p className="mt-1 text-xs text-slate-400">{gameState.turnBased ? 'A rodada troca automaticamente quando o tempo termina.' : 'Modo livre ativo.'}</p></div>{!isTeacher && !canGuess && <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Aguarde sua vez para responder.</div>}</div>}
                <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                  <div className="rounded-[28px] border border-white/8 bg-[#11192a] p-5"><p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Forca</p><svg width="300" height="250" className="mt-5 text-slate-100"><line x1="24" y1="230" x2="150" y2="230" stroke="currentColor" strokeWidth="4" /><line x1="52" y1="230" x2="52" y2="20" stroke="currentColor" strokeWidth="4" /><line x1="52" y1="20" x2="202" y2="20" stroke="currentColor" strokeWidth="4" /><line x1="202" y1="20" x2="202" y2="64" stroke="currentColor" strokeWidth="3" /><AnimatePresence>{hangmanParts.slice(0, gameState?.wrongGuesses || 0)}</AnimatePresence></svg><div className="mt-4 flex items-center justify-between rounded-2xl border border-white/8 bg-[#0b1220] px-4 py-3 text-sm"><span className="text-slate-400">Erros</span><span className="font-semibold text-white">{gameState?.wrongGuesses || 0}/{gameState?.maxWrongGuesses || 6}</span></div></div>
                  <div className="rounded-[28px] border border-white/8 bg-[#11192a] p-5"><div className="flex min-h-[112px] flex-wrap items-end justify-center gap-3 rounded-[24px] border border-white/8 bg-[#0b1220] px-5 py-6">{gameState?.revealedWord.split('').map((character, index) => character === ' ' ? <div key={`space-${index}`} className="w-5" /> : <div key={`${character}-${index}`} className="flex flex-col items-center gap-1.5"><span className="w-8 text-center font-mono text-2xl font-semibold text-white">{character !== '_' ? character : ''}</span><span className="h-0.5 w-8 rounded-full bg-slate-500/80" /></div>)}</div>{gameState?.hint && <div className="mt-4 rounded-2xl border border-indigo-400/14 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">Dica: {gameState.hint}</div>}{gameState?.status === 'active' && <><div className={`mt-5 grid grid-cols-7 gap-2 md:grid-cols-9 ${!canGuess ? 'opacity-55' : ''}`}>{ALPHABET.map((letter) => { const used = gameState.guessedLetters.includes(letter); const correct = used && gameState.revealedWord.includes(letter); return <button key={letter} onClick={() => guessLetter(letter)} disabled={used || !canGuess} className={`h-11 rounded-2xl border text-sm font-semibold transition ${used ? correct ? 'border-emerald-400/25 bg-emerald-500/12 text-emerald-100' : 'border-red-400/25 bg-red-500/12 text-red-100' : 'border-white/10 bg-[#0b1220] text-white hover:border-white/20 hover:bg-white/[0.04]'} disabled:cursor-not-allowed`}>{letter}</button>; })}</div><div className="mt-5 flex flex-col gap-3 lg:flex-row"><input value={wordGuess} onChange={(event) => setWordGuess(event.target.value.toUpperCase().replace(/[^A-ZÀ-ÿ\s]/g, ''))} onKeyDown={(event) => event.key === 'Enter' && guessWord()} placeholder="Tentar palavra inteira" className="flex-1 rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-white outline-none placeholder:text-slate-500 disabled:opacity-50" disabled={!canGuess} /><button onClick={guessWord} disabled={!canGuess || !wordGuess.trim()} className="rounded-[24px] bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40">Tentar resposta</button></div></>}{(gameState?.status === 'won' || gameState?.status === 'lost') && <div className={`mt-5 rounded-[24px] border px-5 py-5 text-center ${gameState.status === 'won' ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-red-400/20 bg-red-500/10'}`}><p className={`text-3xl font-semibold ${gameState.status === 'won' ? 'text-emerald-100' : 'text-red-100'}`}>{gameState.status === 'won' ? 'Palavra descoberta' : 'Rodada encerrada'}</p><p className="mt-3 text-base text-white">Palavra final: <strong>{finalWord || gameState.revealedWord.replace(/_/g, '')}</strong></p></div>}<button onClick={() => setShowWhiteboard((current) => !current)} className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:text-white">{showWhiteboard ? 'Fechar quadro branco' : 'Mostrar quadro branco'}</button></div>
                </div>
              </div>
            </section>
            <aside className="w-full xl:w-[360px]">
              <div className="flex flex-col gap-5">
                <section className="rounded-[28px] border border-white/8 bg-[#0b1220] p-5"><div className="flex items-center gap-2"><Trophy size={18} className="text-amber-300" /><p className="text-sm font-semibold text-white">Placar</p></div><div className="mt-4 space-y-3">{(gameState?.players || []).length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-[#11192a] px-4 py-6 text-sm text-slate-400">Nenhum aluno conectado ainda.</div> : gameState?.players.map((player, index) => <div key={player.id} className={`rounded-2xl border px-4 py-3 ${player.id === gameState.currentPlayer?.id ? 'border-indigo-400/25 bg-indigo-500/10' : 'border-white/10 bg-[#11192a]'}`}><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white">{player.name}</p><p className="mt-1 text-xs text-slate-400">{index + 1}o no ranking</p></div><span className="text-lg font-semibold text-white">{player.score}</span></div></div>)}</div></section>
                <section className="rounded-[28px] border border-white/8 bg-[#0b1220] p-5"><div className="flex items-center gap-2"><Users size={18} className="text-slate-300" /><p className="text-sm font-semibold text-white">Convites e presencas</p></div><div className="mt-4 space-y-3">{(gameState?.invitedStudents || []).length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-[#11192a] px-4 py-6 text-sm text-slate-400">Sem convites registrados nesta sala.</div> : gameState?.invitedStudents.map((student) => <div key={student.id} className="rounded-2xl border border-white/10 bg-[#11192a] px-4 py-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white">{student.name}</p><p className="mt-1 text-xs text-slate-400">{student.email || 'Portal do aluno'}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${student.status === 'joined' ? 'bg-emerald-500/12 text-emerald-100' : 'bg-white/[0.05] text-slate-300'}`}>{student.status === 'joined' ? 'Entrou' : 'Convidado'}</span></div></div>)}</div></section>
                <section className="flex min-h-[260px] flex-col rounded-[28px] border border-white/8 bg-[#0b1220] p-5"><div className="flex items-center gap-2"><MessageCircle size={18} className="text-slate-300" /><p className="text-sm font-semibold text-white">Chat da sala</p></div><div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">{chatMessages.map((entry, index) => <div key={`${entry.message}-${index}`} className={`rounded-2xl px-4 py-3 text-sm ${entry.type === 'success' ? 'bg-emerald-500/10 text-emerald-100' : entry.type === 'error' ? 'bg-red-500/10 text-red-100' : entry.type === 'chat' ? 'bg-[#11192a] text-slate-100' : 'bg-white/[0.04] text-slate-300'}`}>{entry.type === 'chat' && <p className="mb-1 text-xs uppercase tracking-[0.18em] text-slate-500">{entry.player?.name}</p>}<p>{entry.message}</p></div>)}</div><div className="mt-4 flex gap-2"><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendChat()} placeholder="Escreva uma mensagem" className="flex-1 rounded-2xl border border-white/10 bg-[#11192a] px-4 py-3 text-white outline-none placeholder:text-slate-500" /><button onClick={sendChat} className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">Enviar</button></div></section>
              </div>
            </aside>
          </div>
        </main>
      </div>
      <AnimatePresence>{showWhiteboard && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-slate-950/88 px-4 py-6 backdrop-blur-sm"><div className="mx-auto flex h-full max-w-6xl items-center"><div className="w-full rounded-[32px] border border-white/10 bg-[#0d1524] p-6 shadow-[0_40px_100px_rgba(2,6,23,0.55)]"><div className="flex items-center justify-between"><div><p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Ferramenta colaborativa</p><h3 className="mt-2 text-2xl font-semibold text-white">Quadro branco</h3></div><button onClick={() => setShowWhiteboard(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:border-white/20 hover:text-white"><X size={20} /></button></div><div className="mt-5 flex flex-wrap items-center gap-4 rounded-[24px] border border-white/10 bg-[#11192a] px-4 py-4"><label className="flex items-center gap-3 text-sm text-slate-300">Cor<input type="color" value={drawColor} onChange={(event) => setDrawColor(event.target.value)} className="h-10 w-12 rounded-xl border border-white/10 bg-transparent" /></label><label className="flex min-w-[180px] flex-1 items-center gap-3 text-sm text-slate-300">Espessura<input type="range" min="1" max="10" value={lineWidth} onChange={(event) => setLineWidth(Number(event.target.value))} className="flex-1" /></label><button onClick={clearWhiteboard} className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/16"><Eraser size={16} />Limpar</button></div><div className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-white"><canvas ref={canvasRef} width={1100} height={560} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} className="h-[65vh] w-full cursor-crosshair" /></div></div></div></motion.div>}</AnimatePresence>
    </div>
  );
};

export default HangmanGame;
