import { useEffect, useRef, useState } from 'react';
import { useLiveClass } from '../hooks/useLiveClass';
import { useAudioTranscription } from '../hooks/useAudioTranscription';
import { Mic, MicOff, Video, VideoOff, Phone, Send, Users, MessageSquare, Save, X, Sparkles, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { automationEngine } from '../services/automationEngine';
import ClassSummary from './PostClassSummary';

interface LiveClassProps {
  classId: string;
  classTitle: string;
  onEnd: () => void;
}

const FinalRemarksModal = ({
  isOpen,
  onClose,
  onConfirm,
  initialTranscript
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (finalTranscript: string) => void;
  initialTranscript: string;
}) => {
  const { isListening, transcript, interimTranscript, isSupported, startListening, stopListening, resetTranscript } = useAudioTranscription();
  const [remarks, setRemarks] = useState(initialTranscript);
  const [manualEdit, setManualEdit] = useState(false);

  useEffect(() => {
    if (isOpen && isSupported) {
      startListening();
      toast.success('Microfone aberto para considerações finais');
    }
    return () => {
      stopListening();
    };
  }, [isOpen, isSupported, startListening, stopListening]);

  useEffect(() => {
    if (transcript && !manualEdit) {
      // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
      setRemarks(initialTranscript + ' ' + transcript);
    }
  }, [transcript, manualEdit, initialTranscript]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-2xl w-full shadow-2xl shadow-indigo-500/10 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-indigo-900/20 to-transparent">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="text-indigo-400" /> Considerações Finais
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Fale agora para incluir um resumo ou pontos importantes no relatório da aula.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative group">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-1000 ${isListening ? 'opacity-40 animate-pulse' : ''}`}></div>
            <textarea
              value={remarks + (interimTranscript ? ' ' + interimTranscript : '')}
              onChange={(e) => {
                setRemarks(e.target.value);
                setManualEdit(true);
              }}
              placeholder="Sua fala aparecerá aqui automaticamente..."
              className="relative w-full h-48 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all resize-none text-lg leading-relaxed"
            />
            {isListening && (
              <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full">
                <div className="flex gap-1">
                  <span className="w-1 h-3 bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1 h-3 bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1 h-3 bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Ouvindo...</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => isListening ? stopListening() : startListening()}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  isListening
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                {isListening ? 'Pausar Microfone' : 'Ativar Microfone'}
              </button>
              <button
                onClick={() => {
                  resetTranscript();
                  setRemarks('');
                  setManualEdit(false);
                }}
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                Limpar tudo
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-medium"
          >
            Descartar
          </button>
          <button
            onClick={() => onConfirm(remarks + (interimTranscript ? ' ' + interimTranscript : ''))}
            className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <Save size={18} />
            Gerar Resumo com IA
          </button>
        </div>
      </div>
    </div>
  );
};

const LiveClassComponent = ({ classId, classTitle, onEnd }: LiveClassProps) => {
  const { session, connected, participants, transcript: socketTranscript, localStream, startSession, endSession, sendMessage, toggleAudio, toggleVideo } = useLiveClass(classId);
  const { isListening, transcript: audioTranscript, interimTranscript, isSupported, startListening, stopListening, onTranscript } = useAudioTranscription();
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ user: string; text: string; time: string }>>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [showFinalRemarks, setShowFinalRemarks] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');

  // Mock data for PostClassSummary
  const mockClassData = {
    id: classId,
    _id: classId,
    title: classTitle,
    subject: 'Matemática', // Fallback
    studentId: 's1',
    studentName: 'João Silva',
    grade: '9º Ano',
    scheduledAt: new Date().toISOString(),
    duration: 60,
    status: 'completed' as const,
    isLive: false
  };

  const mockStudent = {
    id: 's1',
    _id: 's1',
    name: 'João Silva',
    grade: '9º Ano',
    age: 14,
    parentName: 'Maria Silva',
    parentEmail: 'maria@example.com',
    parentPhone: '(11) 99999-9999',
    monthlyFee: 450
  };

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const fullTranscript = socketTranscript + ' ' + audioTranscript;

  useEffect(() => {
    startSession().then(() => {
      automationEngine.fireTrigger('class_started', 'class', classId, classTitle);
    }).catch(() => {
      toast.error('Erro ao iniciar aula ao vivo');
    });

    return () => {
      endSession();
      if (isListening) stopListening();
    };
  }, [classId, classTitle, startSession, endSession, isListening, stopListening]);

  useEffect(() => {
    onTranscript((result) => {
      if (result.isFinal && session?.id) {
        sendMessage(result.text);
      }
    });
  }, [session?.id, onTranscript, sendMessage]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [fullTranscript, interimTranscript]);

  const handleToggleAudio = () => {
    toggleAudio(!audioEnabled);
    setAudioEnabled(!audioEnabled);
  };

  const handleToggleVideo = () => {
    toggleVideo(!videoEnabled);
    setVideoEnabled(!videoEnabled);
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [...prev, { user: 'Você', text: message, time }]);
      sendMessage(message);
      setMessage('');
    }
  };

  const handleEndSession = () => {
    // Stop recording if active
    if (isListening) {
      stopListening();
      setTranscriptionEnabled(false);
    }

    // Open final remarks modal
    setShowFinalRemarks(true);
  };

  const handleConfirmFinalRemarks = (finalText: string) => {
    setFinalTranscript(finalText);
    setShowFinalRemarks(false);
    setShowSummary(true);
  };

  const handleCloseSummary = () => {
    setShowSummary(false);
    endSession();
    onEnd();
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
      {showFinalRemarks && (
        <FinalRemarksModal
          isOpen={showFinalRemarks}
          onClose={() => setShowFinalRemarks(false)}
          onConfirm={handleConfirmFinalRemarks}
          initialTranscript={fullTranscript}
        />
      )}

      {showSummary && (
        <ClassSummary
          classData={mockClassData}
          student={mockStudent}
          transcript={finalTranscript || fullTranscript}
          onClose={handleCloseSummary}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold text-indigo-400 uppercase tracking-widest animate-pulse">
                Ao Vivo
              </div>
              <h2 className="text-slate-400 font-medium">{classTitle}</h2>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Nexus <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Live Academy</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleEndSession}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center gap-3 transition-all font-bold shadow-lg shadow-red-500/20 active:scale-95"
            >
              <Phone size={20} className="fill-current" />
              Finalizar Aula
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Video Area */}
          <div className="lg:col-span-3 space-y-6">
            <div className="relative aspect-video bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl group">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Overlay Controls */}
              <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-slate-950/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handleToggleAudio}
                    className={`p-4 rounded-2xl transition-all shadow-xl ${
                      audioEnabled ? 'bg-slate-800/80 hover:bg-slate-700 text-white' : 'bg-red-500 text-white'
                    }`}
                  >
                    {audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                  </button>
                  <button
                    onClick={handleToggleVideo}
                    className={`p-4 rounded-2xl transition-all shadow-xl ${
                      videoEnabled ? 'bg-slate-800/80 hover:bg-slate-700 text-white' : 'bg-red-500 text-white'
                    }`}
                  >
                    {videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                  </button>
                </div>
              </div>

              <div className="absolute top-6 left-6 flex items-center gap-3 px-4 py-2 bg-slate-950/60 backdrop-blur-md rounded-xl border border-white/10">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                <span className="text-sm font-bold text-white uppercase tracking-wider">Você (Professor)</span>
              </div>

              <div className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-slate-950/60 backdrop-blur-md rounded-xl border border-white/10">
                <Users size={16} className="text-indigo-400" />
                <span className="text-sm font-bold text-white">{participants.length} Online</span>
              </div>
            </div>

            {/* Transcription Display */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-[2rem] border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Volume2 size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Transcrição em Tempo Real</h3>
                    <p className="text-xs text-slate-500">I.A. processando sua fala automaticamente</p>
                  </div>
                </div>
                {isSupported && (
                  <button
                    onClick={() => {
                      if (transcriptionEnabled) {
                        stopListening();
                        setTranscriptionEnabled(false);
                      } else {
                        startListening();
                        setTranscriptionEnabled(true);
                      }
                    }}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                      transcriptionEnabled
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${transcriptionEnabled ? 'bg-white animate-pulse' : 'bg-slate-500'}`}></div>
                    {transcriptionEnabled ? 'Transcrição Ativa' : 'Ativar Transcrição'}
                  </button>
                )}
              </div>

              <div
                ref={transcriptRef}
                className="p-8 h-48 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
              >
                {fullTranscript || interimTranscript ? (
                  <div className="text-lg leading-relaxed">
                    <span className="text-slate-300">{fullTranscript}</span>
                    {interimTranscript && (
                      <span className="text-indigo-400 font-medium ml-1 animate-pulse italic">
                        {interimTranscript}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 opacity-50">
                    <Mic size={32} />
                    <p className="text-sm font-medium">Aguardando início da fala...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Chat & Participants */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-xl flex flex-col h-[600px]">
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageSquare size={20} className="text-indigo-400" />
                  Chat Interativo
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {messages.length > 0 ? (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.user === 'Você' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${msg.user === 'Você' ? 'text-indigo-400' : 'text-cyan-400'}`}>
                          {msg.user}
                        </span>
                        <span className="text-[10px] text-slate-500">{msg.time}</span>
                      </div>
                      <div className={`px-4 py-2 rounded-2xl text-sm max-w-[90%] break-words ${
                        msg.user === 'Você'
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/10'
                          : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-600 text-center gap-3">
                    <div className="p-4 bg-slate-950 rounded-full border border-slate-800">
                      <MessageSquare size={32} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-400">Nenhuma mensagem</p>
                      <p className="text-xs">Seja o primeiro a enviar algo!</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-950/50 border-t border-slate-800">
                <div className="relative">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Envie uma mensagem..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-3 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
                {connected && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Servidor Conectado</span>
                  </div>
                )}
              </div>
            </div>

            {/* Participant Mini List */}
            <div className="bg-slate-900 rounded-[2rem] border border-slate-800 p-6 shadow-xl">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Alunos na sala</h4>
              <div className="space-y-3">
                {participants.length > 0 ? (
                  participants.map((p) => (
                    <div key={p} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 group hover:border-indigo-500/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 border border-indigo-500/10 uppercase">
                          {p.substring(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{p}</span>
                      </div>
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic text-center py-2">Aguardando participantes...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveClassComponent;
