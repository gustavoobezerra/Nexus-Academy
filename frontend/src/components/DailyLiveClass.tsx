import { useState, useEffect, useRef, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';
import {
  Users, MessageSquare, ChevronRight, X, Plus,
  PhoneOff, Settings, Share2, Hand, Maximize, Minimize, HelpCircle, Lightbulb
} from 'lucide-react';
import toast from 'react-hot-toast';
import { dailyAPI } from '../lib/api';
import { classesAPI } from '../lib/api';

interface DailyLiveClassProps {
  classId: string;
  className: string;
  teacherName: string;
  studentName?: string;
  userType: 'teacher' | 'student';
  onEnd: () => void;
}

export const DailyLiveClass = ({
  classId,
  className,
  teacherName,
  studentName,
  userType,
  onEnd
}: DailyLiveClassProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(1);

  // Estados de UI
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [tipsHidden, setTipsHidden] = useState(false);
  const [fabExpanded, setFabExpanded] = useState(false);
  const [fabVisible, setFabVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: string; sender: string; text: string; time: Date }>>([]);
  const [messageInput, setMessageInput] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<ReturnType<typeof DailyIframe.createFrame> | null>(null);
  const fabTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasExitedRef = useRef(false);

  const displayName = userType === 'teacher' ? `Prof. ${teacherName}` : studentName || 'Aluno';

  // Verificar preferência de dicas no localStorage
  useEffect(() => {
    const tipsPreference = localStorage.getItem('hideTipsPanel');
    if (tipsPreference === 'true') {
      // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
      setTipsHidden(true);
      setShowTips(false);
    }
  }, []);

  // Criar sala e token usando API centralizada
  useEffect(() => {
    const initializeCall = async () => {
      try {
        // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
        setIsLoading(true);

        // Criar sala usando dailyAPI
        const roomData = await dailyAPI.createRoom({
          classId,
          className,
          expiryMinutes: 180 // 3 horas
        });

        if (!roomData.success) {
          throw new Error(roomData.message);
        }

        // Criar token usando dailyAPI
        const tokenData = await dailyAPI.createToken({
          classId,
          roomName: roomData.room.name,
          isOwner: userType === 'teacher',
          userName: displayName
        });

        if (!tokenData.success) {
          throw new Error(tokenData.message);
        }

        setRoomUrl(roomData.room.url);
        setToken(tokenData.token);

      } catch (error) {
        console.error('Erro ao inicializar chamada:', error);
        toast.error('Erro ao criar sala de vídeo');
        setIsLoading(false);
        onEnd();
      } finally {
        // Loading será desativado pelo evento 'loaded' do Daily
      }
    };

    initializeCall();

    return () => {
      // Cleanup
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
      }
    };
  }, [classId, className, displayName, userType]);

  // Inicializar Daily quando tivermos URL e token
  useEffect(() => {
    if (!roomUrl || !containerRef.current) return;

    hasExitedRef.current = false;

    const finalizeExit = (message: string) => {
      if (hasExitedRef.current) {
        return;
      }

      hasExitedRef.current = true;

      if (callFrameRef.current) {
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }

      toast.success(message);
      onEnd();
    };

    const initDaily = async () => {
      try {
        // Criar frame do Daily
        const callFrame = DailyIframe.createFrame(containerRef.current!, {
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '0'
          },
          showLeaveButton: false,
          showFullscreenButton: false
        });

        callFrameRef.current = callFrame;

        // Event listeners
        callFrame.on('loaded', () => {
          setIsLoading(false);
          toast.success('Sala de vídeo carregada!');
        });

        callFrame.on('joined-meeting', () => {
          toast.success('Conectado à aula ao vivo!');
        });

        callFrame.on('participant-joined', (event) => {
          if (event?.participant?.user_name) {
            toast(`${event.participant.user_name} entrou na aula`, { icon: '👋' });
          }
          updateParticipantCount(callFrame);
        });

        callFrame.on('participant-left', (event) => {
          if (event?.participant?.user_name) {
            toast(`${event.participant.user_name} saiu da aula`, { icon: '👋' });
          }
          updateParticipantCount(callFrame);
        });

        callFrame.on('left-meeting', () => {
          finalizeExit(userType === 'teacher' ? 'Aula finalizada com sucesso!' : 'Você saiu da aula.');
        });

        callFrame.on('error', (error) => {
          console.error('Daily error:', error);
          toast.error('Erro na videoconferência');
        });

        // Entrar na sala
        await callFrame.join({
          url: roomUrl,
          token: token || undefined,
          userName: displayName
        });

      } catch (error) {
        console.error('Erro ao inicializar Daily:', error);
        setIsLoading(false);
        toast.error('Erro ao conectar à sala');
      }
    };

    initDaily();
  }, [roomUrl, token, displayName, onEnd, userType]);

  const updateParticipantCount = (frame: ReturnType<typeof DailyIframe.createFrame>) => {
    const participants = frame.participants();
    setParticipantCount(Object.keys(participants).length);
  };

  const leaveCallFrame = useCallback(() => {
    if (!callFrameRef.current) {
      onEnd();
      return;
    }

    callFrameRef.current.leave().catch(() => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
      hasExitedRef.current = true;
      onEnd();
    });
  }, [onEnd]);

  const handleEndCall = useCallback(async () => {
    if (userType !== 'teacher') {
      leaveCallFrame();
      return;
    }

    try {
      await classesAPI.end(classId);
    } catch (error) {
      console.error('Erro ao encerrar aula no backend:', error);
      toast.error('A aula foi encerrada na sala, mas houve erro ao atualizar o status.');
    } finally {
      leaveCallFrame();
    }
  }, [classId, leaveCallFrame, userType]);

  // Handlers de FAB
  const handleFabMouseEnter = () => {
    if (fabTimeoutRef.current) {
      clearTimeout(fabTimeoutRef.current);
    }
    setFabVisible(true);
  };

  const handleFabMouseLeave = () => {
    fabTimeoutRef.current = setTimeout(() => {
      setFabVisible(false);
      setFabExpanded(false);
    }, 1000);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Esconder dicas permanentemente
  const hideTipsPermanently = () => {
    localStorage.setItem('hideTipsPanel', 'true');
    setTipsHidden(true);
    setShowTips(false);
  };

  // Enviar mensagem no chat interno
  const sendMessage = () => {
    if (!messageInput.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      sender: displayName,
      text: messageInput.trim(),
      time: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageInput('');
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden">
      {/* Main Video Container */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'mr-0' : 'mr-0 md:mr-80'}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900/90 to-purple-900/90 backdrop-blur-xl border-b border-indigo-500/20 px-6 py-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{className}</h1>
              <p className="text-sm text-indigo-300">
                {userType === 'teacher' ? 'Você está ensinando' : `Com ${teacherName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Participant count */}
            <div className="px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-full flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">{participantCount}</span>
            </div>

            {/* Live indicator */}
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Ao Vivo</span>
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>

            <button
              onClick={handleEndCall}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="hidden sm:inline">{userType === 'teacher' ? 'Encerrar' : 'Sair'}</span>
            </button>
          </div>
        </div>

        {/* Video Container */}
        <div className="flex-1 relative bg-slate-900">
          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full" />
                  <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">Carregando sala de aula...</p>
                  <p className="text-slate-400 text-sm mt-1">Preparando videoconferência</p>
                </div>
              </div>
            </div>
          )}

          {/* Daily.co iframe container */}
          <div ref={containerRef} className="w-full h-full" />
        </div>

        {/* Tips Panel (flutuante) */}
        {showTips && !tipsHidden && (
          <div className="absolute bottom-6 left-6 bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl px-5 py-4 shadow-2xl max-w-xs z-30 animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <p className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Dicas Rápidas</p>
              </div>
              <button
                onClick={() => setShowTips(false)}
                className="p-1 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">•</span>
                <span>Use a barra de ferramentas para controlar áudio e vídeo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">•</span>
                <span>Chat disponível na barra lateral</span>
              </li>
              {userType === 'teacher' && (
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>Você pode gravar e compartilhar sua tela</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">•</span>
                <span>Clique no botão vermelho para sair</span>
              </li>
            </ul>
            <button
              onClick={hideTipsPermanently}
              className="mt-3 text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              Não mostrar novamente
            </button>
          </div>
        )}
      </div>

      {/* Collapsible Sidebar */}
      <div
        className={`fixed md:relative right-0 top-0 h-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 flex flex-col z-40 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-80'
        } ${sidebarCollapsed ? 'translate-x-0' : ''}`}
      >
        {/* Sidebar Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all z-50 ${
            sidebarCollapsed ? 'rotate-180' : ''
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Sidebar Content */}
        {!sidebarCollapsed && (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white">Chat</h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="bg-slate-800/80 border border-slate-700 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-indigo-400">{msg.sender}</p>
                      <p className="text-xs text-slate-500">
                        {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className="text-sm text-white">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                >
                  Enviar
                </button>
              </div>
            </div>
          </>
        )}

        {/* Collapsed state - show icon only */}
        {sidebarCollapsed && (
          <div className="flex flex-col items-center py-4 gap-4">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="Abrir Chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <div
        className="fixed bottom-6 right-6 z-50"
        onMouseEnter={handleFabMouseEnter}
        onMouseLeave={handleFabMouseLeave}
        style={{ paddingRight: sidebarCollapsed ? '80px' : '340px' }}
      >
        {/* FAB Menu Items */}
        <div
          className={`flex flex-col gap-2 mb-2 transition-all duration-300 ${
            fabExpanded && fabVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          {userType === 'teacher' && (
            <>
              <button
                className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-white transition-all shadow-lg animate-in fade-in slide-in-from-bottom duration-200"
                style={{ animationDelay: '0ms' }}
                title="Compartilhar tela"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-white transition-all shadow-lg animate-in fade-in slide-in-from-bottom duration-200"
                style={{ animationDelay: '50ms' }}
                title="Levantar mão"
              >
                <Hand className="w-5 h-5" />
              </button>
            </>
          )}
          <button
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-white transition-all shadow-lg animate-in fade-in slide-in-from-bottom duration-200"
            style={{ animationDelay: '100ms' }}
            title="Configurações"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowTips(true)}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-white transition-all shadow-lg animate-in fade-in slide-in-from-bottom duration-200"
            style={{ animationDelay: '150ms' }}
            title="Ajuda"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Main FAB Button */}
        <button
          onClick={() => setFabExpanded(!fabExpanded)}
          onMouseEnter={() => setFabVisible(true)}
          className={`p-4 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white shadow-lg transition-all duration-300 ${
            fabVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-60'
          } ${fabExpanded ? 'rotate-45' : ''}`}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile overlay for sidebar */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
    </div>
  );
};

export default DailyLiveClass;
