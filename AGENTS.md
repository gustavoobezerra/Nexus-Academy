# Nexus Academy AGENTS

## Leia primeiro

Use este arquivo como ponto de entrada rapido para qualquer IA que entrar no repositorio. Ele nao substitui a documentacao longa; ele resume o que e canonico, o que costuma quebrar e onde aprofundar.

Se precisar delegar, paralelizar ou administrar subagentes, consulte a skill local `nexus-agent-ops` em `.agent/skills/nexus-agent-ops/SKILL.md`.

## Snapshot do projeto

- Produto: plataforma SaaS educacional com area do professor, portal do aluno e AI Hub.
- Estrutura principal:
  - `frontend/`: React 19 + TypeScript + Vite.
  - `backend-core/`: Node.js + Express + MongoDB/Mongoose.
  - `docs/`: documentacao longa do projeto.
  - `.agent/skills/`: skills do workspace e colecao de terceiros.

## Onde comecar

1. Leia este arquivo.
2. Se precisar de visao ampla do produto e da arquitetura, abra `docs/PROJETO_COMPLETO.md`.
3. Se o assunto envolver AI Hub, busca unificada, sinais de aprendizagem ou portal/atividades, abra `docs/AI_HUB_DADOS_E_SINAIS.md`.
4. Se o assunto for setup, scripts e comandos gerais, consulte `README.md`.

## Entrypoints canonicos

- Frontend:
  - bootstrap: `frontend/src/main.tsx`
  - shell principal e roteamento vivo: `frontend/src/AppWithRouter.tsx`
  - componente wrapper legado: `frontend/src/App.tsx`
- Backend:
  - servidor principal usado por `npm start` e `npm run dev`: `backend-core/src/server-prod.js`
  - variantes auxiliares existem (`server.js`, `server-simple.js`), mas nao sao o caminho principal desta rodada.
- AI Hub:
  - componentes ativos: `frontend/src/components/ai-hub`
  - hidratacao compartilhada do professor: `frontend/src/hooks/useTeacherWorkspaceData.ts`
  - contrato central: `GET /api/ai/workspace-data`
- Portal do aluno:
  - componentes ativos: `frontend/src/components/StudentPortal`
  - auth e onboarding dependem do backend em `backend-core/src/routes/portal` e rotas relacionadas.

## Superficies canonicas

- Area do professor:
  - shell, navegacao e leitura de workspace em `AppWithRouter`
  - AI Hub, alunos, aulas, mensagens, analytics e operacao vivem no frontend principal.
- Portal do aluno:
  - login, onboarding, atividades, pronuncia e dashboard vivem na pasta `StudentPortal`.
- Backend:
  - rotas, controllers, services e models ficam em `backend-core/src`.
  - multi-tenant, auth e filtros de ownership sao preocupacoes centrais.

## Comandos essenciais

### Backend

- `cd backend-core`
- `npm run dev`
- `npm test`
- `npm run seed`

### Frontend

- `cd frontend`
- `npm run dev`
- `npm run build`
- `npm run test:e2e`

## Dados demo e testes

- Professor demo usado pelos E2E:
  - email: `demo@nexus.com`
  - senha: `Nexus@123`
- Aluno demo usado pelos fluxos do portal:
  - email: `aluno.demo@nexus.com`
  - senha: `Aluno@123`
- Fontes uteis:
  - `frontend/e2e/ai-hub.spec.ts`
  - `frontend/e2e/portal.spec.ts`
  - `backend-core/src/__tests__/aiHubSignals.test.js`
  - `backend-core/src/dev/ensureDemoData.js`

## Regras para agentes

- Explore antes de editar. O projeto tem codigo legado convivendo com fluxos ativos.
- Nao trate todo componente existente como superficie viva. Para o shell do professor, `AppWithRouter` e a pasta `frontend/src/components/ai-hub` sao as ancoras principais.
- Para backend, parta de `server-prod.js` e siga para rotas e services relevantes.
- Quando o pedido envolver paralelismo, subagentes, ownership, handoff ou memoria operacional, use a skill local `nexus-agent-ops`.
- Skills customizadas do projeto vivem em `.agent/skills/<nome>`. Elas nao entram automaticamente no indice gerado de `.agent/skills/skills_index.json`.
- Nao confunda a colecao de terceiros em `.agent/skills/skills/` com as skills customizadas do Nexus.
- Respeite worktree suja: pode haver mudancas locais do usuario fora do seu escopo.

## Memoria viva

### Decisoes atuais

- O shell canonico do professor e `frontend/src/AppWithRouter.tsx`.
- O servidor canonico do backend nesta rodada e `backend-core/src/server-prod.js`.
- O contrato mais importante para o AI Hub e `GET /api/ai/workspace-data`.
- A pasta `frontend/src/components/ai-hub` representa a camada ativa do AI Hub refatorado.
- Skills locais do Nexus hoje:
  - `.agent/skills/nexus-academy-review-specialist`
  - `.agent/skills/nexus-system-audit`
  - `.agent/skills/nexus-agent-ops`

### Riscos recorrentes

- drift entre contrato de frontend e payload real do backend;
- confusao entre caminhos legados e fluxos ativos;
- regressao de fallback/estado do AI Hub quando provider falha;
- inconsistencias entre resumo e detalhe no portal do aluno;
- dados demo e E2E ficando desalinhados da experiencia real.

### Arquivos-fonte confiaveis

- `README.md`
- `docs/PROJETO_COMPLETO.md`
- `docs/AI_HUB_DADOS_E_SINAIS.md`
- `CATALOGO_SKILLS.md`

## Atualize este arquivo quando

- o entrypoint principal do frontend ou backend mudar;
- o fluxo canonico do professor, portal ou AI Hub mudar;
- o contrato de `GET /api/ai/workspace-data` mudar materialmente;
- surgir nova skill customizada do projeto ou alguma skill local deixar de existir;
- credenciais demo, seed ou comandos principais de validacao mudarem;
- uma descoberta estrutural importante merecer memoria persistente para futuras IAs.
