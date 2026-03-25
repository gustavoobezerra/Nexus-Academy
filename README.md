# 🎓 Nexus Academy - Plataforma SaaS Educacional

**Nexus Academy** é uma plataforma completa SaaS de aprendizagem (LMS), projetada para escolas de idiomas, cursos profissionalizantes e professores independentes.

## 🌟 Principais Funcionalidades

### 👨‍🏫 Para Professores
- **Dashboard Completo** com métricas em tempo real
- **Gestão de Alunos** (cadastro, perfis, histórico)
- **Agendamento de Aulas** com calendário integrado
- **Videoconferência ao Vivo** (Daily.co + Jitsi)
- **Automações com IA** (geração de conteúdo, insights)
- **Gestão Financeira** (pagamentos, assinaturas via Stripe)
- **Relatórios e Analytics** avançados
- **Sistema de Chat** em tempo real
- **Biblioteca de Conteúdo** com upload de materiais
- **Geração de Certificados** automática

### 👨‍🎓 Para Alunos (Portal)
- **Portal do Estudante** personalizado
- **Acesso às Aulas** gravadas e ao vivo
- **Quiz Interativos** com feedback instantâneo
- **Acompanhamento de Progresso** visual
- **Chat com Professor**
- **Certificados Digitais**

### 🤖 IA e Automação
- **Assistente Virtual** com sugestões pedagógicas
- **Geração Automática de Atividades**
- **Transcrição de Aulas** (AssemblyAI)
- **Insights de Desempenho**
- **Agendamento Inteligente**

## 🏗️ Arquitetura

### Backend (Node.js + Express)
```
backend-core/
├── src/
│   ├── config/         # Configurações (DB, cache, etc)
│   ├── controllers/    # Lógica de negócios
│   ├── middleware/     # Auth, validação, error handling
│   ├── models/         # Schemas Mongoose
│   ├── routes/         # Endpoints API
│   ├── services/       # Serviços externos e automações
│   ├── utils/          # Helpers e utilidades
│   └── server.js       # Entry point
├── .env                # Variáveis de ambiente
└── package.json
```

**Stack:**
- Express.js (framework web)
- MongoDB + Mongoose (banco de dados)
- Socket.IO (WebSockets para chat e live classes)
- Redis (cache - opcional)
- JWT (autenticação)
- Stripe (pagamentos)
- Cloudinary (upload de arquivos)
- AssemblyAI (transcrição)
- Daily.co (videoconferência)
- Resend (emails)

### Frontend (React + TypeScript + Vite)
```
frontend/
├── src/
│   ├── components/     # Componentes React
│   ├── context/        # Context API (Theme, Auth)
│   ├── services/       # APIs e integrações
│   ├── store/          # Zustand stores
│   ├── types/          # TypeScript types
│   ├── App.tsx         # Componente principal
│   └── main.tsx        # Entry point
├── public/             # Assets estáticos
└── package.json
```

**Stack:**
- React 19.2
- TypeScript 5.9
- Vite 7.2 (build tool)
- TailwindCSS (estilização)
- Zustand (state management)
- React Query (data fetching)
- Socket.IO Client (WebSockets)
- Framer Motion (animações)
- Chart.js + Recharts (gráficos)

## 🚀 Início Rápido

### Pré-requisitos
- Node.js >= 18.0.0
- MongoDB (local ou Atlas)
- Conta Stripe (modo test)
- Conta Cloudinary
- Conta Resend
- Conta Daily.co
- Conta AssemblyAI

### 1. Clonar o Repositório
```bash
git clone https://github.com/gustavoobezerra/Nexus-Academy.git
cd Nexus-Academy
```

### 2. Configurar Backend
```bash
cd backend-core
npm install

# Copie e configure o .env
cp .env.example .env
# Edite .env com suas credenciais
```

**Variáveis Obrigatórias (.env):**
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=sua-chave-secreta-forte
ENCRYPTION_KEY=sua-chave-encryption-forte
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:5000
```

### 3. Configurar Frontend
```bash
cd ../frontend
npm install

# Crie o .env
echo "VITE_API_URL=http://localhost:5000" > .env
```

### 4. Iniciar Aplicação

**Terminal 1 - Backend:**
```bash
cd backend-core
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Acesse: **http://localhost:5173**

### 5. Popular Domínio Demo Canônico
```bash
cd backend-core
npm run seed
```

**Credenciais demo:**
- Professor: `demo@nexus.com` / `Nexus@123`
- Aluno: `aluno.demo@nexus.com` / `Aluno@123`

## 📦 Deploy

Veja o guia completo em **[DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)**

### Deploy Rápido no Render

1. Faça push do código para GitHub
2. Acesse [Render Dashboard](https://dashboard.render.com)
3. New → Blueprint
4. Conecte seu repositório
5. Configure variáveis de ambiente
6. Deploy!

O arquivo `render.yaml` já está configurado.

## 🧪 Testes

```bash
# Backend
cd backend-core
npm test                # Todos os testes
npm run test:watch      # Watch mode
npm run test:coverage   # Com coverage

# Frontend
cd frontend
npm run test:e2e        # Testes E2E com Playwright
```

## 📚 Documentação da API

Após iniciar o backend, acesse:

**Swagger UI:** http://localhost:5000/api-docs

Endpoints principais:
- `POST /api/auth/register` - Registrar professor
- `POST /api/auth/login` - Login
- `GET /api/students` - Listar alunos
- `POST /api/classes` - Criar aula
- `GET /api/analytics/dashboard` - Métricas

## 🛠️ Scripts Úteis

### Backend
```bash
npm run dev              # Desenvolvimento com hot reload
npm start               # Produção
npm run validate-env    # Validar variáveis de ambiente
npm run deploy:check    # Verificar tudo antes de deploy
npm run seed            # Popular banco com dados de teste
```

### Frontend
```bash
npm run dev             # Desenvolvimento
npm run build           # Build para produção
npm run preview         # Preview do build
npm run lint            # Linter
```

## 🔐 Segurança

- ✅ Autenticação JWT
- ✅ Rate limiting
- ✅ Helmet.js (headers de segurança)
- ✅ CORS configurado
- ✅ Validação de inputs
- ✅ Sanitização de dados
- ✅ Criptografia de dados sensíveis
- ✅ HTTPS obrigatório em produção

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC.

## 📞 Suporte

- **Issues:** [GitHub Issues](https://github.com/gustavoobezerra/Nexus-Academy/issues)
- **Email:** suporte@nexus-academy.com

## 🗺️ Roadmap

- [ ] App Mobile (React Native)
- [ ] Integração com Google Classroom
- [ ] Gamificação avançada
- [ ] Multi-tenant (suporte para múltiplas escolas)
- [ ] Análise preditiva com ML
- [ ] Marketplace de conteúdo

---

**Desenvolvido com ❤️ para revolucionar a educação online**
