import { Flame, User } from 'lucide-react';

interface StudentHeaderProps {
  studentName: string;
  streak: number;
  teacherName: string;
  teacherOnline: boolean;
  photoUrl?: string;
}

export const StudentHeader = ({
  studentName,
  streak,
  teacherName,
  teacherOnline,
  photoUrl
}: StudentHeaderProps) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const firstName = studentName.split(' ')[0];

  return (
    <header className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 p-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl text-white shadow-xl">
      {/* Saudação */}
      <div className="flex-1">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">
          {getGreeting()}, {firstName}! 👋
        </h1>
        <p className="text-sm md:text-base opacity-90">
          Continue de onde parou e alcance suas metas
        </p>
      </div>

      {/* Streak Badge */}
      <div className="flex items-center gap-3 bg-white/20 backdrop-blur-md px-4 py-3 rounded-xl border border-white/30">
        <Flame className="w-7 h-7 text-orange-400 animate-pulse drop-shadow-lg" />
        <div className="flex flex-col">
          <span className="text-2xl font-bold leading-none">{streak}</span>
          <span className="text-xs opacity-80">dias seguidos</span>
        </div>
      </div>

      {/* Status do Professor */}
      <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/20">
        <div className="relative">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
              teacherOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
        </div>
        <div className="flex flex-col">
          <p className="text-xs opacity-70">Professor</p>
          <p className="text-sm font-medium">{teacherName}</p>
        </div>
      </div>

      {/* Foto de Perfil */}
      <button className="hover:scale-105 transition-transform">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={studentName}
            className="w-12 h-12 rounded-full border-2 border-white shadow-lg"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border-2 border-white flex items-center justify-center text-white font-bold text-xl">
            {studentName.charAt(0).toUpperCase()}
          </div>
        )}
      </button>
    </header>
  );
};

export default StudentHeader;
