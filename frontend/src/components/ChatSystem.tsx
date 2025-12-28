import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Users, Search, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';

interface Chat {
  _id: string;
  participants: Array<{
    type: string;
    name: string;
    email?: string;
    unreadCount: number;
  }>;
  relatedStudent?: {
    _id: string;
    name: string;
  };
  lastMessage?: {
    content: string;
    senderName: string;
    sentAt: string;
  };
  unreadMessages: number;
  updatedAt: string;
}

interface Message {
  _id: string;
  sender: {
    type: string;
    name: string;
  };
  content: string;
  messageType: string;
  createdAt: string;
  status: string;
}

export const ChatSystem = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat._id);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/chat/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages || []);
        // Marcar como lida
        await fetch(`${API_URL}/chat/${chatId}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedChat) return;

    const content = input.trim();
    setInput('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/chat/${selectedChat._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        loadChats(); // Atualizar lista de chats
      } else {
        toast.error(data.message || 'Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao conectar com o servidor');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return chat.participants.some(p => p.name.toLowerCase().includes(search)) ||
           chat.relatedStudent?.name.toLowerCase().includes(search) ||
           chat.lastMessage?.content.toLowerCase().includes(search);
  });

  return (
    <div className="h-full flex bg-slate-50 dark:bg-slate-900">
      {/* Sidebar - Lista de conversas */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Mensagens</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar conversas..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            />
          </div>
        </div>

        {/* Lista de chats */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <button
                key={chat._id}
                onClick={() => setSelectedChat(chat)}
                className={`w-full p-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left ${
                  selectedChat?._id === chat._id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {chat.relatedStudent?.name || chat.participants[0]?.name || 'Conversa'}
                      </p>
                      {chat.unreadMessages > 0 && (
                        <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {chat.unreadMessages}
                        </span>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                        {chat.lastMessage.content}
                      </p>
                    )}
                    {chat.lastMessage && (
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        {new Date(chat.lastMessage.sentAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Header do chat */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {selectedChat.relatedStudent?.name || selectedChat.participants[0]?.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedChat.participants[0]?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div
                  key={msg._id}
                  className={`flex ${msg.sender.type === 'teacher' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.sender.type === 'teacher'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      msg.sender.type === 'teacher' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-slate-500 dark:text-slate-400">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-sm mt-2">ou crie uma nova conversa com um aluno</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
