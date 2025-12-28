# 🎨 ESPECIFICAÇÃO COMPLETA DO REDESIGN DO DASHBOARD DO ALUNO

## 📐 ESTRUTURA VISUAL GERAL

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER                                                          │
│ ┌──────────────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│ │ Bom dia, João! 👋│  │ 🔥 7 dias│  │ Prof: ●  │  │  FOTO   │ │
│ └──────────────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ GRID DE CARDS (Responsivo: 3 colunas desktop, 1 mobile)       │
│                                                                 │
│ ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│ │  PRÓXIMA AULA    │  │   PROGRESSO      │  │  ATIVIDADES   │ │
│ │  ⏰ Em 2 horas   │  │   ◷ 75%         │  │  ✓ 3 pendentes│ │
│ │                  │  │                  │  │               │ │
│ │  Matemática      │  │  [Progress Bar]  │  │  • Tarefa 1   │ │
│ │  Equações 2º grau│  │                  │  │  • Exercício  │ │
│ │                  │  │  Meta: 80%       │  │  • Leitura    │ │
│ │  [ENTRAR]        │  │  Faltam 5h       │  │               │ │
│ └──────────────────┘  └──────────────────┘  └───────────────┘ │
│                                                                 │
│ ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│ │   CALENDÁRIO     │  │    MATERIAIS     │  │  CONQUISTAS   │ │
│ │                  │  │                  │  │               │ │
│ │  [MÊS/SEMANA]    │  │  📁 PDFs (12)    │  │  🏆 Nível 5   │ │
│ │                  │  │  🎥 Vídeos (8)   │  │  ⭐ 1250 XP   │ │
│ │  S  T  Q  Q  S   │  │  🔗 Links (5)    │  │               │ │
│ │  ●  ●  ○  ●  ○   │  │                  │  │  Última: 🔥   │ │
│ │                  │  │  [VER TUDO]      │  │  Streak 7 dias│ │
│ └──────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 COMPONENTE 1: HEADER PERSONALIZADO

### Visual

```
┌──────────────────────────────────────────────────────────────────────┐
│  Bom dia, João! 👋                    🔥 7        Prof: ●      [📸]   │
│  Continue de onde parou              dias       Maria Silva           │
└──────────────────────────────────────────────────────────────────────┘
```

### Especificação Técnica

**Arquivo:** `StudentHeader.tsx`

```typescript
interface StudentHeaderProps {
  studentName: string;
  streak: number;
  teacherName: string;
  teacherOnline: boolean;
  photoUrl?: string;
}

function StudentHeader({ studentName, streak, teacherName, teacherOnline, photoUrl }: StudentHeaderProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <header className="student-header">
      {/* Saudação */}
      <div className="greeting">
        <h1>{getGreeting()}, {studentName.split(' ')[0]}! 👋</h1>
        <p className="subtitle">Continue de onde parou e alcance suas metas</p>
      </div>

      {/* Streak */}
      <div className="streak-badge">
        <Fire className="w-6 h-6 text-orange-500 animate-pulse" />
        <div>
          <span className="streak-number text-2xl font-bold">{streak}</span>
          <span className="streak-label text-sm text-gray-500">dias seguidos</span>
        </div>
      </div>

      {/* Professor status */}
      <div className="teacher-status">
        <div className="relative">
          <User className="w-10 h-10" />
          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
            teacherOnline ? 'bg-green-500' : 'bg-gray-400'
          }`} />
        </div>
        <div>
          <p className="text-xs text-gray-500">Professor</p>
          <p className="text-sm font-medium">{teacherName}</p>
        </div>
      </div>

      {/* Foto de perfil */}
      <button className="profile-btn">
        {photoUrl ? (
          <img src={photoUrl} alt={studentName} className="w-12 h-12 rounded-full" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
            {studentName.charAt(0).toUpperCase()}
          </div>
        )}
      </button>
    </header>
  );
}
```

**Estilos:**
```css
.student-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.greeting h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.greeting .subtitle {
  font-size: 0.875rem;
  opacity: 0.9;
}

.streak-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.streak-number {
  font-size: 1.5rem;
  font-weight: 700;
  display: block;
}

.streak-label {
  font-size: 0.75rem;
  display: block;
  opacity: 0.8;
}

@media (max-width: 768px) {
  .student-header {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .greeting {
    flex: 1 1 100%;
  }
}
```

---

## 🎯 COMPONENTE 2: CARD PRÓXIMA AULA

### Visual

```
┌─────────────────────────────────────────────┐
│ 📅 Próxima Aula                             │
├─────────────────────────────────────────────┤
│                                             │
│   Matemática                                │
│   Equações do Segundo Grau                  │
│                                             │
│   ⏰ Começa em 2h 15min                     │
│                                             │
│   📅  Ter, 28 Dez                           │
│   🕐  14:00 - 15:00                         │
│   📹  Online                                │
│                                             │
│   📎 Materiais (3):                         │
│   • Lista de exercícios.pdf                 │
│   • Vídeo de revisão                        │
│   • Link da sala                            │
│                                             │
│   ┌─────────────────┐  ┌──────────────┐    │
│   │  ENTRAR NA SALA │  │  💬 MENSAGEM  │    │
│   └─────────────────┘  └──────────────┘    │
└─────────────────────────────────────────────┘
```

### Especificação Técnica

**Arquivo:** `NextClassCard.tsx`

```typescript
interface NextClassCardProps {
  class: {
    id: string;
    subject: string;
    topic?: string;
    startTime: string;
    endTime: string;
    type: 'online' | 'presencial';
    materials?: Array<{
      id: string;
      name: string;
      type: 'pdf' | 'video' | 'link';
      url: string;
    }>;
  };
  onJoin: (classId: string) => void;
  onMessage: () => void;
}

function NextClassCard({ class: nextClass, onJoin, onMessage }: NextClassCardProps) {
  const [timeUntil, setTimeUntil] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const start = new Date(nextClass.startTime);
      const diff = start.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntil('Acontecendo agora!');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeUntil(`${hours}h ${minutes}min`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Atualiza a cada minuto

    return () => clearInterval(interval);
  }, [nextClass.startTime]);

  return (
    <div className="next-class-card card-elevated card-featured">
      {/* Header */}
      <div className="card-header">
        <Calendar className="w-5 h-5 text-indigo-600" />
        <h2>Próxima Aula</h2>
      </div>

      {/* Content */}
      <div className="card-content">
        <h3 className="class-subject">{nextClass.subject}</h3>
        {nextClass.topic && (
          <p className="class-topic">{nextClass.topic}</p>
        )}

        {/* Countdown */}
        <div className="countdown">
          <Clock className="w-5 h-5 text-orange-500 animate-pulse" />
          <span className="countdown-text">
            Começa em {timeUntil}
          </span>
        </div>

        {/* Class Details */}
        <div className="class-details">
          <div className="detail">
            <CalendarIcon className="w-4 h-4" />
            <span>{formatDate(nextClass.startTime, 'ddd, DD MMM')}</span>
          </div>
          <div className="detail">
            <ClockIcon className="w-4 h-4" />
            <span>
              {formatTime(nextClass.startTime)} - {formatTime(nextClass.endTime)}
            </span>
          </div>
          <div className="detail">
            <VideoIcon className="w-4 h-4" />
            <span>{nextClass.type === 'online' ? 'Online' : 'Presencial'}</span>
          </div>
        </div>

        {/* Materials */}
        {nextClass.materials && nextClass.materials.length > 0 && (
          <div className="class-materials">
            <h4>📎 Materiais ({nextClass.materials.length})</h4>
            <ul>
              {nextClass.materials.map(material => (
                <li key={material.id}>
                  {getFileIcon(material.type)}
                  <a href={material.url} target="_blank" rel="noopener noreferrer">
                    {material.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="card-actions">
        <button
          className="btn-primary btn-large"
          onClick={() => onJoin(nextClass.id)}
        >
          <VideoIcon className="w-5 h-5" />
          Entrar na Sala
        </button>
        <button
          className="btn-secondary"
          onClick={onMessage}
        >
          <MessageIcon className="w-5 h-5" />
          Enviar Mensagem
        </button>
      </div>
    </div>
  );
}
```

**Estilos:**
```css
.next-class-card {
  background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
  border: 2px solid #667eea;
  position: relative;
  overflow: hidden;
}

.next-class-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.class-subject {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.class-topic {
  font-size: 1rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.countdown {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #fef3c7;
  padding: 1rem;
  border-radius: 12px;
  margin: 1rem 0;
}

.countdown-text {
  font-size: 1.125rem;
  font-weight: 600;
  color: #92400e;
}

.class-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 1rem 0;
}

.detail {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.class-materials {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.class-materials h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.class-materials ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.class-materials li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.class-materials li:last-child {
  border-bottom: none;
}

.class-materials a {
  color: #4f46e5;
  text-decoration: none;
  font-size: 0.875rem;
}

.class-materials a:hover {
  text-decoration: underline;
}

.card-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn-large {
  flex: 1;
  padding: 1rem;
  font-size: 1rem;
}

@media (max-width: 640px) {
  .card-actions {
    flex-direction: column;
  }

  .btn-large {
    width: 100%;
  }
}
```

---

## 🎯 COMPONENTE 3: CARD DE PROGRESSO

### Visual

```
┌─────────────────────────────────────────────┐
│ 📈 Seu Progresso                            │
├─────────────────────────────────────────────┤
│                                             │
│          ╱‾‾‾‾‾‾‾‾╲                         │
│        ╱    75%     ╲                       │
│       │              │                      │
│        ╲____________╱                        │
│      do seu objetivo                        │
│        concluído                            │
│                                             │
│   Suas Metas:                               │
│   ━━━━━━━━━━━━━━━ 100%  ✓ Fluência oral    │
│   ━━━━━━━━━━━━━── 85%   • Gramática       │
│   ━━━━━━━━──────── 60%   • Vocabulário     │
│                                             │
│   📚 15 aulas   ⏰ 22h de estudo            │
└─────────────────────────────────────────────┘
```

### Especificação Técnica

**Arquivo:** `ProgressCard.tsx`

```typescript
interface Goal {
  id: string;
  name: string;
  progress: number;
  status: 'active' | 'completed';
}

interface ProgressCardProps {
  overallProgress: number;
  goals: Goal[];
  totalClasses: number;
  totalHours: number;
}

function ProgressCard({ overallProgress, goals, totalClasses, totalHours }: ProgressCardProps) {
  return (
    <div className="progress-card card-elevated">
      {/* Header */}
      <div className="card-header">
        <TrendingUp className="w-5 h-5 text-green-600" />
        <h2>Seu Progresso</h2>
      </div>

      {/* Overall Progress */}
      <div className="overall-progress">
        <CircularProgress
          percentage={overallProgress}
          size={140}
          strokeWidth={12}
          color="#10b981"
        />
        <div className="progress-label">
          <p className="text-sm text-gray-600">do seu objetivo</p>
          <p className="text-sm text-gray-600">concluído</p>
        </div>
      </div>

      {/* Goals */}
      <div className="goals-section">
        <h4>Suas Metas:</h4>
        {goals.map(goal => (
          <div key={goal.id} className="goal-item">
            <div className="goal-header">
              <span className="goal-name">{goal.name}</span>
              <span className="goal-percentage">{goal.progress}%</span>
              {goal.status === 'completed' && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
            <ProgressBar
              percentage={goal.progress}
              color={goal.status === 'completed' ? '#10b981' : '#6366f1'}
            />
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <div>
            <span className="stat-number">{totalClasses}</span>
            <span className="stat-label">aulas</span>
          </div>
        </div>
        <div className="stat">
          <Clock className="w-5 h-5 text-purple-600" />
          <div>
            <span className="stat-number">{totalHours}h</span>
            <span className="stat-label">de estudo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar: CircularProgress
function CircularProgress({ percentage, size, strokeWidth, color }: any) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-gray-900">{percentage}%</span>
      </div>
    </div>
  );
}

// Componente auxiliar: ProgressBar
function ProgressBar({ percentage, color }: any) {
  return (
    <div className="progress-bar-container">
      <div className="progress-bar-bg">
        <div
          className="progress-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );
}
```

**Estilos:**
```css
.overall-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 0;
}

.progress-label {
  margin-top: 1rem;
  text-align: center;
}

.goals-section {
  margin-top: 1.5rem;
}

.goals-section h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
}

.goal-item {
  margin-bottom: 1rem;
}

.goal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.goal-name {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}

.goal-percentage {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 600;
}

.progress-bar-container {
  width: 100%;
}

.progress-bar-bg {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.5s ease-out;
}

.quick-stats {
  display: flex;
  gap: 1.5rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.stat {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-number {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  display: block;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  display: block;
}
```

---

## 🎯 PALETA DE CORES COMPLETA

```css
:root {
  /* Cores Primárias - Inspiração em Aprendizado */
  --primary-50: #eef2ff;
  --primary-100: #e0e7ff;
  --primary-200: #c7d2fe;
  --primary-300: #a5b4fc;
  --primary-400: #818cf8;
  --primary-500: #6366f1;  /* PRINCIPAL */
  --primary-600: #4f46e5;
  --primary-700: #4338ca;
  --primary-800: #3730a3;
  --primary-900: #312e81;

  /* Cores de Sucesso - Motivação e Crescimento */
  --success-50: #ecfdf5;
  --success-100: #d1fae5;
  --success-200: #a7f3d0;
  --success-300: #6ee7b7;
  --success-400: #34d399;
  --success-500: #10b981;  /* PRINCIPAL */
  --success-600: #059669;
  --success-700: #047857;
  --success-800: #065f46;
  --success-900: #064e3b;

  /* Cores de Atenção - Prazos e Alertas */
  --warning-50: #fffbeb;
  --warning-100: #fef3c7;
  --warning-200: #fde68a;
  --warning-300: #fcd34d;
  --warning-400: #fbbf24;
  --warning-500: #f59e0b;  /* PRINCIPAL */
  --warning-600: #d97706;
  --warning-700: #b45309;
  --warning-800: #92400e;
  --warning-900: #78350f;

  /* Cores de Erro */
  --error-50: #fef2f2;
  --error-100: #fee2e2;
  --error-200: #fecaca;
  --error-300: #fca5a5;
  --error-400: #f87171;
  --error-500: #ef4444;  /* PRINCIPAL */
  --error-600: #dc2626;
  --error-700: #b91c1c;
  --error-800: #991b1b;
  --error-900: #7f1d1d;

  /* Tons Neutros - Backgrounds e Textos */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;

  /* Sombras */
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

  /* Animações */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 500ms cubic-bezier(0.4, 0, 0.2, 1);

  /* Bordas */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;
}
```

---

## 🎯 ESTILOS GLOBAIS DE CARDS

```css
/* Card Base */
.card {
  background: white;
  border-radius: var(--radius-xl);
  padding: 1.5rem;
  transition: all var(--transition-normal);
}

/* Card com elevação */
.card-elevated {
  box-shadow: var(--shadow-md);
}

.card-elevated:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

/* Card em destaque (featured) */
.card-featured {
  border: 2px solid var(--primary-500);
  position: relative;
  overflow: hidden;
}

.card-featured::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary-500), var(--primary-700));
}

/* Header do card */
.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--gray-200);
}

.card-header h2 {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--gray-900);
  margin: 0;
}

/* Conteúdo do card */
.card-content {
  margin-bottom: 1.25rem;
}

/* Ações do card */
.card-actions {
  display: flex;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--gray-200);
}

/* Responsividade dos cards */
@media (max-width: 768px) {
  .card {
    padding: 1.25rem;
  }

  .card-actions {
    flex-direction: column;
  }

  .card-actions button {
    width: 100%;
  }
}
```

---

## 🎯 BOTÕES PADRONIZADOS

```css
/* Base button */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: var(--radius-lg);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  outline: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Primary button */
.btn-primary {
  background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
  color: white;
  box-shadow: var(--shadow-sm);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

/* Secondary button */
.btn-secondary {
  background: white;
  color: var(--gray-700);
  border: 1px solid var(--gray-300);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--gray-50);
  border-color: var(--gray-400);
}

/* Icon button */
.btn-icon {
  padding: 0.5rem;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--gray-600);
}

.btn-icon:hover:not(:disabled) {
  background: var(--gray-100);
  color: var(--gray-900);
}

/* Large button */
.btn-large {
  padding: 1rem 2rem;
  font-size: 1rem;
}

/* Success button */
.btn-success {
  background: var(--success-500);
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: var(--success-600);
}

/* Danger button */
.btn-danger {
  background: var(--error-500);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: var(--error-600);
}
```

---

## 📱 RESPONSIVIDADE

### Breakpoints

```css
/* Mobile First Approach */
:root {
  --breakpoint-sm: 640px;  /* Small devices */
  --breakpoint-md: 768px;  /* Medium devices */
  --breakpoint-lg: 1024px; /* Large devices */
  --breakpoint-xl: 1280px; /* Extra large devices */
  --breakpoint-2xl: 1536px; /* 2X Extra large devices */
}
```

### Grid System

```css
/* Container responsivo */
.container {
  width: 100%;
  max-width: var(--breakpoint-2xl);
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .container {
    padding: 0 1.5rem;
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 0 2rem;
  }
}

/* Grid de cards */
.cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

**Última atualização:** 27/12/2024
**Próximo passo:** Implementar componentes no código
