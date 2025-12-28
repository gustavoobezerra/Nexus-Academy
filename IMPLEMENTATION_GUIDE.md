# 🚀 GUIA RÁPIDO DE IMPLEMENTAÇÃO - NEXUS ACADEMY

## 📚 ÍNDICE

1. [Começando](#começando)
2. [Refatorando Componentes Existentes](#refatorando-componentes-existentes)
3. [Criando Novos Componentes](#criando-novos-componentes)
4. [Implementando Features](#implementando-features)
5. [Testando](#testando)
6. [Deploy](#deploy)

---

## 🎯 COMEÇANDO

### Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn
- Git
- Editor de código (VS Code recomendado)

### Estrutura do Projeto

```
nexus-academy/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── StudentPortal/    ← Componentes do portal do aluno
│   │   │   ├── ui/                ← Componentes reutilizáveis
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   └── useApi.ts          ← ✨ NOVO: Hooks personalizados
│   │   ├── lib/
│   │   │   └── api.ts             ← ✅ ATUALIZADO: APIs organizadas
│   │   ├── services/
│   │   │   └── api.service.ts     ← ✨ NOVO: Serviço centralizado
│   │   └── ...
│   └── ...
├── backend/
│   └── ...
├── REFACTORING_PROGRESS.md        ← ✨ NOVO: Progresso da refatoração
├── DASHBOARD_REDESIGN_SPEC.md     ← ✨ NOVO: Specs do redesign
└── IMPLEMENTATION_GUIDE.md         ← Você está aqui!
```

### Instalando Dependências

```bash
cd frontend
npm install
```

### Rodando o Projeto

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## 🔧 REFATORANDO COMPONENTES EXISTENTES

### Passo a Passo para Refatorar um Componente

#### Exemplo: Refatorar `AIAssistant.tsx`

**1. Identificar chamadas de API existentes**

Abra `frontend/src/components/AIAssistant.tsx` e procure por:
- `fetch(`
- `const response = await`
- `try/catch` blocks

**2. Importar a API correspondente**

```typescript
// ADICIONAR no topo do arquivo:
import { aiAssistantAPI } from '../lib/api';
```

**3. Substituir fetch direto por chamada da API**

**ANTES:**
```typescript
const loadHistory = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/ai-assistant/history`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success && data.history) {
      setMessages(data.history);
    }
  } catch (error) {
    console.error('Error loading history:', error);
  }
};
```

**DEPOIS:**
```typescript
const loadHistory = async () => {
  try {
    const data = await aiAssistantAPI.getHistory();
    // Erro já tratado automaticamente pelo interceptor!
    if (data.history) {
      setMessages(data.history);
    }
  } catch (error) {
    // Erro já mostrado para o usuário via toast
    // Apenas fallback se necessário
  }
};
```

**4. OU usar hooks para simplificar ainda mais**

**MELHOR AINDA:**
```typescript
import { useApi } from '../hooks/useApi';

function AIAssistant() {
  const { data: history, loading, refetch } = useApi('/ai-assistant/history', {
    immediate: true,
    onSuccess: (data) => {
      if (data.history) {
        setMessages(data.history);
      }
    }
  });

  // ... resto do componente
}
```

**5. Testar**

- Verifique se o componente carrega corretamente
- Teste com servidor offline (deve mostrar mensagem amigável)
- Teste com token inválido (deve redirecionar para login)
- Teste fluxo de sucesso

---

### Template de Refatoração

Use este template para refatorar qualquer componente:

```typescript
// 1. IMPORTS
import { useState, useEffect } from 'react';
import { useApi, useApiMutation } from '../../hooks/useApi';
import { [nomeAPI] } from '../../lib/api';
import toast from 'react-hot-toast';

// 2. INTERFACES
interface Props {
  // ...
}

// 3. COMPONENTE
function ComponentName({ props }: Props) {
  // 3a. USAR HOOKS PARA GET
  const { data, loading, error, refetch } = useApi<DataType>(
    '/endpoint',
    {
      immediate: true,
      onSuccess: (data) => {
        // Callback de sucesso opcional
      }
    }
  );

  // 3b. USAR useApiMutation PARA POST/PUT/DELETE
  const { mutate: updateData, loading: updating } = useApiMutation<Response, Params>(
    'PUT',
    '/endpoint',
    {
      onSuccess: (result) => {
        toast.success('✨ Atualizado com sucesso!');
        refetch(); // Recarregar dados se necessário
      }
    }
  );

  // 3c. HANDLERS
  const handleSubmit = async (formData: any) => {
    await updateData(formData);
  };

  // 3d. RENDER
  if (loading) return <Loading />;
  if (error) return <ErrorState />;
  if (!data) return <EmptyState />;

  return (
    <div>
      {/* UI aqui */}
    </div>
  );
}

export default ComponentName;
```

---

## 🎨 CRIANDO NOVOS COMPONENTES

### Componente: NextClassCard

Vamos criar o card de "Próxima Aula" do zero.

**1. Criar arquivo**

```bash
touch frontend/src/components/StudentPortal/NextClassCard.tsx
```

**2. Estrutura base**

```typescript
import { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MessageSquare } from 'lucide-react';

interface NextClassCardProps {
  class: {
    id: string;
    subject: string;
    topic?: string;
    startTime: string;
    endTime: string;
    type: 'online' | 'presencial';
  };
  onJoin: (classId: string) => void;
  onMessage: () => void;
}

export function NextClassCard({ class: nextClass, onJoin, onMessage }: NextClassCardProps) {
  const [timeUntil, setTimeUntil] = useState('');

  // Calcular countdown
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
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [nextClass.startTime]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-indigo-500">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b">
        <Calendar className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-gray-900">Próxima Aula</h2>
      </div>

      {/* Content */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">
          {nextClass.subject}
        </h3>
        {nextClass.topic && (
          <p className="text-gray-600 mb-4">{nextClass.topic}</p>
        )}

        {/* Countdown */}
        <div className="flex items-center gap-2 bg-yellow-50 px-4 py-3 rounded-xl mb-4">
          <Clock className="w-5 h-5 text-orange-500 animate-pulse" />
          <span className="text-lg font-semibold text-orange-900">
            Começa em {timeUntil}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => onJoin(nextClass.id)}
            className="flex-1 bg-indigo-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
          >
            <Video className="w-5 h-5" />
            Entrar na Sala
          </button>
          <button
            onClick={onMessage}
            className="bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

**3. Usar no Dashboard**

```typescript
// Em StudentPortalDashboard.tsx
import { NextClassCard } from './NextClassCard';

function StudentPortalDashboard() {
  const { data: classes } = useApi('/portal/classes?limit=1');
  const nextClass = classes?.[0];

  return (
    <div>
      {nextClass && (
        <NextClassCard
          class={nextClass}
          onJoin={(id) => navigate(`/portal/class/${id}`)}
          onMessage={() => navigate('/portal/chat')}
        />
      )}
    </div>
  );
}
```

---

## 🎮 IMPLEMENTANDO FEATURES

### Feature: Sistema de Gamificação

#### Backend

**1. Criar Model de Achievement**

```bash
touch backend/models/Achievement.js
```

```javascript
const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  icon: String,
  category: {
    type: String,
    enum: ['progression', 'streak', 'excellence', 'exploration'],
    default: 'progression'
  },
  xpReward: {
    type: Number,
    default: 0
  },
  requirements: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Achievement', achievementSchema);
```

**2. Atualizar Model de Student**

```javascript
// Em backend/models/Student.js
// Adicionar:

progress: {
  totalXP: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  achievements: [{
    achievement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    },
    unlockedAt: { type: Date, default: Date.now }
  }],
  streak: { type: Number, default: 0 },
  lastStudyDate: Date
}
```

**3. Criar Serviço de Gamificação**

```bash
touch backend/services/gamification.service.js
```

```javascript
const Achievement = require('../models/Achievement');
const Student = require('../models/Student');

class GamificationService {
  // Verificar e desbloquear conquistas
  async checkAchievements(studentId, action, metadata = {}) {
    const student = await Student.findById(studentId).populate('progress.achievements.achievement');

    // Verificar diferentes tipos de conquistas
    switch (action) {
      case 'class_completed':
        await this.checkFirstClass(student);
        await this.checkClassMilestones(student);
        break;
      case 'streak_updated':
        await this.checkStreakAchievements(student);
        break;
      case 'perfect_score':
        await this.checkExcellenceAchievements(student);
        break;
    }
  }

  async checkFirstClass(student) {
    // Verificar se já tem a conquista "Primeira Aula"
    const hasAchievement = student.progress.achievements.some(
      a => a.achievement.code === 'FIRST_CLASS'
    );

    if (!hasAchievement) {
      await this.unlockAchievement(student._id, 'FIRST_CLASS');
    }
  }

  async unlockAchievement(studentId, achievementCode) {
    const achievement = await Achievement.findOne({ code: achievementCode });
    if (!achievement) return;

    const student = await Student.findById(studentId);

    // Adicionar achievement
    student.progress.achievements.push({
      achievement: achievement._id,
      unlockedAt: new Date()
    });

    // Adicionar XP
    student.progress.totalXP += achievement.xpReward;

    // Calcular nível (100 XP por nível)
    student.progress.level = Math.floor(student.progress.totalXP / 100) + 1;

    await student.save();

    return achievement;
  }
}

module.exports = new GamificationService();
```

**4. Criar Rotas**

```bash
touch backend/routes/gamification.routes.js
```

```javascript
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Achievement = require('../models/Achievement');
const Student = require('../models/Student');

// Listar todas as conquistas disponíveis
router.get('/achievements', authMiddleware, async (req, res) => {
  try {
    const achievements = await Achievement.find();
    const student = await Student.findById(req.user.id);

    const achievementsWithStatus = achievements.map(achievement => ({
      ...achievement.toObject(),
      unlocked: student.progress.achievements.some(
        a => a.achievement.toString() === achievement._id.toString()
      )
    }));

    res.json({
      success: true,
      achievements: achievementsWithStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar conquistas'
    });
  }
});

// Obter progresso do aluno
router.get('/progress', authMiddleware, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id)
      .populate('progress.achievements.achievement');

    res.json({
      success: true,
      progress: student.progress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar progresso'
    });
  }
});

module.exports = router;
```

**5. Criar Seeds de Conquistas**

```bash
touch backend/seeds/achievements.seed.js
```

```javascript
const Achievement = require('../models/Achievement');

const achievements = [
  {
    code: 'FIRST_CLASS',
    name: 'Primeira Aula',
    description: 'Completou sua primeira aula!',
    icon: '🎯',
    category: 'progression',
    xpReward: 50
  },
  {
    code: 'STREAK_7',
    name: 'Semana Completa',
    description: 'Estudou por 7 dias seguidos',
    icon: '🔥',
    category: 'streak',
    xpReward: 100
  },
  {
    code: 'PERFECT_SCORE',
    name: 'Perfeccionista',
    description: 'Tirou nota máxima em 5 avaliações',
    icon: '⭐',
    category: 'excellence',
    xpReward: 200
  },
  {
    code: 'MARATHONER',
    name: 'Maratonista',
    description: 'Completou 50 horas de estudo',
    icon: '⏰',
    category: 'progression',
    xpReward: 150
  },
  {
    code: 'EXPLORER',
    name: 'Explorador Curioso',
    description: 'Acessou todos os materiais disponíveis',
    icon: '🔍',
    category: 'exploration',
    xpReward: 75
  }
];

async function seedAchievements() {
  await Achievement.deleteMany({});
  await Achievement.insertMany(achievements);
  console.log('✅ Conquistas criadas com sucesso!');
}

module.exports = seedAchievements;
```

#### Frontend

**1. Adicionar API de Gamificação**

```typescript
// Em frontend/src/lib/api.ts
export const gamificationAPI = {
  getAchievements: () => apiService.get('/gamification/achievements'),
  getProgress: () => apiService.get('/gamification/progress'),
};
```

**2. Criar Componente de Conquistas**

```typescript
// frontend/src/components/StudentPortal/AchievementsPage.tsx
import { useApi } from '../../hooks/useApi';
import { gamificationAPI } from '../../lib/api';

export function AchievementsPage() {
  const { data, loading } = useApi('/gamification/achievements', {
    immediate: true
  });

  if (loading) return <Loading />;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Minhas Conquistas</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.achievements.map((achievement: any) => (
          <div
            key={achievement.code}
            className={`p-6 rounded-2xl border-2 transition-all ${
              achievement.unlocked
                ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-400'
                : 'bg-gray-100 border-gray-300 opacity-50'
            }`}
          >
            <div className="text-5xl mb-3 text-center">
              {achievement.icon}
            </div>
            <h3 className="text-lg font-bold text-center mb-2">
              {achievement.name}
            </h3>
            <p className="text-sm text-gray-600 text-center mb-3">
              {achievement.description}
            </p>
            <div className="text-center">
              <span className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold">
                +{achievement.xpReward} XP
              </span>
            </div>
            {achievement.unlocked && (
              <p className="text-xs text-green-600 text-center mt-2">
                ✓ Desbloqueada
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🧪 TESTANDO

### Testes Manuais

**Checklist de testes para cada componente refatorado:**

- [ ] Carregamento normal funciona
- [ ] Loading state aparece
- [ ] Mensagem de erro aparece quando servidor offline
- [ ] Redirecionamento acontece em 401
- [ ] Toast de sucesso aparece em mutações bem-sucedidas
- [ ] Toast de erro aparece em mutações com falha
- [ ] Retry automático funciona (testar com 500)
- [ ] Responsividade mobile funciona
- [ ] Não há warnings no console

### Testar Cenários de Erro

**1. Servidor Offline**
```bash
# Parar backend
# Testar frontend
# Deve mostrar: "🌐 Sem conexão com o servidor"
```

**2. Token Inválido**
```javascript
// No console do navegador:
localStorage.setItem('studentToken', 'token_invalido');
// Fazer qualquer ação autenticada
// Deve redirecionar para login
```

**3. Erro 500**
```javascript
// No backend, forçar erro em algum endpoint
throw new Error('Teste de erro 500');
// Frontend deve mostrar: "⚠️ Erro no servidor"
// E fazer retry automático
```

---

## 🚀 DEPLOY

### Frontend (Vercel)

```bash
# 1. Build de produção
cd frontend
npm run build

# 2. Deploy
vercel --prod
```

### Backend (Railway/Heroku)

```bash
# 1. Commit mudanças
git add .
git commit -m "feat: novo sistema de API e gamificação"

# 2. Deploy
git push railway main
# ou
git push heroku main
```

### Variáveis de Ambiente

**Frontend (.env.production):**
```
VITE_API_URL=https://seu-backend.railway.app/api
```

**Backend (.env):**
```
MONGODB_URI=sua_connection_string
JWT_SECRET=seu_secret_jwt
GOOGLE_API_KEY=sua_api_key_gemini
```

---

## 📚 RECURSOS ÚTEIS

### Documentação

- [React Hooks](https://react.dev/reference/react)
- [Axios](https://axios-http.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

### Ferramentas de Debug

```javascript
// Ativar logs detalhados em desenvolvimento
// Em api.service.ts, os logs já estão configurados para DEV

// Ver estado do React com DevTools
// Instalar: React Developer Tools (Chrome/Firefox extension)

// Ver network requests
// Chrome DevTools > Network tab
```

### Padrões de Código

**Sempre:**
- Use TypeScript para type safety
- Use hooks do useApi para GET requests
- Use useApiMutation para POST/PUT/DELETE
- Adicione loading states
- Adicione empty states
- Use toasts para feedback
- Adicione emojis em mensagens de usuário
- Comente código complexo

**Nunca:**
- Não use `fetch()` direto (sempre use apiService)
- Não use `alert()` (use toast)
- Não deixe console.log em produção
- Não faça chamadas API em loops
- Não ignore erros de TypeScript

---

## 🎯 PRÓXIMOS PASSOS

**Curto Prazo (Esta Semana):**
1. ✅ Refatorar StudentPortalDashboard.tsx
2. ✅ Refatorar StudentProfile.tsx
3. ✅ Refatorar ChatSystem.tsx
4. Testar fluxos críticos

**Médio Prazo (Próximas 2 Semanas):**
1. Implementar gamificação completa
2. Criar novos componentes do dashboard
3. Implementar chat aprimorado
4. Sistema de anotações em vídeo

**Longo Prazo (Próximo Mês):**
1. Flashcards com repetição espaçada
2. Recomendações com IA
3. Dashboard de performance
4. Testes automatizados

---

## ❓ FAQ

**P: Como sei se devo usar useApi ou useApiMutation?**
R: Use `useApi` para GET (carregar dados). Use `useApiMutation` para POST/PUT/PATCH/DELETE (modificar dados).

**P: E se eu precisar fazer múltiplas requisições?**
R: Use múltiplos hooks ou `Promise.all` com apiService diretamente.

**P: Como funciona o retry automático?**
R: O interceptor tenta automaticamente até 3 vezes para erros 500/502/503 com delay exponencial.

**P: Posso ainda usar fetch() diretamente?**
R: Tecnicamente sim, mas não é recomendado. Use apiService para consistência.

**P: Como adicionar nova API?**
R: Adicione em `lib/api.ts` seguindo o padrão existente.

---

**Última atualização:** 27/12/2024
**Mantenedor:** Equipe Nexus Academy
**Contato:** [seu@email.com]

