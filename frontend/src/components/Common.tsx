import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const cores = {
    red: 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700',
    green: 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700',
    blue: 'bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-800'
  };

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onCancelar}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-700"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className={`p-3 rounded-xl ${corBotao === 'red' ? 'bg-red-100 dark:bg-red-900/30' : corBotao === 'green' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'}`}>
                <AlertTriangle className={`${corBotao === 'red' ? 'text-red-600 dark:text-red-400' : corBotao === 'green' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`} size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{titulo}</h3>
                  <button 
                    onClick={onCancelar} 
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">{mensagem}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={onCancelar} 
                className="px-4 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 font-medium transition-colors text-gray-900 dark:text-white"
              >
                Cancelar
              </button>
              <motion.button 
                onClick={onConfirmar} 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`px-4 py-2.5 rounded-lg text-white font-medium transition-colors ${cores[corBotao]}`}
              >
                Confirmar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default { Skeleton, ModalConfirmacao } as { Skeleton: any; ModalConfirmacao: any };
