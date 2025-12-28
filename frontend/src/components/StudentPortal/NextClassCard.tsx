import { Calendar, Clock, Video, Paperclip, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface NextClassCardProps {
  subject: string;
  title: string;
  scheduledAt: string;
  duration: number;
  isOnline: boolean;
  materials?: Array<{ name: string; type: 'pdf' | 'video' | 'link' }>;
  onJoin?: () => void;
}

export const NextClassCard = ({
  subject,
  title,
  scheduledAt,
  duration,
  isOnline,
  materials = [],
  onJoin
}: NextClassCardProps) => {
  const [timeUntil, setTimeUntil] = useState('');

  useEffect(() => {
    const updateTimeUntil = () => {
      const now = new Date();
      const classTime = new Date(scheduledAt);
      const diff = classTime.getTime() - now.getTime();

      if (diff < 0) {
        setTimeUntil('Começou!');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeUntil(`Em ${days} dia${days > 1 ? 's' : ''}`);
      } else if (hours > 0) {
        setTimeUntil(`Em ${hours}h ${minutes}min`);
      } else {
        setTimeUntil(`Em ${minutes}min`);
      }
    };

    updateTimeUntil();
    const interval = setInterval(updateTimeUntil, 60000); // Atualiza a cada minuto

    return () => clearInterval(interval);
  }, [scheduledAt]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  };

  const formatTime = (date: string) => {
    const classTime = new Date(date);
    const endTime = new Date(classTime.getTime() + duration * 60000);

    const start = classTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const end = endTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `${start} - ${end}`;
  };

  const canJoin = () => {
    const now = new Date();
    const classTime = new Date(scheduledAt);
    const diff = classTime.getTime() - now.getTime();
    // Pode entrar 15min antes
    return diff <= 15 * 60 * 1000 && diff > -duration * 60000;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Próxima Aula
          </h3>
        </div>
        {canJoin() && (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full animate-pulse">
            ABERTA
          </span>
        )}
      </div>

      {/* Conteúdo Principal */}
      <div className="mb-6">
        <p className="text-indigo-600 font-semibold text-sm mb-1">{subject}</p>
        <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>

        {/* Tempo até a aula */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 mb-4">
          <Clock className="w-5 h-5 text-indigo-600" />
          <span className="text-indigo-900 font-bold">{timeUntil}</span>
        </div>

        {/* Informações da aula */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(scheduledAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{formatTime(scheduledAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            <span>{isOnline ? 'Online' : 'Presencial'}</span>
          </div>
        </div>
      </div>

      {/* Materiais */}
      {materials.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Paperclip className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">
              Materiais ({materials.length})
            </span>
          </div>
          <ul className="space-y-2">
            {materials.slice(0, 3).map((material, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                <span className="truncate">{material.name}</span>
              </li>
            ))}
          </ul>
          {materials.length > 3 && (
            <p className="text-xs text-gray-500 mt-2">
              +{materials.length - 3} mais
            </p>
          )}
        </div>
      )}

      {/* Botão de ação */}
      <button
        onClick={onJoin}
        disabled={!canJoin()}
        className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
          canJoin()
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {canJoin() ? (
          <>
            <Video className="w-5 h-5" />
            <span>Entrar na Aula</span>
            <ArrowRight className="w-5 h-5" />
          </>
        ) : (
          <>
            <Clock className="w-5 h-5" />
            <span>Aguardando horário</span>
          </>
        )}
      </button>
    </div>
  );
};

export default NextClassCard;
