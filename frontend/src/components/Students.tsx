import { useEffect, useState, useMemo } from 'react';
import { Plus, User, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentsAPI } from '../lib/api';
import { Skeleton, ModalConfirmacao } from './Common';
import type { Aluno } from '../types';

const StudentsPage = () => {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [query, setQuery] = useState('');
  const [excluirAluno, setExcluirAluno] = useState<Aluno | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [validarForm, setValidarForm] = useState<{ [key: string]: string }>({});

  useEffect(() => { buscar(); }, []);

  const buscar = async () => {
    setCarregando(true);
    try {
      const res = await studentsAPI.getAll();
      setAlunos(res.data?.students || []);
    } catch (err) {
      console.error('Erro ao buscar alunos:', err);
      setAlunos([]);
      toast.error('Erro ao buscar alunos');
    } finally {
      setCarregando(false);
    }
  };

  const validarCampos = (): boolean => {
    const erros: { [key: string]: string } = {};
    if (!formData.name.trim()) erros.name = 'Nome é obrigatório';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) erros.email = 'Email inválido';
    if (formData.phone && !/^\d{10,11}$/.test(formData.phone.replace(/\D/g, ''))) erros.phone = 'Telefone inválido (mínimo 10 dígitos)';
    setValidarForm(erros);
    return Object.keys(erros).length === 0;
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validarCampos()) return;

    const novo: Partial<Aluno> = {
      ...formData,
      status: 'active',
      age: 12,
      grade: '7º',
      monthlyFee: 200,
      paymentStatus: 'paid',
      parentName: '',
      parentEmail: '',
      parentPhone: ''
    };

    try {
      await studentsAPI.create(novo);
      toast.success('Aluno criado com sucesso');
      buscar();
      setFormData({ name: '', email: '', phone: '' });
      setMostrarForm(false);
    } catch (err) {
      console.error('Erro ao criar aluno:', err);
      toast.error('Erro ao criar aluno');
    }
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
      setExcluirAluno(null);
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
        <button
          onClick={() => {
            setMostrarForm(!mostrarForm);
            setValidarForm({});
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
        >
          <Plus size={18} /> Novo Aluno
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <h4 className="font-bold text-slate-800 dark:text-white mb-2">Dados do Novo Aluno</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Nome Completo *</label>
              <input
                type="text"
                autoFocus
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: João Silva"
                className={`w-full px-4 py-2.5 rounded-lg border ${validarForm.name ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all`}
              />
              {validarForm.name && <p className="text-red-500 text-xs mt-1 font-medium">{validarForm.name}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@escola.com"
                className={`w-full px-4 py-2.5 rounded-lg border ${validarForm.email ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all`}
              />
              {validarForm.email && <p className="text-red-500 text-xs mt-1 font-medium">{validarForm.email}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Telefone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 98765-4321"
                className={`w-full px-4 py-2.5 rounded-lg border ${validarForm.phone ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all`}
              />
              {validarForm.phone && <p className="text-red-500 text-xs mt-1 font-medium">{validarForm.phone}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setMostrarForm(false)} className="px-6 py-2.5 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-lg font-bold transition-all shadow-md">Cadastrar</button>
          </div>
        </form>
      )}

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
