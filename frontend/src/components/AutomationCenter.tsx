import React, { useState, useEffect } from 'react';
import { Bell, Send, Clock, CheckCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';
import apiService from '../services/api.service';
import type { Notification, NotificationTemplate } from '../types';
import toast from 'react-hot-toast';

const AutomationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<'notifications' | 'templates' | 'schedule'>('notifications');
  const [loading, setLoading] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showNotificationForm, setShowNotificationForm] = useState(false);

  const [newTemplate, setNewTemplate] = useState({ name: '', type: 'reminder' as const, subject: '', body: '' });
  const [newNotification, setNewNotification] = useState({
    type: 'reminder' as const,
    channel: 'email' as const,
    recipientId: '',
    title: '',
    message: '',
    scheduledFor: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [notifRes, templateRes] = await Promise.all([
        apiService.get<{ notifications: Notification[] }>('/notifications'),
        apiService.get<{ templates: NotificationTemplate[] }>('/notifications/templates')
      ]);
      setNotifications(notifRes.notifications || []);
      setTemplates(templateRes.templates || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.body) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      const response = await apiService.post<{ template: NotificationTemplate }>('/notifications/templates', newTemplate);
      setTemplates(prev => [...prev, response.template]);
      setNewTemplate({ name: '', type: 'reminder', subject: '', body: '' });
      setShowTemplateForm(false);
      toast.success('Template criado com sucesso!');
    } catch (_error) {
      toast.error('Erro ao criar template');
    }
  };

  const handleScheduleNotification = async () => {
    if (!newNotification.recipientId || !newNotification.title || !newNotification.message) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const response = await apiService.post<{ notification: Notification }>('/notifications/send', newNotification);
      setNotifications(prev => [response.notification, ...prev]);
      setNewNotification({
        type: 'reminder',
        channel: 'email',
        recipientId: '',
        title: '',
        message: '',
        scheduledFor: ''
      });
      setShowNotificationForm(false);
      toast.success('Notificação agendada!');
    } catch (_error) {
      toast.error('Erro ao agendar notificação');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await apiService.delete(`/notifications/templates/${templateId}`);
      setTemplates(templates.filter(t => t.id !== templateId));
      toast.success('Template removido');
    } catch (_error) {
      toast.error('Erro ao remover template');
    }
  };

  if (loading) {
    return <div className="text-white p-8">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="text-cyan-400" size={28} />
          <h1 className="text-4xl font-bold text-indigo-400">Centro de Automação</h1>
        </div>
        <p className="text-gray-400">Gerencie notificações, templates e lembretes automáticos</p>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap">
        {(['notifications', 'templates', 'schedule'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
          >
            {tab === 'notifications' && '📬 Notificações'}
            {tab === 'templates' && '📋 Templates'}
            {tab === 'schedule' && '⏰ Agendar'}
          </button>
        ))}
      </div>

      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Notificações Recentes</h2>
              <span className="text-sm text-gray-400">
                {notifications.filter(n => n.status === 'pending').length} pendentes
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-gray-400">Nenhuma notificação ainda</p>
              ) : (
                notifications.slice(0, 10).map((notif) => (
                  <div
                    key={notif.id}
                    className={`border rounded-lg p-4 ${
                      notif.status === 'sent'
                        ? 'bg-slate-700/30 border-emerald-700'
                        : notif.status === 'pending'
                          ? 'bg-slate-700/30 border-amber-700'
                          : 'bg-slate-700/30 border-rose-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-white">{notif.title}</h4>
                          {notif.status === 'sent' && (
                            <CheckCircle className="text-emerald-400" size={16} />
                          )}
                          {notif.status === 'pending' && (
                            <Clock className="text-amber-400" size={16} />
                          )}
                          {notif.status === 'failed' && (
                            <AlertCircle className="text-rose-400" size={16} />
                          )}
                        </div>
                        <p className="text-sm text-gray-300 mb-2">{notif.message}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>📧 {notif.channel}</span>
                          <span>👤 {notif.recipientName}</span>
                          {notif.scheduledFor && <span>🕐 {notif.scheduledFor}</span>}
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          notif.status === 'sent'
                            ? 'bg-emerald-900 text-emerald-300'
                            : notif.status === 'pending'
                              ? 'bg-amber-900 text-amber-300'
                              : 'bg-rose-900 text-rose-300'
                        }`}
                      >
                        {notif.status === 'sent' && 'Enviado'}
                        {notif.status === 'pending' && 'Pendente'}
                        {notif.status === 'failed' && 'Falhou'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-6">
          <button
            onClick={() => setShowTemplateForm(!showTemplateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition"
          >
            <Plus size={20} />
            Novo Template
          </button>

          {showTemplateForm && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Criar Novo Template</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nome do template"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <select
                  value={newTemplate.type}
                  onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="reminder">Lembrete de Aula</option>
                  <option value="payment">Alerta de Pagamento</option>
                  <option value="confirmation">Confirmação de Presença</option>
                  <option value="feedback">Solicitação de Feedback</option>
                </select>
                <input
                  type="text"
                  placeholder="Assunto"
                  value={newTemplate.subject}
                  onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <textarea
                  placeholder="Corpo da mensagem (use {{studentName}}, {{className}}, etc)"
                  value={newTemplate.body}
                  onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateTemplate}
                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition"
                  >
                    Criar Template
                  </button>
                  <button
                    onClick={() => setShowTemplateForm(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-white">{template.name}</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      {template.type === 'reminder' && '🔔 Lembrete'}
                      {template.type === 'payment' && '💳 Pagamento'}
                      {template.type === 'confirmation' && '✅ Confirmação'}
                      {template.type === 'feedback' && '⭐ Feedback'}
                    </p>
                  </div>
                  <button
                    onClick={() => template.id && handleDeleteTemplate(template.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <p className="text-sm text-gray-300 mb-3">{template.subject}</p>
                <p className="text-xs text-gray-400 line-clamp-2">{template.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-6">Agendar Notificação</h2>
          <button
            onClick={() => setShowNotificationForm(!showNotificationForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition mb-6"
          >
            <Send size={20} />
            {showNotificationForm ? 'Cancelar' : 'Nova Notificação'}
          </button>

          {showNotificationForm && (
            <div className="bg-slate-700/50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Tipo</label>
                  <select
                    value={newNotification.type}
                    onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value as any })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="reminder">Lembrete</option>
                    <option value="payment">Pagamento</option>
                    <option value="confirmation">Confirmação</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Canal</label>
                  <select
                    value={newNotification.channel}
                    onChange={(e) => setNewNotification({ ...newNotification, channel: e.target.value as any })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="in_app">In-App</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm text-gray-400 block mb-2">Aluno (ID)</label>
                <input
                  type="text"
                  placeholder="student_1"
                  value={newNotification.recipientId}
                  onChange={(e) => setNewNotification({ ...newNotification, recipientId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="mb-4">
                <label className="text-sm text-gray-400 block mb-2">Assunto</label>
                <input
                  type="text"
                  placeholder="Lembrete da aula de amanhã"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="mb-4">
                <label className="text-sm text-gray-400 block mb-2">Mensagem</label>
                <textarea
                  placeholder="Escreva a mensagem aqui"
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="mb-6">
                <label className="text-sm text-gray-400 block mb-2">Agendar para (opcional)</label>
                <input
                  type="datetime-local"
                  value={newNotification.scheduledFor}
                  onChange={(e) => setNewNotification({ ...newNotification, scheduledFor: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleScheduleNotification}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition"
              >
                Agendar Notificação
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutomationCenter;
