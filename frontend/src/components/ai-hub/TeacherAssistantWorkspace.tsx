import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Lightbulb, RefreshCcw, Send, Sparkles, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/api.service';
import type { TeacherWorkspaceData } from '../../types';

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

type TeacherAssistantWorkspaceProps = {
  data: TeacherWorkspaceData;
};

/**
 * Assistente principal do professor.
 *
 * A UI mostra o status real do provider e opera sempre com fallback local
 * quando a IA externa não estiver saudável, evitando mensagens de erro bruto
 * no centro do AI Hub.
 */
export const TeacherAssistantWorkspace = ({ data }: TeacherAssistantWorkspaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [providerMode, setProviderMode] = useState<'live' | 'fallback'>(data.provider.mode);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    const response = await apiService.get<{ success: boolean; history?: Message[] }>('/ai/history');
    if (response.success && Array.isArray(response.history)) {
      setMessages(response.history);
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    const response = await apiService.get<{ success: boolean; suggestions?: Suggestion[] }>('/ai/suggestions');
    if (response.success) {
      setSuggestions(Array.isArray(response.suggestions) ? response.suggestions : []);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
    void loadSuggestions();
  }, [loadHistory, loadSuggestions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text) {
      return;
    }

    setInput('');
    setLoading(true);

    const localUserMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages((currentMessages) => [...currentMessages, localUserMessage]);

    try {
      const response = await apiService.post<{
        success: boolean;
        message: string;
        timestamp?: string;
        providerMode?: 'live' | 'fallback';
      }>('/ai/chat', { message: text });

      if (!response.success) {
        toast.error(response.message || 'Não foi possível enviar a mensagem.');
        return;
      }

      setProviderMode(response.providerMode || data.provider.mode);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'assistant',
          content: response.message,
          timestamp: response.timestamp || new Date().toISOString()
        }
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao conectar com o assistente.');
    } finally {
      setLoading(false);
    }
  }, [data.provider.mode, input]);

  const clearHistory = useCallback(async () => {
    try {
      await apiService.delete('/ai/history');
      setMessages([]);
      toast.success('Histórico do assistente limpo.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao limpar o histórico.');
    }
  }, []);

  return (
    <section className="grid gap-5 xl:grid-cols-[1.35fr,0.8fr]">
      <div className="nexus-panel rounded-[2rem] p-5 md:p-6">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="nexus-kicker">IA de ensino</p>
            <h2 className="mt-2 text-3xl leading-none">Assistente do professor</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
              Converse com o AI Hub usando o contexto real da sua base ativa. Se o provider externo falhar, o sistema continua respondendo com fallback local.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="nexus-chip">
              <Sparkles size={14} />
              {providerMode === 'live' ? 'Resposta ao vivo' : 'Fallback local'}
            </span>
            <button type="button" onClick={clearHistory} className="nexus-button-ghost">
              <Trash2 size={16} />
              Limpar
            </button>
          </div>
        </div>

        <div className="mt-5 flex max-h-[36rem] min-h-[36rem] flex-col overflow-hidden rounded-[1.8rem] border border-[var(--border-soft)] bg-[var(--surface-soft)]">
          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-lg text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(79,70,229,0.12)] text-[var(--brand-indigo)]">
                    <Bot size={24} />
                  </div>
                  <h3 className="mt-5 text-2xl">Faça uma pergunta operacional ou pedagógica.</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                    O assistente já considera alunos, grupos, pagamentos, planos e atividades recentes para responder.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={`${message.timestamp}-${index}`}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-[1.5rem] px-4 py-4 text-sm leading-6 ${
                        message.role === 'user'
                          ? 'bg-[var(--brand-indigo)] text-white'
                          : 'nexus-panel text-[var(--text-strong)]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className={`mt-2 text-xs ${message.role === 'user' ? 'text-indigo-100' : 'text-[var(--text-soft)]'}`}>
                        {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {loading ? (
                  <div className="flex justify-start">
                    <div className="nexus-panel rounded-[1.5rem] px-4 py-3 text-sm text-[var(--text-muted)]">
                      Processando contexto do professor...
                    </div>
                  </div>
                ) : null}

                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
            className="border-t border-[var(--border-soft)] p-4"
          >
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="nexus-input flex-1"
                placeholder="Ex: quais alunos merecem reforço esta semana?"
              />
              <button type="submit" disabled={loading || !input.trim()} className="nexus-button-primary disabled:opacity-50">
                <Send size={16} />
                Enviar
              </button>
            </div>
          </form>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="nexus-panel rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="nexus-kicker">Contexto carregado</p>
              <h3 className="mt-2 text-2xl leading-none">Resumo do seu workspace</h3>
            </div>
            <button type="button" onClick={() => void loadSuggestions()} className="nexus-button-ghost">
              <RefreshCcw size={16} />
              Atualizar
            </button>
          </div>

          <div className="mt-5 space-y-3">
            <div className="nexus-metric-card">
              <p className="text-sm font-semibold text-[var(--text-muted)]">Alunos ativos</p>
              <p className="nexus-metric-value mt-3">{data.counts.students}</p>
            </div>
            <div className="nexus-metric-card">
              <p className="text-sm font-semibold text-[var(--text-muted)]">Atividades carregadas</p>
              <p className="nexus-metric-value mt-3">{data.counts.activities}</p>
            </div>
          </div>
        </div>

        <div className="nexus-panel rounded-[2rem] p-6">
          <div className="flex items-center gap-3">
            <Lightbulb className="text-[var(--brand-indigo)]" size={18} />
            <div>
              <p className="nexus-kicker">Sugestões rápidas</p>
              <h3 className="mt-2 text-2xl leading-none">Ações que o hub recomenda agora</h3>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {suggestions.length === 0 ? (
              <div className="nexus-panel rounded-[1.4rem] px-4 py-5 text-sm text-[var(--text-muted)]">
                Nenhuma sugestão disponível no momento.
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.type}-${suggestion.title}`}
                  type="button"
                  onClick={() => void sendMessage(suggestion.message)}
                  className="nexus-panel w-full rounded-[1.4rem] px-4 py-4 text-left transition hover:border-[rgba(79,70,229,0.16)]"
                >
                  <p className="text-sm font-bold text-[var(--text-strong)]">{suggestion.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{suggestion.message}</p>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>
    </section>
  );
};

export default TeacherAssistantWorkspace;
