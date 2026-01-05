import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, MessageSquare, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAudioTranscription } from '../hooks/useAudioTranscription';
import { liveClassAPI } from '../lib/api';

interface IntegratedLiveClassProps {
  sessionId: string;
  userType: 'teacher' | 'student';
  userId: string;
  onEnd: () => void;
}

export const IntegratedLiveClass = ({
  sessionId,
  userType,
  userId,
  onEnd
}: IntegratedLiveClassProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [messages, setMessages] = useState<Array<{ id: string; sender: string; message: string; timestamp: Date }>>([]);
  const [messageInput, setMessageInput] = useState('');
  const [transcript, setTranscript] = useState('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const { transcript: audioTranscript, startListening } = useAudioTranscription();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'; // Para Socket.IO

  useEffect(() => {
    // Conectar Socket.IO
    const newSocket = io(API_URL, {
      auth: { userId, userType }
    });

    newSocket.on('connect', () => {
      // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
      setIsConnected(true);
      newSocket.emit('join-live-class', { sessionId, userType, userId });
      initializeWebRTC(newSocket);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('participant-joined', ({ userId: joinedUserId }) => {
      setParticipants(prev => [...prev, joinedUserId]);
      toast.success('Participante entrou na aula');
    });

    newSocket.on('webrtc-offer', async ({ offer, from }) => {
      await handleOffer(offer, from, newSocket);
    });

    newSocket.on('webrtc-answer', async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    newSocket.on('webrtc-ice-candidate', async ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    newSocket.on('recording-toggled', ({ enabled }) => {
      setIsRecording(enabled);
      if (enabled) {
        startRecording();
      } else {
        stopRecording();
      }
    });

    newSocket.on('transcript-updated', ({ transcript: newTranscript }) => {
      setTranscript(newTranscript);
    });

    newSocket.on('new-message', ({ message, sender, timestamp }) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender,
        message,
        timestamp: new Date(timestamp)
      }]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [sessionId, userId, userType]);

  const initializeWebRTC = async (socket: Socket) => {
    try {
      // Obter stream local
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Criar peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Adicionar tracks locais
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Receber tracks remotos
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            sessionId,
            candidate: event.candidate,
            targetId: participants[0] || 'all'
          });
        }
      };

      peerConnectionRef.current = pc;

      // Se for professor, criar offer
      if (userType === 'teacher') {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', {
          sessionId,
          offer,
          targetId: 'all'
        });
      }

      // Iniciar transcrição
      startListening();
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      toast.error('Erro ao acessar câmera/microfone');
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, from: string, socket: Socket) => {
    if (!peerConnectionRef.current) return;

    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);

    socket.emit('webrtc-answer', {
      sessionId,
      answer,
      targetId: from
    });
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const startRecording = () => {
    // TODO: Implementar gravação usando MediaRecorder API
    toast.success('Gravação iniciada');
  };

  const stopRecording = () => {
    // TODO: Parar gravação e salvar
    toast.success('Gravação finalizada');
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !socket) return;

    socket.emit('class-message', {
      sessionId,
      message: messageInput,
      sender: userType === 'teacher' ? 'Professor' : 'Aluno'
    });

    setMessageInput('');
  };

  const endClass = async () => {
    try {
      // Usar API centralizada
      await liveClassAPI.end(sessionId);

      // Atualizar transcrição
      if (socket && audioTranscript) {
        socket.emit('update-transcript', {
          sessionId,
          transcript: audioTranscript
        });
      }

      toast.success('Aula finalizada com sucesso');
      onEnd();
    } catch (error) {
      console.error('Error ending class:', error);
      // Erro já tratado pelo interceptor, mas adicionando fallback
      toast.error('Erro ao finalizar aula');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full shadow-inner ${isConnected ? 'bg-emerald-400' : 'bg-red-500'}`}></div>
          <h2 className="text-lg font-bold tracking-tight">Aula Ao Vivo</h2>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users className="w-4 h-4" />
            <span>{participants.length + 1} participantes</span>
          </div>
        </div>
        {userType === 'teacher' && (
          <button
            onClick={endClass}
            className="px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 hover:brightness-110 rounded-lg flex items-center gap-2 shadow-md"
          >
            <PhoneOff className="w-4 h-4" />
            Finalizar Aula
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 flex flex-col p-4">
          <div className="flex-1 relative bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute bottom-4 right-4 w-48 h-36 bg-slate-800/80 rounded-xl overflow-hidden border border-slate-600 shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4 bg-rose-600/90 px-3 py-1 rounded-full flex items-center gap-2 shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Gravando</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full border border-slate-700 shadow-md transition ${isAudioEnabled ? 'bg-slate-800 hover:bg-slate-700' : 'bg-rose-600 hover:bg-rose-700'}`}
            >
              {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full border border-slate-700 shadow-md transition ${isVideoEnabled ? 'bg-slate-800 hover:bg-slate-700' : 'bg-rose-600 hover:bg-rose-700'}`}
            >
              {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            {userType === 'teacher' && (
              <button
                onClick={() => {
                  setIsRecording(!isRecording);
                  if (socket) {
                    socket.emit('toggle-recording', { sessionId, enabled: !isRecording });
                  }
                }}
                className={`p-3 rounded-full border border-slate-700 shadow-md transition ${isRecording ? 'bg-rose-600' : 'bg-slate-800 hover:bg-slate-700'}`}
              >
                <Save className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-slate-900/80 border-l border-slate-800 flex flex-col backdrop-blur-xl">
          {/* Chat */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <h3 className="font-bold">Chat</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map(msg => (
                <div key={msg.id} className="bg-slate-800/80 border border-slate-700 p-2 rounded-lg shadow-sm">
                  <p className="text-xs text-slate-400 mb-1">{msg.sender}</p>
                  <p className="text-sm">{msg.message}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Digite uma mensagem..."
                className="flex-1 px-3 py-2 bg-slate-700 rounded-lg text-white text-sm"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 rounded-lg shadow-md"
              >
                Enviar
              </button>
            </div>
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="border-t border-slate-800 p-4 max-h-40 overflow-y-auto bg-slate-900/70">
              <h4 className="text-xs font-bold text-slate-400 mb-2">TRANSCRIÇÃO</h4>
              <p className="text-xs text-slate-300">{transcript}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
