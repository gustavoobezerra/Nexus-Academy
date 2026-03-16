import { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, Clock3, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { classesAPI, studentsAPI } from '../lib/api';
import type { Aluno, Aula } from '../types';

const daysRange = (daysCount: number) => {
  const dates: Date[] = [];
  const today = new Date();
  for (let offset = 0; offset < daysCount; offset += 1) {
    dates.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));
  }
  return dates;
};

const formatDateTimeLocal = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getQuickAddDate = (selectedDate: Date) => {
  const baseDate = new Date(selectedDate);
  const nextHour = new Date();
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(Math.min(Math.max(nextHour.getHours() + 1, 8), 21));
  baseDate.setHours(nextHour.getHours(), nextHour.getMinutes(), 0, 0);
  return formatDateTimeLocal(baseDate);
};

type CalendarClass = Aula & { student?: { name?: string; grade?: string } };

export const CalendarView = () => {
  const [classes, setClasses] = useState<CalendarClass[]>([]);
  const [students, setStudents] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    studentId: '',
    subject: '',
    scheduledAt: '',
    duration: '60',
    notes: ''
  });

  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const [classesResponse, studentsResponse] = await Promise.all([
        classesAPI.getAll({ page: 1, limit: 200 }),
        studentsAPI.getAll()
      ]);

      setClasses(((classesResponse as any)?.classes || []) as CalendarClass[]);
      setStudents((((studentsResponse as any)?.students) || []) as Aluno[]);
    } catch (error) {
      console.error('Erro ao carregar calendário:', error);
      setClasses([]);
      setStudents([]);
      toast.error('Erro ao carregar agenda');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const days = daysRange(14);

  const getStudentName = (classItem: CalendarClass) =>
    classItem.studentName || classItem.student?.name || 'Aluno';

  const classesForDate = (date: Date) => classes
    .filter((classItem) => {
      if (classItem.status === 'cancelled') return false;
      return new Date(classItem.scheduledAt).toDateString() === date.toDateString();
    })
    .sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime());

  const quickAdd = (date: Date) => {
    if (students.length === 0) {
      toast.error('Cadastre um aluno antes de agendar uma aula');
      return;
    }

    setFormData({
      title: '',
      studentId: students[0]?._id || students[0]?.id || '',
      subject: '',
      scheduledAt: getQuickAddDate(date),
      duration: '60',
      notes: ''
    });
    setShowQuickAdd(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.title || !formData.studentId || !formData.subject || !formData.scheduledAt) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const scheduledDate = new Date(formData.scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      toast.error('Informe uma data válida');
      return;
    }

    setSaving(true);
    try {
      await classesAPI.create({
        title: formData.title,
        studentId: formData.studentId,
        subject: formData.subject,
        scheduledAt: scheduledDate.toISOString(),
        duration: Number(formData.duration) || 60,
        notes: formData.notes
      });

      toast.success('Aula agendada com sucesso!');
      setShowQuickAdd(false);
      await loadCalendarData();
    } catch (error) {
      console.error('Erro ao criar aula na agenda:', error);
      toast.error('Erro ao agendar aula');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Calendário - Próximos 14 dias</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Visualize as aulas agendadas e crie novas aulas direto pela agenda.
          </p>
        </div>
        <button
          onClick={() => quickAdd(new Date())}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          <CalendarPlus size={16} />
          Nova Aula
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {days.map((date) => (
            <div key={date.toDateString()} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {days.map((date) => {
            const items = classesForDate(date);

            return (
              <div key={date.toDateString()} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-400">
                      {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white">{date.getDate()}</p>
                  </div>
                  <button
                    onClick={() => quickAdd(date)}
                    className="rounded px-2 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    + Aula
                  </button>
                </div>

                <div className="space-y-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-400">Nenhuma aula</p>
                  ) : (
                    items.map((classItem) => (
                      <div
                        key={classItem._id || classItem.id}
                        className="rounded-lg bg-indigo-50 p-2 text-xs text-slate-900 dark:bg-indigo-900/40 dark:text-white"
                      >
                        <p className="font-semibold">{classItem.title}</p>
                        <p className="mt-1 flex items-center gap-1 text-slate-500 dark:text-slate-300">
                          <Clock3 size={12} />
                          {new Date(classItem.scheduledAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="mt-1 text-slate-500 dark:text-slate-300">{getStudentName(classItem)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white">Agendar pela agenda</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Crie a aula e ela aparece imediatamente no calendário.
                </p>
              </div>
              <button
                onClick={() => setShowQuickAdd(false)}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Título *</label>
                <input
                  value={formData.title}
                  onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Aluno *</label>
                <select
                  value={formData.studentId}
                  onChange={(event) => setFormData((current) => ({ ...current, studentId: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  required
                >
                  {students.map((student) => (
                    <option key={student._id || student.id} value={student._id || student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Matéria *</label>
                <input
                  value={formData.subject}
                  onChange={(event) => setFormData((current) => ({ ...current, subject: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Data e hora *</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(event) => setFormData((current) => ({ ...current, scheduledAt: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Duração (min)</label>
                <input
                  type="number"
                  min="15"
                  max="480"
                  value={formData.duration}
                  onChange={(event) => setFormData((current) => ({ ...current, duration: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Observações</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Salvar Aula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
