import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/api.service';
import { io, Socket } from 'socket.io-client';

interface Message {
  _id: string;
  sender: 'student' | 'teacher';
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
}

interface StudentChatProps {
  student: any;
  teacher: any;
  isDark: boolean;
}

export const StudentChat = ({ student, teacher, isDark }: StudentChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    initializeSocket();

    return () => {
      socket?.disconnect();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSocket = () => {
    const token = localStorage.getItem('studentToken');
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    
    const newSocket = io(socketUrl, {
      auth: {
        userId: student._id,
        userType: 'student',
        token
      }
    });

    newSocket.on('connect', () => {
      console.log('Socket conectado');
      // Entrar na sala de chat com o professor
      newSocket.emit('join-chat-room', {
        studentId: student._id,
        teacherId: teacher._id
      });
    });

    newSocket.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      // Marcar como lida se for mensagem do professor
      if (message.sender === 'teacher') {
        markAsRead(message._id);
      }
    });

    newSocket.on('message-read', ({ messageId }: { messageId: string }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId ? { ...msg, read: true } : msg
        )
      );
    });

    setSocket(newSocket);
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/portal/chat/messages?teacherId=${teacher._id}`) as any;
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      const response = await apiService.post('/portal/chat/send', {
        teacherId: teacher._id,
        content: newMessage,
        type: 'text'
      }) as any;

      // Emitir via socket para atualização em tempo real
      socket?.emit('send-message', {
        ...response.message,
        recipientId: teacher._id
      });

      setMessages(prev => [...prev, response.message]);
      setNewMessage('');
    } catch (error: unknown) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await apiService.post(`/portal/chat/mark-read/${messageId}`);
      socket?.emit('mark-read', { messageId, recipientId: teacher._id });
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB');
      return;
    }

    try {
      setSending(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('teacherId', teacher._id);

      const response = await apiService.upload('/portal/chat/upload', formData) as any;

      socket?.emit('send-message', {
        ...response.message,
        recipientId: teacher._id
      });

      setMessages(prev => [...prev, response.message]);
      toast.success('Arquivo enviado!');
    } catch (error: unknown) {
      console.error('Erro ao enviar arquivo:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar arquivo');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>Carregando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-slate-900' : 'bg-white'} rounded-xl shadow-lg overflow-hidden`}>
      {/* Chat Header */}
      <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} border-b p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {teacher.name?.charAt(0).toUpperCase() || 'P'}
            </span>
          </div>
          <div>
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {teacher.name || 'Professor'}
            </h3>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {socket?.connected ? '🟢 Online' : '⚪ Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors`}>
            <Phone size={20} className={isDark ? 'text-slate-400' : 'text-slate-600'} />
          </button>
          <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors`}>
            <Video size={20} className={isDark ? 'text-slate-400' : 'text-slate-600'} />
          </button>
          <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors`}>
            <MoreVertical size={20} className={isDark ? 'text-slate-400' : 'text-slate-600'} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} mb-2`}>
              Nenhuma mensagem ainda
            </p>
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Envie uma mensagem para começar a conversa!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`flex ${message.sender === 'student' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  message.sender === 'student'
                    ? 'bg-indigo-600 text-white'
                    : isDark
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-200 text-slate-800'
                }`}
              >
                {message.type === 'text' ? (
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                ) : message.type === 'image' ? (
                  <div>
                    <img src={message.fileUrl} alt="Imagem" className="rounded-lg max-w-full mb-2" />
                    {message.content && <p className="text-sm">{message.content}</p>}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Paperclip size={16} />
                    <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                      {message.fileName || 'Arquivo'}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs opacity-70">{formatTime(message.timestamp)}</span>
                  {message.sender === 'student' && (
                    <span className="text-xs opacity-70">
                      {message.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} border-t p-4`}>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors disabled:opacity-50`}
          >
            <Paperclip size={20} className={isDark ? 'text-slate-400' : 'text-slate-600'} />
          </button>
          <button
            disabled={sending}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors disabled:opacity-50`}
          >
            <ImageIcon size={20} className={isDark ? 'text-slate-400' : 'text-slate-600'} />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            placeholder="Digite sua mensagem..."
            className={`flex-1 px-4 py-3 rounded-xl ${
              isDark
                ? 'bg-slate-900 text-white placeholder-slate-500'
                : 'bg-white text-slate-800 placeholder-slate-400'
            } border ${isDark ? 'border-slate-700' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50`}
          />
          <button
            disabled={sending}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors disabled:opacity-50`}
          >
            <Smile size={20} className={isDark ? 'text-slate-400' : 'text-slate-600'} />
          </button>
          <button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send size={18} />
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentChat;
