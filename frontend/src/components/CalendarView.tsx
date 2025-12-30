import { useEffect, useState } from 'react';

const daysRange = (n: number) => {
  const arr = [] as Date[];
  const today = new Date();
  for (let i = 0; i < n; i++) arr.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
  return arr;
};

export const CalendarView = () => {
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
    setClasses([]);
  }, []);

  const days = daysRange(14);

  const classesFor = (date: Date) => classes.filter(c => new Date(c.scheduledAt).toDateString() === date.toDateString());

  const quickAdd = (date: Date) => {
    // Quick add disabled - integrate with API
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Calendário - Próximos 14 dias</h3>
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map(d => (
          <div key={d.toDateString()} className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-400">{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                <p className="font-bold text-slate-900 dark:text-white">{d.getDate()}</p>
              </div>
              <button onClick={() => quickAdd(d)} className="text-xs text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-2 py-1">+ Aula</button>
            </div>
            <div className="space-y-2">
              {classesFor(d).length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-400">Nenhuma</p>
              ) : (
                classesFor(d).map(c => (
                  <div key={c._id || c.id} className="bg-indigo-50 dark:bg-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-slate-500 dark:text-slate-300">{new Date(c.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {c.studentName}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;
