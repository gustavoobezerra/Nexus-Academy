import { useState, useEffect } from 'react';
import { MessageSquare, Edit2, Save, X, Plus, Trash2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { defaultTemplates, type MessageTemplate } from '../data/messageTemplates';

export const MessageTemplatesManager = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    const saved = localStorage.getItem('messageTemplates');
    if (saved) {
      setTemplates(JSON.parse(saved));
    } else {
      setTemplates(defaultTemplates);
      localStorage.setItem('messageTemplates', JSON.stringify(defaultTemplates));
    }
  };

  const saveTemplates = (newTemplates: MessageTemplate[]) => {
    localStorage.setItem('messageTemplates', JSON.stringify(newTemplates));
    setTemplates(newTemplates);
  };

  const handleSave = () => {
    if (!editingTemplate) return;

    if (!editingTemplate.name || !editingTemplate.body) {
      toast.error('Preencha nome e mensagem');
      return;
    }

    const updated = templates.map(t =>
      t.id === editingTemplate.id ? editingTemplate : t
    );

    saveTemplates(updated);
    setEditingTemplate(null);
    toast.success('Template atualizado!');
  };

  const handleCreate = () => {
    if (!editingTemplate) return;

    if (!editingTemplate.name || !editingTemplate.body) {
      toast.error('Preencha nome e mensagem');
      return;
    }

    const newTemplate = {
      ...editingTemplate,
      id: `custom_${Date.now()}`
    };

    saveTemplates([...templates, newTemplate]);
    setEditingTemplate(null);
    setIsCreating(false);
    toast.success('Template criado!');
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este template?')) {
      saveTemplates(templates.filter(t => t.id !== id));
      toast.success('Template excluído!');
    }
  };

  const handleDuplicate = (template: MessageTemplate) => {
    const duplicated = {
      ...template,
      id: `custom_${Date.now()}`,
      name: `${template.name} (Cópia)`
    };
    saveTemplates([...templates, duplicated]);
    toast.success('Template duplicado!');
  };

  const startEdit = (template: MessageTemplate) => {
    setEditingTemplate({ ...template });
    setIsCreating(false);
  };

  const startCreate = () => {
    setEditingTemplate({
      id: '',
      name: '',
      category: 'general',
      channel: 'whatsapp',
      body: '',
      variables: []
    });
    setIsCreating(true);
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.body.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'all', label: 'Todos' },
    { value: 'reminder', label: 'Lembretes' },
    { value: 'payment', label: 'Pagamentos' },
    { value: 'report', label: 'Relatórios' },
    { value: 'greeting', label: 'Saudações' },
    { value: 'general', label: 'Geral' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Templates de Mensagens</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Gerencie os modelos de mensagens automáticas do sistema</p>
        </div>
        <button
          onClick={startCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <MessageSquare size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-white">{template.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-full">
                      {template.category}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                      {template.channel}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDuplicate(template)}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Duplicar"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => startEdit(template)}
                  className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded transition-colors"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                {!template.id.startsWith('class_') && !template.id.startsWith('payment_') && !template.id.startsWith('birthday_') && (
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {template.subject && (
              <div className="mb-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Assunto:</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{template.subject}</p>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 mb-2">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap line-clamp-4">
                {template.body}
              </p>
            </div>

            {template.variables.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Variáveis:</span>
                {template.variables.map(v => (
                  <code key={v} className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded">
                    {`{{${v}}}`}
                  </code>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Editor Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {isCreating ? 'Novo Template' : 'Editar Template'}
              </h3>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setIsCreating(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nome do Template
                </label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Lembrete de Aula"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Categoria
                  </label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value as any })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="reminder">Lembrete</option>
                    <option value="payment">Pagamento</option>
                    <option value="report">Relatório</option>
                    <option value="greeting">Saudação</option>
                    <option value="general">Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Canal
                  </label>
                  <select
                    value={editingTemplate.channel}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, channel: e.target.value as any })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                    <option value="sms">SMS</option>
                    <option value="all">Todos</option>
                  </select>
                </div>
              </div>

              {editingTemplate.channel === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Assunto (E-mail)
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.subject || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Assunto do e-mail"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Mensagem
                </label>
                <textarea
                  value={editingTemplate.body}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  placeholder="Digite a mensagem aqui... Use {{variavel}} para inserir variáveis dinâmicas"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                  💡 Variáveis disponíveis:
                </p>
                <div className="flex flex-wrap gap-2">
                  {['studentName', 'parentName', 'className', 'classDate', 'classTime', 'amount', 'dueDate', 'teacherName', 'pixKey'].map(v => (
                    <code key={v} className="px-2 py-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400 text-xs rounded">
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setIsCreating(false);
                }}
                className="px-6 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={isCreating ? handleCreate : handleSave}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Save size={18} />
                {isCreating ? 'Criar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare size={48} className="mx-auto text-slate-400 dark:text-slate-600 mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Nenhum template encontrado</p>
        </div>
      )}
    </div>
  );
};

export default MessageTemplatesManager;
