import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, ChevronRight, Sparkles, BookOpen, Award, Shield } from 'lucide-react';
import {
  FadeContent,
  BlurText,
  GradientText,
  StaggerContainer,
  StaggerItem,
  MagneticButton
} from './ui/Animations';

export const LoginPage = () => {
  const [hoveredRole, setHoveredRole] = useState<'student' | 'teacher' | null>(null);
  const navigate = useNavigate();

  const handleRoleSelect = (role: 'student' | 'teacher') => {
    if (role === 'student') {
      navigate('/portal/login');
    } else {
      navigate('/professor/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white overflow-hidden relative">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs - mais sutis */}
        <div className="absolute top-[-30%] left-[-15%] w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-30%] right-[-15%] w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[150px]" />

        {/* Grid pattern sutil */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col px-4 py-12">
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          {/* Logo & Title */}
          <FadeContent delay={0} duration={0.8} blur>
            <div className="text-center mb-16">
              {/* Logo */}
              <div className="inline-flex items-center justify-center w-20 h-20 mb-8 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl opacity-20 blur-xl" />
                <div className="relative w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <span className="text-4xl font-black tracking-tight text-white">N</span>
                </div>
              </div>

              {/* Title with gradient */}
              <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                <GradientText
                  text="Nexus Academy"
                  colors={['#818cf8', '#a78bfa', '#c4b5fd', '#818cf8']}
                  animationSpeed={6}
                />
              </h1>

              <BlurText
                text="Plataforma inteligente de ensino"
                className="text-slate-400 text-lg"
                delay={0.3}
              />
            </div>
          </FadeContent>

          {/* Role Selection Cards */}
          <StaggerContainer
            className="flex flex-col md:flex-row gap-5 w-full max-w-3xl px-4"
            delay={0.4}
            staggerDelay={0.15}
          >
            {/* Student Card */}
            <StaggerItem className="flex-1">
              <MagneticButton strength={0.15}>
                <button
                  onClick={() => handleRoleSelect('student')}
                  onMouseEnter={() => setHoveredRole('student')}
                  onMouseLeave={() => setHoveredRole(null)}
                  className={`
                    group relative w-full p-7 md:p-8 rounded-2xl transition-all duration-400 cursor-pointer text-left
                    bg-gradient-to-br from-slate-800/40 to-slate-900/60
                    border border-slate-700/40 backdrop-blur-sm
                    hover:border-indigo-500/40 hover:bg-slate-800/50
                    ${hoveredRole === 'student' ? 'shadow-lg shadow-indigo-500/10' : ''}
                  `}
                >
                  {/* Subtle glow on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/25 transition-shadow">
                        <GraduationCap className="w-7 h-7 text-white" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all duration-300" />
                    </div>

                    <h2 className="text-xl md:text-2xl font-semibold mb-2 text-white">
                      Sou Aluno
                    </h2>
                    <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                      Acesse suas aulas, acompanhe seu progresso e conquiste suas metas
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {['Aulas', 'Progresso', 'Conquistas'].map((feature) => (
                        <span
                          key={feature}
                          className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-950/50 text-indigo-300 border border-indigo-800/30"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              </MagneticButton>
            </StaggerItem>

            {/* Teacher Card */}
            <StaggerItem className="flex-1">
              <MagneticButton strength={0.15}>
                <button
                  onClick={() => handleRoleSelect('teacher')}
                  onMouseEnter={() => setHoveredRole('teacher')}
                  onMouseLeave={() => setHoveredRole(null)}
                  className={`
                    group relative w-full p-7 md:p-8 rounded-2xl transition-all duration-400 cursor-pointer text-left
                    bg-gradient-to-br from-slate-800/40 to-slate-900/60
                    border border-slate-700/40 backdrop-blur-sm
                    hover:border-purple-500/40 hover:bg-slate-800/50
                    ${hoveredRole === 'teacher' ? 'shadow-lg shadow-purple-500/10' : ''}
                  `}
                >
                  {/* Subtle glow on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-purple-500/25 transition-shadow">
                        <Users className="w-7 h-7 text-white" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all duration-300" />
                    </div>

                    <h2 className="text-xl md:text-2xl font-semibold mb-2 text-white">
                      Sou Professor
                    </h2>
                    <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                      Gerencie alunos, aulas e automatize sua rotina com IA
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {['Gestão', 'IA', 'Analytics'].map((feature) => (
                        <span
                          key={feature}
                          className="px-3 py-1 text-xs font-medium rounded-full bg-purple-950/50 text-purple-300 border border-purple-800/30"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              </MagneticButton>
            </StaggerItem>
          </StaggerContainer>

          {/* Features Row */}
          <FadeContent delay={0.9} duration={0.6}>
            <div className="mt-14 flex flex-wrap justify-center gap-6 md:gap-10 text-slate-500 text-sm">
              <div className="flex items-center gap-2 hover:text-slate-400 transition-colors">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Inteligência Artificial</span>
              </div>
              <div className="flex items-center gap-2 hover:text-slate-400 transition-colors">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Gamificação</span>
              </div>
              <div className="flex items-center gap-2 hover:text-slate-400 transition-colors">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Aulas ao Vivo</span>
              </div>
              <div className="flex items-center gap-2 hover:text-slate-400 transition-colors">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>Seguro & Confiável</span>
              </div>
            </div>
          </FadeContent>
        </div>

        {/* Footer */}
        <FadeContent delay={1.1} duration={0.5}>
          <p className="mt-auto text-center text-slate-600 text-sm pb-6">
            © 2025 Nexus Academy
          </p>
        </FadeContent>
      </div>
    </div>
  );
};

export default LoginPage;
