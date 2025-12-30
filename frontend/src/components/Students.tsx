import { useEffect, useState, useMemo } from 'react';
import { User, Search, Trash2, Link2, Copy, Check, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentsAPI } from '../lib/api';
import { Skeleton, ModalConfirmacao } from './Common';
import { useAuthStore } from '../store/authStore';
import type { Aluno } from '../types';

const StudentsPage = () => {
  const { user } = useAuthStore();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [query, setQuery] = useState('');
  const [excluirAluno, setExcluirAluno] = useState<Aluno | null>(null);
  const [copied, setCopied] = useState(false);

  // Link de convite do professor
  const inviteLink = user?.slug ? `${window.location.origin}/professor/${user.slug}` : '';

  useEffect(() => { buscar(); }, []);

  const buscar = async () => {
    setCarregando(true);
    try {
      const res = await studentsAPI.getAll() as any;
      // apiService já retorna response.data diretamente
      setAlunos(res.students || []);
    } catch (err) {
      console.error('Erro ao buscar alunos:', err);
      toast.error('Erro ao carregar lista de alunos');
      setAlunos([]);
    } finally {
      setCarregando(false);
    }
  };

  const copyInviteLink = () => {
    if (!inviteLink) {
      toast.error('Configure seu link nas configurações do perfil');
      return;
    }
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link de convite copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!excluirAluno) return;
    const id = excluirAluno._id || excluirAluno.id || '';
    try {
      await studentsAPI.delete(id);
      toast.success('Aluno removido');
      setExcluirAluno(null);
      buscar();
    } catch (err) {
      console.error('Erro ao remover aluno:', err);
      toast.error('Erro ao remover aluno');
    }
  };

  const filtrados = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return alunos;
    return alunos.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q) ||
      (a.phone || '').includes(q)
    );
  }, [alunos, query]);

  if (carregando) return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48"/>
        <Skeleton className="h-10 w-32"/>
      </div>
      <Skeleton className="h-12 w-full max-w-md"/>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl"/>)}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <ModalConfirmacao
        aberto={!!excluirAluno}
        titulo="Remover aluno"
        mensagem={`Tem certeza que deseja remover ${excluirAluno?.name}? Esta ação não pode ser desfeita.`}
        onConfirmar={handleDelete}
        onCancelar={() => setExcluirAluno(null)}
        corBotao="red"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white">Alunos</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie os alunos da sua escola</p>
        </div>
      </div>

      {/* Card de Link de Convite */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold">Convide seus alunos</h4>
              <p className="text-white/80 text-sm mt-1">
                Compartilhe seu link exclusivo para que os alunos se cadastrem diretamente na sua sala
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {inviteLink ? (
              <>
                <button
                  onClick={copyInviteLink}
                  className="px-5 py-2.5 bg-white text-indigo-600 rounded-xl font-semibold flex items-center gap-2 hover:bg-white/90 transition-colors"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'Copiado!' : 'Copiar Link'}
                </button>
                <button
                  onClick={() => window.open(inviteLink, '_blank')}
                  className="px-4 py-2.5 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
                  title="Visualizar página"
                >
                  <ExternalLink size={18} />
                </button>
              </>
            ) : (
              <p className="text-white/80 text-sm italic">
                Configure seu link nas configurações do perfil
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            placeholder="Pesquise por nome, email ou telefone..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <button
          onClick={buscar}
          className="px-6 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-bold transition-colors text-slate-700 dark:text-slate-200"
        >
          Atualizar Lista
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <User size={64} className="mx-auto mb-4 text-slate-300 dark:text-slate-600"/>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Nenhum aluno encontrado</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">Tente ajustar sua busca ou cadastrar um novo aluno</p>
          </div>
        ) : (
          filtrados.map(a => (
            <div
              key={a._id || a.id}
              className="group bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-900 transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <User size={24}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate text-lg">{a.name}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">{a.email || 'Sem e-mail'}</div>
                    <div className="text-sm text-slate-400 dark:text-slate-500 mt-0.5 font-medium">{a.phone || 'Sem telefone'}</div>
                  </div>
                </div>
                <button
                  onClick={() => setExcluirAluno(a)}
                  className="p-2 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Remover Aluno"
                >
                  <Trash2 size={20}/>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentsPage;
