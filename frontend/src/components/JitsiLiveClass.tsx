import { useState, useEffect } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { Users, Settings, Video } from 'lucide-react';
import toast from 'react-hot-toast';

interface JitsiLiveClassProps {
  classId: string;
  className: string;
  teacherName: string;
  studentName?: string;
  userType: 'teacher' | 'student';
  onEnd: () => void;
}

export const JitsiLiveClass = ({
  classId,
  className,
  teacherName,
  studentName,
  userType,
  onEnd
}: JitsiLiveClassProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [roomName, setRoomName] = useState('');

  useEffect(() => {
    // Configurar nome de exibição
    const name = userType === 'teacher' ? `Prof. ${teacherName}` : studentName || 'Aluno';
    // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
    setDisplayName(name);

    // Criar nome único da sala (baseado no classId)
    const uniqueRoomName = `nexus-academy-${classId}`;
    setRoomName(uniqueRoomName);

    toast.success(`Iniciando aula ao vivo: ${className}`);
  }, [classId, className, teacherName, studentName, userType]);

  const handleMeetingEnd = () => {
    toast.success('Aula finalizada com sucesso!');
    onEnd();
  };

  const handleApiReady = (externalApi: unknown) => {
    setIsLoading(false);

    // Adicionar event listeners
    externalApi.on('videoConferenceJoined', () => {
      toast.success('Conectado à aula ao vivo!');
    });

    externalApi.on('participantJoined', (participant: unknown) => {
      if (participant?.displayName) {
        toast(`${participant.displayName} entrou na aula`, {
          icon: '👋',
        });
      }
    });

    externalApi.on('participantLeft', (participant: unknown) => {
      if (participant?.displayName) {
        toast(`${participant.displayName} saiu da aula`, {
          icon: '👋',
        });
      }
    });

    externalApi.on('readyToClose', () => {
      handleMeetingEnd();
    });

    // Se for professor, configurações adicionais
    if (userType === 'teacher') {
      // Professor pode gravar a aula (funcionalidade nativa do Jitsi)
      try {
        externalApi.executeCommand('toggleRecording', {
          mode: 'file',
          shouldShare: false
        });
      } catch (e) {
        // Recording might not be enabled
        // Gravação não disponível neste contexto
      }
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col">
      {/* Header com informações da aula */}
      <div className="bg-gradient-to-r from-indigo-900/90 to-purple-900/90 backdrop-blur-xl border-b border-indigo-500/20 px-6 py-4 flex items-center justify-between shadow-2xl">
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
          <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.6)]"></div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Ao Vivo</span>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full"></div>
              <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
            </div>
            <div>
              <p className="text-white font-bold text-lg">Carregando sala de aula...</p>
              <p className="text-slate-400 text-sm mt-1">Preparando videoconferência</p>
            </div>
          </div>
        </div>
      )}

      {/* Jitsi Meet Integration */}
      <div className="flex-1 relative">
        {roomName && (
          <JitsiMeeting
            domain="meet.jit.si"
            roomName={roomName}
            configOverwrite={{
              startWithAudioMuted: false,
              startWithVideoMuted: false,
              disableModeratorIndicator: userType !== 'teacher',
              startScreenSharing: false,
              enableEmailInStats: false,
              enableWelcomePage: false,
              prejoinPageEnabled: false,
              subject: className,
              // Configurações visuais
              defaultLanguage: 'pt',
              // Desabilitar alguns recursos para simplificar
              disableDeepLinking: true,
              // Habilitar chat e outras features
              toolbarButtons: [
                'microphone',
                'camera',
                'closedcaptions',
                'desktop',
                'fullscreen',
                'fodeviceselection',
                'hangup',
                'chat',
                'recording',
                'livestreaming',
                'etherpad',
                'sharedvideo',
                'settings',
                'raisehand',
                'videoquality',
                'filmstrip',
                'stats',
                'shortcuts',
                'tileview',
                'download',
                'help',
              ],
            }}
            interfaceConfigOverwrite={{
              DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
              DISPLAY_WELCOME_PAGE_CONTENT: false,
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
              TOOLBAR_ALWAYS_VISIBLE: false,
              DEFAULT_REMOTE_DISPLAY_NAME: 'Participante',
              MOBILE_APP_PROMO: false,
              // Tema personalizado
              DEFAULT_BACKGROUND: '#020617',
            }}
            userInfo={{
              displayName: displayName,
              email: userType === 'teacher' ? `${teacherName.toLowerCase().replace(/\s+/g, '')}@nexusacademy.com` : '',
            }}
            onApiReady={handleApiReady}
            getIFrameRef={(iframeRef) => {
              iframeRef.style.height = '100%';
              iframeRef.style.width = '100%';
            }}
          />
        )}
      </div>

      {/* Informações adicionais (flutuante) */}
      <div className="absolute bottom-6 left-6 bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl px-4 py-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            {userType === 'teacher' ? (
              <Settings className="w-4 h-4 text-indigo-400" />
            ) : (
              <Video className="w-4 h-4 text-indigo-400" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {userType === 'teacher' ? 'Modo Professor' : 'Modo Aluno'}
            </p>
            <p className="text-sm text-white font-medium">{displayName}</p>
          </div>
        </div>
      </div>

      {/* Dicas rápidas (flutuante) */}
      <div className="absolute bottom-6 right-6 bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl px-4 py-3 shadow-2xl max-w-xs">
        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Dicas Rápidas</p>
        <ul className="text-xs text-slate-300 space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 mt-0.5">•</span>
            <span>Use a barra de ferramentas para controlar áudio e vídeo</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 mt-0.5">•</span>
            <span>Chat disponível no canto inferior direito</span>
          </li>
          {userType === 'teacher' && (
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">•</span>
              <span>Você pode gravar a aula clicando no botão de gravação</span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="text-indigo-400 mt-0.5">•</span>
            <span>Clique no telefone vermelho para sair da aula</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default JitsiLiveClass;
