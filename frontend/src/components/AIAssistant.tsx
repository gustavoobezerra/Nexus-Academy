import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User, Sparkles, Trash2, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../services/api.service';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Suggestion {
  type: string;
  title: string;
  message: string;
  action: string;
}

export const AIAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await apiService.get<any>('/ai-assistant/history');
      if (data.success && data.history) {
        setMessages(data.history);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    try {
      const data = await apiService.get<any>('/ai-assistant/suggestions');
      if (data.success) {
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    loadSuggestions();
  }, [loadHistory, loadSuggestions]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text) return;

    setInput('');
    setLoading(true);
    setShowSuggestions(false);

    // Adicionar mensagem do usuário
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const data = await apiService.post<any>('/ai-assistant/chat', { message: text });

      if (data.success) {
        const aiMessage: Message = {
          role: 'assistant',
          content: data.message,
          timestamp: data.timestamp || new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        toast.error(data.message || 'Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await apiService.delete('/ai-assistant/history');
      setMessages([]);
      toast.success('Histórico limpo');
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Assistente IA
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pergunte sobre alunos, aulas, pagamentos e muito mais
              </p>
            </div>
          </div>
          <button
            onClick={clearHistory}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
            title="Limpar histórico"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && showSuggestions && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-4">
              <Lightbulb className="w-5 h-5" />
              <span className="font-medium">Sugestões rápidas:</span>
            </div>
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(suggestion.message)}
                className="w-full text-left p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {suggestion.title}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {suggestion.message}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            {suggestions.length === 0 && (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Faça uma pergunta para começar!</p>
                <p className="text-xs mt-2">Ex: "Como está o desempenho dos meus alunos?"</p>
              </div>
            )}
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-4 ${msg.role === 'user'
                ? 'bg-indigo-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'
                }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                }`}>
                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            {msg.role === 'user' && (
              <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte algo ao assistente..."
            className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
