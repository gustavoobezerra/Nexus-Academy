import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { studentsAPI } from '../lib/api';
import toast from 'react-hot-toast';

export const OnlineStudents = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await studentsAPI.getAll() as any;
        // apiService já retorna response.data diretamente
        const studentList = res.students || [];
        // ATENÇÃO: setState em useEffect pode causar re-renders. Considere usar useCallback ou mover lógica.
        setStudents(studentList);
        // random online statuses
        const map: Record<string, boolean> = {};
        studentList.forEach((_st: unknown) => {
          map[_st._id || _st.id] = Math.random() > 0.6;
        });
        setOnlineMap(map);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar alunos');
      }
    };
    fetchStudents();
  }, []);

  const toggleOnline = (id: string) => {
    const next = { ...onlineMap, [id]: !onlineMap[id] };
    setOnlineMap(next);
  };

  const givePoints = async (id: string, amount = 50) => {
    const student = students.find(s => (s._id || s.id) === id);
    if (!student) return;

    try {
      await studentsAPI.addPoints(id, amount, 'session_bonus', 'Bônus por participação ao vivo');
      toast.success(`Concedidos ${amount} pontos a ${student.name}`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao dar pontos');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Alunos Online</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {students.map(s => (
          <div key={s._id || s.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 flex items-center justify-between border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-lg">
                {s.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-800 dark:text-white">{s.name}</p>
                  {onlineMap[s._id || s.id] ? <span className="text-xs text-green-600 dark:text-green-400">online</span> : <span className="text-xs text-slate-400">offline</span>}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.grade} • {s.parentName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => toggleOnline(s._id || s.id)} className="px-3 py-2 bg-slate-100 dark:bg-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors">Toggle</button>
              <button onClick={() => givePoints(s._id || s.id)} className="px-3 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-lg flex items-center gap-2 hover:from-amber-500 hover:to-amber-600 transition-colors">
                <Star size={16} /> Dar Pontos
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OnlineStudents;
