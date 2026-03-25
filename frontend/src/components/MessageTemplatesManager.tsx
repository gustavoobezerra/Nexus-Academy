import { useEffect, useMemo, useState } from 'react';
import { Copy, Edit2, MessageSquare, Plus, Save, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationsAPI } from '../lib/api';
import type { NotificationTemplate } from '../types';

const categories = [
  { value: 'all', label: 'Todos' },
  { value: 'class_reminder', label: 'Aula' },
  { value: 'payment_reminder', label: 'Pagamento' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'report', label: 'Relatório' },
  { value: 'custom', label: 'Livre' }
];

const emptyTemplate: NotificationTemplate = {
  name: '',
  description: '',
  type: 'custom',
  channel: 'in_app',
  subject: '',
  body: '',
  variables: [],
  category: '',
  active: true
};

export const MessageTemplatesManager = () => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await notificationsAPI.getTemplates();
      setTemplates(Array.isArray(response.templates) ? response.templates : []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesSearch = !normalizedQuery || [
        template.name,
        template.description,
        template.subject,
        template.body
      ].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedQuery));
      const matchesCategory = selectedCategory === 'all'
        || template.type === selectedCategory
        || template.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, templates]);

  const openCreate = () => {
    setEditingTemplate({ ...emptyTemplate });
    setIsCreating(true);
  };

  const openEdit = (template: NotificationTemplate) => {
    setEditingTemplate({
      ...template,
      variables: Array.isArray(template.variables) ? template.variables : []
    });
    setIsCreating(false);
  };

  const closeEditor = () => {
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const persistTemplate = async () => {
    if (!editingTemplate) {
      return;
    }

    if (!editingTemplate.name.trim() || !editingTemplate.body.trim()) {
      toast.error('Preencha nome e mensagem');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...editingTemplate,
        variables: Array.isArray(editingTemplate.variables)
          ? editingTemplate.variables.filter(Boolean)
          : []
      };

      const response = isCreating
        ? await notificationsAPI.createTemplate(payload)
        : await notificationsAPI.updateTemplate(editingTemplate.id || editingTemplate._id || '', payload);

      if (isCreating) {
        setTemplates((currentTemplates) => [response.template, ...currentTemplates]);
        toast.success('Template criado!');
      } else {
        setTemplates((currentTemplates) =>
          currentTemplates.map((template) =>
            (template.id || template._id) === (response.template.id || response.template._id)
              ? response.template
              : template
          )
        );
        toast.success('Template atualizado!');
      }

      closeEditor();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!window.confirm('Deseja realmente excluir este template?')) {
      return;
    }

    try {
      await notificationsAPI.deleteTemplate(templateId);
      setTemplates((currentTemplates) =>
        currentTemplates.filter((template) => (template.id || template._id) !== templateId)
      );
      toast.success('Template excluído!');
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir template');
    }
  };

  const handleDuplicate = async (template: NotificationTemplate) => {
    try {
      const response = await notificationsAPI.createTemplate({
        ...template,
        name: `${template.name} (Cópia)`
      });
      setTemplates((currentTemplates) => [response.template, ...currentTemplates]);
      toast.success('Template duplicado!');
    } catch (error) {
      console.error('Erro ao duplicar template:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao duplicar template');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">Templates de Mensagens</p>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Mesma base de templates usada pelo Hub educacional e pelo centro de mensagens.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Template
        </button>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar templates..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {categories.map((category) => (
            <option key={category.value} value={category.value}>{category.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
          Carregando templates...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id || template._id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <MessageSquare size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 dark:text-white">{template.name}</h3>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-full">
                        {template.type}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                        {template.channel}
                      </span>
                      {!template.active ? (
                        <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs rounded-full">
                          Inativo
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => void handleDuplicate(template)}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    title="Duplicar"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => openEdit(template)}
                    className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  {!template.isDefault ? (
                    <button
                      onClick={() => void handleDelete(template.id || template._id || '')}
                      className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </div>
              </div>

              {template.subject ? (
                <div className="mb-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Assunto:</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{template.subject}</p>
                </div>
              ) : null}

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 mb-2">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap line-clamp-4">
                  {template.body}
                </p>
              </div>

              {template.variables.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Variáveis:</span>
                  {template.variables.map((variable) => (
                    <code key={variable} className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded">
                      {`{{${variable}}}`}
                    </code>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {editingTemplate ? (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {isCreating ? 'Novo Template' : 'Editar Template'}
              </h3>
              <button
                onClick={closeEditor}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome do Template</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(event) => setEditingTemplate({ ...editingTemplate, name: event.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Descrição</label>
                <input
                  type="text"
                  value={editingTemplate.description || ''}
                  onChange={(event) => setEditingTemplate({ ...editingTemplate, description: event.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo</label>
                  <select
                    value={editingTemplate.type}
                    onChange={(event) => setEditingTemplate({ ...editingTemplate, type: event.target.value as NotificationTemplate['type'] })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {categories.filter((category) => category.value !== 'all').map((category) => (
                      <option key={category.value} value={category.value}>{category.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Canal</label>
                  <select
                    value={editingTemplate.channel}
                    onChange={(event) => setEditingTemplate({ ...editingTemplate, channel: event.target.value as NotificationTemplate['channel'] })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="in_app">In-app</option>
                    <option value="email">E-mail</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="push">Push</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Assunto</label>
                <input
                  type="text"
                  value={editingTemplate.subject || ''}
                  onChange={(event) => setEditingTemplate({ ...editingTemplate, subject: event.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mensagem</label>
                <textarea
                  value={editingTemplate.body}
                  onChange={(event) => setEditingTemplate({ ...editingTemplate, body: event.target.value })}
                  rows={10}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  placeholder="Digite a mensagem aqui..."
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Variáveis úteis</p>
                <div className="flex flex-wrap gap-2">
                  {['studentName', 'parentName', 'className', 'classDate', 'classTime', 'amount', 'dueDate', 'teacherName'].map((variable) => (
                    <code key={variable} className="px-2 py-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400 text-xs rounded">
                      {`{{${variable}}}`}
                    </code>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-6 flex justify-end gap-3">
              <button
                onClick={closeEditor}
                className="px-6 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => void persistTemplate()}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? 'Salvando...' : isCreating ? 'Criar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare size={48} className="mx-auto text-slate-400 dark:text-slate-600 mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Nenhum template encontrado</p>
        </div>
      ) : null}
    </div>
  );
};

export default MessageTemplatesManager;
