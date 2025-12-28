import { useState } from 'react';
import { Plus, Trash2, Save, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Question {
  _id?: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay';
  question: string;
  options?: Array<{ text: string; isCorrect: boolean }>;
  correctAnswer?: boolean;
  blanks?: Array<{ position: number; correctAnswer: string }>;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface Quiz {
  _id?: string;
  title: string;
  description: string;
  questions: Question[];
  timeLimit?: number;
  shuffleQuestions: boolean;
  showResults: boolean;
  allowRetake: boolean;
  maxAttempts: number;
}

export const QuizBuilder = () => {
  const [quiz, setQuiz] = useState<Quiz>({
    title: '',
    description: '',
    questions: [],
    shuffleQuestions: false,
    showResults: true,
    allowRetake: false,
    maxAttempts: 1
  });
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const addQuestion = (type: Question['type']) => {
    const newQuestion: Question = {
      type,
      question: '',
      points: 1,
      difficulty: 'medium',
      ...(type === 'multiple_choice' && {
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ]
      }),
      ...(type === 'fill_blank' && {
        blanks: [{ position: 0, correctAnswer: '' }]
      })
    };
    setEditingQuestion(newQuestion);
  };

  const saveQuestion = () => {
    if (!editingQuestion) return;
    if (!editingQuestion.question.trim()) {
      toast.error('Pergunta é obrigatória');
      return;
    }

    if (editingQuestion.type === 'multiple_choice') {
      const hasCorrect = editingQuestion.options?.some(opt => opt.isCorrect);
      if (!hasCorrect) {
        toast.error('Selecione pelo menos uma resposta correta');
        return;
      }
    }

    setQuiz(prev => ({
      ...prev,
      questions: editingQuestion._id
        ? prev.questions.map(q => q._id === editingQuestion._id ? editingQuestion : q)
        : [...prev.questions, { ...editingQuestion, _id: `q_${Date.now()}` }]
    }));
    setEditingQuestion(null);
    toast.success('Questão adicionada');
  };

  const deleteQuestion = (questionId: string) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q._id !== questionId)
    }));
  };

  const saveQuiz = async () => {
    if (!quiz.title.trim()) {
      toast.error('Título do quiz é obrigatório');
      return;
    }
    if (quiz.questions.length === 0) {
      toast.error('Adicione pelo menos uma questão');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/quizzes`, {
        method: quiz._id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(quiz)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Quiz salvo com sucesso!');
        setQuiz({ ...quiz, _id: data.quiz._id });
      } else {
        toast.error(data.message || 'Erro ao salvar quiz');
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Criar Quiz</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Crie avaliações interativas com correção automática
          </p>
        </div>
        <button
          onClick={saveQuiz}
          disabled={saving}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Quiz'}
        </button>
      </div>

      {/* Quiz Info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Título do Quiz *
          </label>
          <input
            type="text"
            value={quiz.title}
            onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
            placeholder="Ex: Avaliação de Matemática - Equações"
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Descrição
          </label>
          <textarea
            value={quiz.description}
            onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
            placeholder="Descreva o quiz..."
            rows={3}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Questions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Questões ({quiz.questions.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => addQuestion('multiple_choice')}
              className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Múltipla Escolha
            </button>
            <button
              onClick={() => addQuestion('true_false')}
              className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              V/F
            </button>
            <button
              onClick={() => addQuestion('fill_blank')}
              className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Preencher
            </button>
            <button
              onClick={() => addQuestion('essay')}
              className="px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Dissertativa
            </button>
          </div>
        </div>

        {/* Question List */}
        <div className="space-y-4">
          {quiz.questions.map((q, idx) => (
            <div
              key={q._id}
              className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    #{idx + 1}
                  </span>
                  <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded">
                    {q.type === 'multiple_choice' ? 'Múltipla Escolha' :
                     q.type === 'true_false' ? 'Verdadeiro/Falso' :
                     q.type === 'fill_blank' ? 'Preencher Lacunas' : 'Dissertativa'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingQuestion(q)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteQuestion(q._id!)}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-slate-900 dark:text-white">{q.question}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {q.points} ponto(s) • {q.difficulty}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingQuestion._id ? 'Editar' : 'Nova'} Questão
              </h3>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <XCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Pergunta *
                </label>
                <textarea
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                  placeholder="Digite a pergunta..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {editingQuestion.type === 'multiple_choice' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Opções *
                  </label>
                  {editingQuestion.options?.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={opt.isCorrect}
                        onChange={(e) => {
                          const newOptions = [...editingQuestion.options!];
                          newOptions[idx].isCorrect = e.target.checked;
                          setEditingQuestion({ ...editingQuestion, options: newOptions });
                        }}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const newOptions = [...editingQuestion.options!];
                          newOptions[idx].text = e.target.value;
                          setEditingQuestion({ ...editingQuestion, options: newOptions });
                        }}
                        placeholder={`Opção ${idx + 1}`}
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {editingQuestion.type === 'true_false' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Resposta Correta
                  </label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setEditingQuestion({ ...editingQuestion, correctAnswer: true })}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                        editingQuestion.correctAnswer === true
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
                      <span className="text-sm font-medium">Verdadeiro</span>
                    </button>
                    <button
                      onClick={() => setEditingQuestion({ ...editingQuestion, correctAnswer: false })}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                        editingQuestion.correctAnswer === false
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      <XCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
                      <span className="text-sm font-medium">Falso</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Pontos
                  </label>
                  <input
                    type="number"
                    value={editingQuestion.points}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, points: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Dificuldade
                  </label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="easy">Fácil</option>
                    <option value="medium">Médio</option>
                    <option value="hard">Difícil</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={saveQuestion}
                  className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors"
                >
                  Salvar Questão
                </button>
                <button
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
