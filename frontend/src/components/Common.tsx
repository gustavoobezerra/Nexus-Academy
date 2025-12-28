import { X } from 'lucide-react';

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}></div>
);

export const ModalConfirmacao = ({
  aberto,
  titulo,
  mensagem,
  onConfirmar,
  onCancelar,
  corBotao = 'red'
}: {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  corBotao?: 'red' | 'green' | 'blue';
}) => {
  if (!aberto) return null;

  const cores = {
    red: 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700',
    green: 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700',
    blue: 'bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-800'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-700">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{titulo}</h3>
          <button onClick={onCancelar} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"><X size={18} /></button>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{mensagem}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancelar} className="px-4 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 font-medium transition-colors text-gray-900 dark:text-white">Cancelar</button>
          <button onClick={onConfirmar} className={`px-4 py-2.5 rounded-lg text-white font-medium transition-colors ${cores[corBotao]}`}>Confirmar</button>
        </div>
      </div>
    </div>
  );
};

export default { Skeleton, ModalConfirmacao } as { Skeleton: any; ModalConfirmacao: any };
