import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Clock3,
  Loader2,
  MessageSquare,
  RefreshCw,
  SendHorizonal,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationsAPI, studentsAPI } from '../lib/api';
import { SearchableSelect, type SearchableOption } from './ui/SearchableSelect';
import type { Aluno, Notification, NotificationTemplate } from '../types';

type NotificationComposer = {
  recipientId: string;
  templateId: string;
  channel: Notification['channel'];
  type: NotificationTemplate['type'];
  title: string;
  subject: string;
  message: string;
  scheduledFor: string;
};

const initialComposer: NotificationComposer = {
  recipientId: '',
  templateId: '',
  channel: 'in_app',
  type: 'custom',
  title: '',
  subject: '',
  message: '',
  scheduledFor: ''
};

const getStatusTone = (status: Notification['status']) => {
  switch (status) {
    case 'read':
      return 'bg-slate-500/15 text-slate-300';
    case 'delivered':
    case 'sent':
      return 'bg-emerald-500/15 text-emerald-300';
    case 'scheduled':
      return 'bg-cyan-500/15 text-cyan-300';
    case 'failed':
      return 'bg-rose-500/15 text-rose-300';
    default:
      return 'bg-amber-500/15 text-amber-300';
  }
};

const getStatusLabel = (status: Notification['status']) => {
  switch (status) {
    case 'delivered':
      return 'Entregue';
    case 'scheduled':
      return 'Agendada';
    case 'sent':
      return 'Enviada';
    case 'read':
      return 'Lida';
    case 'failed':
      return 'Falhou';
    default:
      return 'Pendente';
  }
};

const formatDateTimeLocal = (value?: string) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

const AutomationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [students, setStudents] = useState<Aluno[]>([]);
  const [composer, setComposer] = useState<NotificationComposer>(initialComposer);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notificationsResponse, templatesResponse, studentsResponse] = await Promise.all([
        notificationsAPI.getAll({ status: 'all', limit: 20 }),
        notificationsAPI.getTemplates(),
        studentsAPI.getAll()
      ]);

      setNotifications(Array.isArray(notificationsResponse.notifications) ? notificationsResponse.notifications : []);
      setTemplates(Array.isArray(templatesResponse.templates) ? templatesResponse.templates : []);
      setStudents(Array.isArray(studentsResponse.students) ? studentsResponse.students : []);
    } catch (error) {
      console.error('Erro ao carregar centro de mensagens:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar centro de mensagens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const studentOptions = useMemo<SearchableOption[]>(
    () => students.map((student) => ({
      id: student._id || student.id || '',
      label: student.name,
      description: student.email || student.phone || 'Aluno sem contato principal',
      meta: [student.grade, student.subject].filter(Boolean).join(' • '),
      group: 'Alunos',
      recent: Boolean(student.createdAt),
      keywords: [student.name, student.email, student.subject, student.grade].filter(Boolean) as string[]
    })),
    [students]
  );

  const templateOptions = useMemo<SearchableOption[]>(
    () => templates.map((template) => ({
      id: template.id || template._id || '',
      label: template.name,
      description: template.subject || template.body,
      meta: [template.type, template.channel].filter(Boolean).join(' • '),
      group: 'Templates',
      keywords: [template.name, template.type, template.body, template.subject].filter(Boolean) as string[]
    })),
    [templates]
  );

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((item) => (item.id || item._id) === templateId);
    if (!template) {
      setComposer((currentComposer) => ({
        ...currentComposer,
        templateId
      }));
      return;
    }

    setComposer((currentComposer) => ({
      ...currentComposer,
      templateId,
      channel: template.channel,
      type: template.type,
      title: template.subject || currentComposer.title || template.name,
      subject: template.subject || '',
      message: template.body
    }));
  };

  const handleSend = async () => {
    if (!composer.recipientId || !composer.title.trim() || !composer.message.trim()) {
      toast.error('Selecione o aluno e preencha título e mensagem.');
      return;
    }

    setSending(true);
    try {
      const response = await notificationsAPI.send({
        recipientId: composer.recipientId,
        channel: composer.channel,
        type: composer.type,
        title: composer.title,
        subject: composer.subject || composer.title,
        message: composer.message,
        scheduledFor: composer.scheduledFor || undefined
      });

      setNotifications((currentNotifications) => [response.notification, ...currentNotifications]);
      setComposer(initialComposer);
      toast.success(response.notification.status === 'scheduled' ? 'Mensagem agendada.' : 'Mensagem enviada.');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Bell className="text-cyan-400" size={28} />
            <p className="text-4xl font-bold text-indigo-300">Centro de Mensagens</p>
          </div>
          <p className="mt-3 text-gray-400">
            Notificações reais, templates reutilizáveis e envio direto para o aluno.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Atualizar
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.08fr,0.92fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-800/80 p-6 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Mensagens recentes</h2>
              <p className="mt-2 text-sm text-slate-400">
                Tudo o que foi enviado, agendado ou lido pelo ecossistema do professor.
              </p>
            </div>
            <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200">
              {notifications.filter((notification) => notification.status === 'pending' || notification.status === 'scheduled').length} em aberto
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              <div className="flex min-h-[14rem] items-center justify-center">
                <Loader2 className="animate-spin text-indigo-400" size={24} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-400">
                Nenhuma mensagem registrada ainda.
              </div>
            ) : (
              notifications.map((notification) => (
                <article
                  key={notification.id || notification._id}
                  className={`rounded-xl border p-4 ${
                    !notification.readAt && notification.channel === 'in_app'
                      ? 'border-rose-500/30 bg-rose-500/10'
                      : 'border-slate-700 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{notification.title}</p>
                        {!notification.readAt && notification.channel === 'in_app' ? (
                          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_6px_rgba(239,68,68,0.12)]" />
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{notification.message}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                        <span>{notification.channel}</span>
                        {notification.recipientName ? <span>• {notification.recipientName}</span> : null}
                        {notification.scheduledFor ? (
                          <span>• {new Date(notification.scheduledFor).toLocaleString('pt-BR')}</span>
                        ) : null}
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(notification.status)}`}>
                      {getStatusLabel(notification.status)}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-800/80 p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <Sparkles className="text-indigo-300" size={18} />
            <div>
              <h2 className="text-2xl font-bold">Nova mensagem</h2>
              <p className="mt-2 text-sm text-slate-400">
                Use um template pronto ou escreva uma comunicação manual para o aluno.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <SearchableSelect
              label="Aluno"
              value={composer.recipientId}
              onChange={(recipientId) => setComposer((currentComposer) => ({
                ...currentComposer,
                recipientId
              }))}
              options={studentOptions}
              placeholder="Buscar aluno por nome, email ou série..."
              emptyLabel="Nenhum aluno encontrado."
              helperText="Selecione quem vai receber a mensagem."
            />

            <SearchableSelect
              label="Template (opcional)"
              value={composer.templateId}
              onChange={handleTemplateSelect}
              options={templateOptions}
              placeholder="Buscar template por nome ou assunto..."
              emptyLabel="Nenhum template disponível."
              helperText="Ao selecionar um template, o texto é aplicado no formulário abaixo."
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Canal</label>
                <select
                  value={composer.channel}
                  onChange={(event) => setComposer((currentComposer) => ({
                    ...currentComposer,
                    channel: event.target.value as Notification['channel']
                  }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
                >
                  <option value="in_app">In-app</option>
                  <option value="email">E-mail</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="push">Push</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Agendar para</label>
                <div className="relative">
                  <Clock3 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="datetime-local"
                    value={formatDateTimeLocal(composer.scheduledFor)}
                    onChange={(event) => setComposer((currentComposer) => ({
                      ...currentComposer,
                      scheduledFor: event.target.value
                    }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-11 pr-4 text-white outline-none transition focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Título</label>
              <input
                value={composer.title}
                onChange={(event) => setComposer((currentComposer) => ({
                  ...currentComposer,
                  title: event.target.value
                }))}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
                placeholder="Ex: Revisão da aula de amanhã"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Assunto interno</label>
              <input
                value={composer.subject}
                onChange={(event) => setComposer((currentComposer) => ({
                  ...currentComposer,
                  subject: event.target.value
                }))}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
                placeholder="Assunto complementar para o template."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Mensagem</label>
              <textarea
                value={composer.message}
                onChange={(event) => setComposer((currentComposer) => ({
                  ...currentComposer,
                  message: event.target.value
                }))}
                rows={6}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
                placeholder="Escreva a mensagem que o aluno vai receber."
              />
            </div>

            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
              {composer.scheduledFor ? 'Agendar mensagem' : 'Enviar mensagem'}
            </button>

            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-xs leading-6 text-slate-400">
              Os templates desta tela são os mesmos usados no Hub educacional. Mensagens in-app aparecem com destaque visual no portal do aluno.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AutomationCenter;
