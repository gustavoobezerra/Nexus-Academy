import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Sparkles, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Aluno, HourBank } from '../types';

interface StudentGroup {
  id: string;
  name: string;
  studentIds: string[];
  color: string;
  description?: string;
  createdAt: string;
  suggestedByAI?: boolean;
}

interface StudentGroupsManagerProps {
  students?: Aluno[];
  hourBanks?: HourBank[];
}

export const StudentGroupsManager: React.FC<StudentGroupsManagerProps> = ({
  students = [],
  hourBanks = []
}) => {
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<StudentGroup[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    color: '#6366f1',
    studentIds: [] as string[]
  });
  const [activeTab, setActiveTab] = useState<'my-groups' | 'ai-suggestions'>('my-groups');

  const colors = [
    { name: 'Índigo', value: '#6366f1' },
    { name: 'Roxo', value: '#a855f7' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Vermelho', value: '#ef4444' },
    { name: 'Laranja', value: '#f97316' },
    { name: 'Amarelo', value: '#eab308' },
    { name: 'Verde', value: '#22c55e' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Cyan', value: '#06b6d4' },
  ];

  useEffect(() => {
    generateAISuggestions();
  }, [students, hourBanks]);

  const generateAISuggestions = () => {
    if (students.length === 0) return;

    // Simular análise de IA - em produção seria chamada à API
    const suggestions: StudentGroup[] = [];

    // 1. Agrupar por banco de horas semelhante
    const studentsWithHours = students.map(student => {
      const hourBank = hourBanks.find(hb => hb.student === student._id);
      return {
        student,
        hoursRemaining: hourBank?.hoursRemaining || 0
      };
    });

    // Grupo: Horas Baixas (< 5 horas)
    const lowHoursStudents = studentsWithHours
      .filter(s => s.hoursRemaining > 0 && s.hoursRemaining < 5)
      .map(s => s.student._id || '');

    if (lowHoursStudents.length >= 2) {
      suggestions.push({
        id: 'ai_low_hours',
        name: '⏰ Banco de Horas Baixo',
        studentIds: lowHoursStudents,
        color: '#ef4444',
        description: 'Alunos com menos de 5 horas restantes. Ideal para enviar lembretes de renovação.',
        createdAt: new Date().toISOString(),
        suggestedByAI: true
      });
    }

    // Grupo: Horas Médias (5-15 horas)
    const mediumHoursStudents = studentsWithHours
      .filter(s => s.hoursRemaining >= 5 && s.hoursRemaining <= 15)
      .map(s => s.student._id || '');

    if (mediumHoursStudents.length >= 2) {
      suggestions.push({
        id: 'ai_medium_hours',
        name: '📊 Banco de Horas Médio',
        studentIds: mediumHoursStudents,
        color: '#f97316',
        description: 'Alunos com 5-15 horas. Perfil estável de consumo.',
        createdAt: new Date().toISOString(),
        suggestedByAI: true
      });
    }

    // Grupo: Horas Altas (> 15 horas)
    const highHoursStudents = studentsWithHours
      .filter(s => s.hoursRemaining > 15)
      .map(s => s.student._id || '');

    if (highHoursStudents.length >= 2) {
      suggestions.push({
        id: 'ai_high_hours',
        name: '✨ Banco de Horas Alto',
        studentIds: highHoursStudents,
        color: '#22c55e',
        description: 'Alunos com mais de 15 horas. Comprometimento alto.',
        createdAt: new Date().toISOString(),
        suggestedByAI: true
      });
    }

    // 2. Agrupar por status de pagamento
    const paidStudents = students
      .filter(s => s.paymentStatus === 'paid')
      .map(s => s._id || '');

    if (paidStudents.length >= 3) {
      suggestions.push({
        id: 'ai_paid',
        name: '💰 Pagamentos em Dia',
        studentIds: paidStudents,
        color: '#22c55e',
        description: 'Alunos com pagamentos regularizados. Ótimo para enviar conteúdo premium.',
        createdAt: new Date().toISOString(),
        suggestedByAI: true
      });
    }

    const pendingStudents = students
      .filter(s => s.paymentStatus === 'pending' || s.paymentStatus === 'late')
      .map(s => s._id || '');

    if (pendingStudents.length >= 2) {
      suggestions.push({
        id: 'ai_pending',
        name: '⚠️ Pagamentos Pendentes',
        studentIds: pendingStudents,
        color: '#eab308',
        description: 'Alunos com pagamentos atrasados. Envie lembretes personalizados.',
        createdAt: new Date().toISOString(),
        suggestedByAI: true
      });
    }

    // 3. Agrupar por série/ano
    const gradeGroups = students.reduce((acc, student) => {
      const grade = student.grade || 'Sem série';
      if (!acc[grade]) acc[grade] = [];
      acc[grade].push(student._id || '');
      return acc;
    }, {} as Record<string, string[]>);

    Object.entries(gradeGroups).forEach(([grade, studentIds]) => {
      if (studentIds.length >= 2) {
        suggestions.push({
          id: `ai_grade_${grade}`,
          name: `📚 ${grade}`,
          studentIds,
          color: '#3b82f6',
          description: `Alunos do ${grade}. Conteúdo homogêneo facilita atividades em grupo.`,
          createdAt: new Date().toISOString(),
          suggestedByAI: true
        });
      }
    });

    setAiSuggestions(suggestions);
  };

  const handleCreateGroup = () => {
    if (!newGroup.name.trim()) {
      toast.error('Digite um nome para o grupo');
      return;
    }

    if (newGroup.studentIds.length === 0) {
      toast.error('Selecione pelo menos um aluno');
      return;
    }

    const group: StudentGroup = {
      id: `group_${Date.now()}`,
      name: newGroup.name,
      description: newGroup.description,
      studentIds: newGroup.studentIds,
      color: newGroup.color,
      createdAt: new Date().toISOString()
    };

    setGroups([...groups, group]);
    toast.success(`Grupo "${newGroup.name}" criado com ${newGroup.studentIds.length} alunos!`);

    setNewGroup({ name: '', description: '', color: '#6366f1', studentIds: [] });
    setIsCreating(false);
  };

  const handleAcceptAISuggestion = (suggestion: StudentGroup) => {
    const newGroup: StudentGroup = {
      ...suggestion,
      id: `group_${Date.now()}`,
      suggestedByAI: false
    };

    setGroups([...groups, newGroup]);
    setAiSuggestions(aiSuggestions.filter(s => s.id !== suggestion.id));
    toast.success(`✨ Grupo "${suggestion.name}" adicionado aos seus grupos!`);
  };

  const handleDeleteGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    setGroups(groups.filter(g => g.id !== groupId));
    toast.success(`Grupo "${group?.name}" removido`);
  };

  const toggleStudentInGroup = (studentId: string) => {
    setNewGroup(prev => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter(id => id !== studentId)
        : [...prev.studentIds, studentId]
    }));
  };

  const getStudentsByIds = (ids: string[]) => {
    return students.filter(s => ids.includes(s._id || ''));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-purple-400 mb-2 flex items-center gap-3">
          <Users size={36} />
          Gerenciamento de Grupos de Alunos
        </h1>
        <p className="text-gray-400">Organize seus alunos em grupos para envios direcionados e gestão eficiente</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('my-groups')}
          className={`px-4 py-3 font-medium border-b-2 transition-all ${
            activeTab === 'my-groups'
              ? 'border-purple-600 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={18} />
            Meus Grupos ({groups.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('ai-suggestions')}
          className={`px-4 py-3 font-medium border-b-2 transition-all ${
            activeTab === 'ai-suggestions'
              ? 'border-purple-600 text-purple-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={18} />
            Sugestões da IA ({aiSuggestions.length})
          </div>
        </button>
      </div>

      {/* MEUS GRUPOS */}
      {activeTab === 'my-groups' && (
        <div className="space-y-6">
          {/* Botão Criar Novo Grupo */}
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition"
            >
              <Plus size={24} />
              Criar Novo Grupo
            </button>
          )}

          {/* Formulário de Criação */}
          {isCreating && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Novo Grupo de Alunos</h3>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewGroup({ name: '', description: '', color: '#6366f1', studentIds: [] });
                  }}
                  className="p-2 text-gray-400 hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome do Grupo</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="Ex: Alunos do 9º Ano"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Descrição (opcional)</label>
                <input
                  type="text"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="Ex: Turma avançada de matemática"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cor do Grupo</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {colors.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setNewGroup({ ...newGroup, color: color.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        newGroup.color === color.value
                          ? 'border-white scale-110'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                      style={{ backgroundColor: color.value }}
                    >
                      <p className="text-xs font-medium text-white">{color.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Selecionar Alunos ({newGroup.studentIds.length} selecionados)
                </label>
                <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-600 rounded-lg p-3 bg-slate-700/50">
                  {students.map(student => (
                    <label
                      key={student._id}
                      className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition"
                    >
                      <input
                        type="checkbox"
                        checked={newGroup.studentIds.includes(student._id || '')}
                        onChange={() => toggleStudentInGroup(student._id || '')}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-gray-400">{student.grade}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewGroup({ name: '', description: '', color: '#6366f1', studentIds: [] });
                  }}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateGroup}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Criar Grupo
                </button>
              </div>
            </div>
          )}

          {/* Lista de Grupos */}
          {groups.length === 0 && !isCreating ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
              <Users size={64} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">Nenhum grupo criado ainda</p>
              <p className="text-gray-500 text-sm mt-2">Crie grupos para organizar seus alunos ou aceite sugestões da IA</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map(group => (
                <div
                  key={group.id}
                  className="bg-slate-800 border-2 rounded-xl p-6 relative overflow-hidden"
                  style={{ borderColor: group.color }}
                >
                  <div
                    className="absolute top-0 left-0 w-full h-2"
                    style={{ backgroundColor: group.color }}
                  />

                  <div className="mt-2">
                    <h3 className="text-xl font-bold mb-2">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-gray-400 mb-4">{group.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                      <Users size={16} />
                      <span>{group.studentIds.length} alunos</span>
                    </div>

                    <div className="max-h-32 overflow-y-auto space-y-1 mb-4">
                      {getStudentsByIds(group.studentIds).map(student => (
                        <div key={student._id} className="text-sm py-1 px-2 bg-slate-700/50 rounded">
                          {student.name}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="flex-1 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                      >
                        <Trash2 size={16} />
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUGESTÕES DA IA */}
      {activeTab === 'ai-suggestions' && (
        <div className="space-y-6">
          <div className="bg-indigo-900/20 border border-indigo-700 rounded-xl p-4">
            <p className="text-indigo-300 font-medium flex items-center gap-2">
              <Sparkles size={20} />
              A IA analisou seus alunos e criou sugestões inteligentes de grupos
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Grupos baseados em: banco de horas, status de pagamento, série/ano e desempenho
            </p>
          </div>

          {aiSuggestions.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
              <Sparkles size={64} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">Nenhuma sugestão disponível no momento</p>
              <p className="text-gray-500 text-sm mt-2">A IA precisa de mais dados de alunos para gerar sugestões</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiSuggestions.map(suggestion => (
                <div
                  key={suggestion.id}
                  className="bg-slate-800 border-2 rounded-xl p-6 relative overflow-hidden"
                  style={{ borderColor: suggestion.color }}
                >
                  <div
                    className="absolute top-0 left-0 w-full h-2"
                    style={{ backgroundColor: suggestion.color }}
                  />

                  <div className="flex items-center gap-2 mb-3 mt-2">
                    <Sparkles size={18} className="text-purple-400" />
                    <span className="text-xs font-semibold text-purple-400 uppercase">Sugestão da IA</span>
                  </div>

                  <h3 className="text-xl font-bold mb-2">{suggestion.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">{suggestion.description}</p>

                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <Users size={16} />
                    <span>{suggestion.studentIds.length} alunos</span>
                  </div>

                  <div className="max-h-32 overflow-y-auto space-y-1 mb-4">
                    {getStudentsByIds(suggestion.studentIds).map(student => (
                      <div key={student._id} className="text-sm py-1 px-2 bg-slate-700/50 rounded">
                        {student.name}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleAcceptAISuggestion(suggestion)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Aceitar Sugestão
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentGroupsManager;
