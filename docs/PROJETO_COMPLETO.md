# Projeto Completo: Nexus Academy

## 1. Visão Geral

O **Nexus Academy** é uma plataforma SaaS educacional com duas superfícies principais:

- **Área do professor**: operação diária, agenda, alunos, analytics, automações e finanças.
- **Portal do aluno**: login, onboarding, progresso, aulas, pagamentos e recursos interativos.

O projeto está dividido em dois blocos:

- [frontend](C:/Users/User/Desktop/Nexus-Academy/frontend): aplicação React + TypeScript + Vite.
- [backend-core](C:/Users/User/Desktop/Nexus-Academy/backend-core): API Node.js + Express com MongoDB/Mongoose.

Também existem recursos auxiliares no repositório:

- [README.md](C:/Users/User/Desktop/Nexus-Academy/README.md): visão geral e comandos principais.
- [render.yaml](C:/Users/User/Desktop/Nexus-Academy/render.yaml): blueprint de deploy.
- [CATALOGO_SKILLS.md](C:/Users/User/Desktop/Nexus-Academy/CATALOGO_SKILLS.md): catálogo local de skills usadas no ecossistema do projeto.
- [AI_HUB_DADOS_E_SINAIS.md](C:/Users/User/Desktop/Nexus-Academy/docs/AI_HUB_DADOS_E_SINAIS.md): mapa técnico da busca unificada, event store pedagógico e rotas novas do AI Hub/portal.
- [.agent/skills](C:/Users/User/Desktop/Nexus-Academy/.agent/skills): coleção local de skills instalada no workspace.

## 2. Stack Técnica

### Frontend

- React 19
- TypeScript 5.9
- Vite 7
- TailwindCSS 3
- Zustand
- React Query
- Framer Motion
- Chart.js + Recharts
- Playwright

### Backend

- Node.js 18+
- Express
- MongoDB + Mongoose
- JWT
- Socket.IO
- Stripe
- Cloudinary
- Redis opcional
- Resend
- Swagger
- Jest + Supertest

## 3. Estrutura do Repositório

### Raiz

- [frontend](C:/Users/User/Desktop/Nexus-Academy/frontend): interface web principal.
- [backend-core](C:/Users/User/Desktop/Nexus-Academy/backend-core): API e lógica de negócio.
- [.agent](C:/Users/User/Desktop/Nexus-Academy/.agent): ecossistema local de skills.
- [.claude](C:/Users/User/Desktop/Nexus-Academy/.claude): worktrees e metadados auxiliares.
- [.github](C:/Users/User/Desktop/Nexus-Academy/.github): configuração de GitHub.
- [.vscode](C:/Users/User/Desktop/Nexus-Academy/.vscode): configuração de editor.

### Frontend

- [src/main.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/main.tsx): bootstrap da aplicação.
- [src/AppWithRouter.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/AppWithRouter.tsx): orquestra login, shell autenticado, portal do aluno e páginas públicas.
- [src/index.css](C:/Users/User/Desktop/Nexus-Academy/frontend/src/index.css): tokens globais, tipografia, superfícies e utilitários visuais.
- [src/context](C:/Users/User/Desktop/Nexus-Academy/frontend/src/context): contextos como tema.
- [src/store](C:/Users/User/Desktop/Nexus-Academy/frontend/src/store): estado compartilhado do frontend.
- [src/lib](C:/Users/User/Desktop/Nexus-Academy/frontend/src/lib): wrappers de API, paleta e utilitários de integração.
- [src/services](C:/Users/User/Desktop/Nexus-Academy/frontend/src/services): serviços de automação, alertas, IA e transporte HTTP.
- [src/hooks](C:/Users/User/Desktop/Nexus-Academy/frontend/src/hooks): hooks reutilizáveis.
- [src/components](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components): componentes da área do professor.
- [src/components/ai-hub](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ai-hub): workspaces canônicos do AI Hub refatorado.
- [src/components/onboarding](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/onboarding): fluxo de onboarding do professor.
- [src/components/StudentPortal](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/StudentPortal): portal do aluno.
- [src/components/ui](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ui): helpers visuais, animações e componentes base.
- [e2e](C:/Users/User/Desktop/Nexus-Academy/frontend/e2e): testes E2E com Playwright.

### Backend

- [src/server-prod.js](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/server-prod.js): servidor principal usado pelo script `npm start`.
- [src/server.js](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/server.js): variante adicional de servidor.
- [src/server-simple.js](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/server-simple.js): variante simplificada.
- [src/routes](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/routes): rotas da API.
- [src/controllers](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/controllers): orquestração de casos de uso.
- [src/models](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/models): modelos Mongoose.
- [src/services](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/services): integrações externas e serviços internos.
- [src/middleware](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/middleware): autenticação, isolamento, sanitização e interceptadores.
- [src/utils](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/utils): helpers.
- [src/socket](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/socket): camada socket/web realtime.
- [src/__tests__](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/__tests__): testes automatizados do backend.

## 4. Frontend em Detalhe

### Entradas e superfícies principais

- [src/components/LoginPage.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/LoginPage.tsx): tela inicial com escolha de perfil.
- [src/components/TeacherLogin.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/TeacherLogin.tsx): login e cadastro do professor.
- [src/components/Dashboard.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/Dashboard.tsx): dashboard principal do professor.
- [src/components/BrandLogo.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/BrandLogo.tsx): resolução centralizada dos assets de marca.
- [src/components/ui/Animations.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ui/Animations.tsx): helpers de reveal e motion.

### Estado e contratos críticos

- [src/store/authStore.ts](C:/Users/User/Desktop/Nexus-Academy/frontend/src/store/authStore.ts): persiste `token` e `user` no `localStorage`.
- [src/context/ThemeContext.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/context/ThemeContext.tsx): controla o tema e sincroniza classes `dark`/`light`.
- [src/lib/api.ts](C:/Users/User/Desktop/Nexus-Academy/frontend/src/lib/api.ts): catálogo principal de wrappers de API.
- [src/hooks/useTeacherWorkspaceData.ts](C:/Users/User/Desktop/Nexus-Academy/frontend/src/hooks/useTeacherWorkspaceData.ts): hidrata a camada compartilhada de dados reais do professor usada pelo AI Hub.
- [src/types.ts](C:/Users/User/Desktop/Nexus-Academy/frontend/src/types.ts): tipos globais do frontend.
- [src/components/ui/SearchableSelect.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ui/SearchableSelect.tsx): combobox leve e pesquisável adotado nos fluxos reais do AI Hub.

### Grupos funcionais importantes

- Gestão de alunos:
  [src/components/Students.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/Students.tsx)
  [src/components/StudentGroupsManager.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/StudentGroupsManager.tsx)
- Aulas e live:
  [src/components/Classes.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/Classes.tsx)
  [src/components/DailyLiveClass.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/DailyLiveClass.tsx)
  [src/components/JitsiLiveClass.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/JitsiLiveClass.tsx)
- Financeiro e analytics:
  [src/components/Financial.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/Financial.tsx)
  [src/components/TeacherAnalyticsDashboard.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/TeacherAnalyticsDashboard.tsx)
- Comunicação e automação:
  [src/components/AutomationCenter.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/AutomationCenter.tsx)
  [src/components/AutomationManager.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/AutomationManager.tsx)
  [src/components/MessageTemplatesManager.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/MessageTemplatesManager.tsx)
- IA:
  [src/components/ai-hub/TeacherAIHub.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ai-hub/TeacherAIHub.tsx)
  [src/components/ai-hub/TeacherAssistantWorkspace.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ai-hub/TeacherAssistantWorkspace.tsx)
  [src/components/ai-hub/TeacherAIActivityWorkspace.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ai-hub/TeacherAIActivityWorkspace.tsx)
  [src/components/ai-hub/TeacherLessonPrepWorkspace.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ai-hub/TeacherLessonPrepWorkspace.tsx)
  [src/components/ai-hub/TeacherAIInsightsWorkspace.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ai-hub/TeacherAIInsightsWorkspace.tsx)
  [src/components/ai-hub/TeacherSmartSchedulingWorkspace.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ai-hub/TeacherSmartSchedulingWorkspace.tsx)
  [src/components/ai-hub/TeacherStudentGroupsWorkspace.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ai-hub/TeacherStudentGroupsWorkspace.tsx)

### AI Hub refatorado

O AI Hub ativo do sistema deixou de ser uma coleção de cards desconectados e passou a operar como uma camada única abastecida por dados reais do professor.

Fluxo canônico:

- `AppWithRouter` carrega `useTeacherWorkspaceData` quando o professor está autenticado.
- `GET /api/ai/workspace-data` retorna `students`, `classes`, `payments`, `activities`, `lessonPreparations`, `studentGroups`, `counts` e `provider`.
- Cada workspace usa essa mesma base compartilhada, evitando telas vazias ou selects sem contexto.

Workspaces ativos:

- `TeacherAIHub.tsx`: landing editorial do AI Hub com métricas reais.
- `TeacherAssistantWorkspace.tsx`: chat principal do professor com histórico, sugestões e indicação de `providerMode`.
- `TeacherAIActivityWorkspace.tsx`: geração estruturada de atividades por aula real ou descrição livre, com publicação persistida no portal do aluno.
- `TeacherLessonPrepWorkspace.tsx`: geração, revisão e aprovação de `LessonPreparation` vinculada a uma `Class`.
- `TeacherAIInsightsWorkspace.tsx`: leitura explicável de risco, frequência, pagamentos e atividades.
- `TeacherSmartSchedulingWorkspace.tsx`: sugestões de horários com criação real de aula ao confirmar.
- `TeacherStudentGroupsWorkspace.tsx`: grupos persistidos do professor para segmentação operacional e envio de atividades.
- `SearchableSelect.tsx`: padrão único de busca do sistema, com sugestões ao foco, agrupamento por contexto e destaque em negrito do trecho digitado.

Observação importante:

- Os componentes legados de IA ainda podem existir no repositório por compatibilidade ou histórico, mas a navegação ativa do shell do professor usa a pasta [src/components/ai-hub](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ai-hub).

### Portal do aluno

Rotas e componentes principais no diretório [src/components/StudentPortal](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/StudentPortal):

- `StudentPortalLogin.tsx`
- `StudentDashboard.tsx`
- `StudentActivitiesWorkspace.tsx`
- `SmartOnboarding.tsx`
- `StudentProfile.tsx`
- `StudentRegister.tsx`
- `PronunciationTest.tsx`
- `StudentChat.tsx`
- `StudentPortalDashboard.tsx`
- `StudentDashboardComplete.tsx`
- `StudentDashboardNew.tsx`

## 5. Backend em Detalhe

### Controllers

- `analyticsController.js`
- `authController.js`
- `classController.js`
- `onboardingController.js`
- `paymentController.js`
- `studentController.js`
- `webhookController.js`

### Models

- `Achievement.js`
- `Activity.js`
- `AIAnalysis.js`
- `AuditLog.js`
- `Automation.js`
- `Certificate.js`
- `Chat.js`
- `Class.js`
- `ContentLibrary.js`
- `Contract.js`
- `Course.js`
- `Goal.js`
- `HangmanGame.js`
- `HourBank.js`
- `LessonPreparation.js`
- `LearningSignal.js`
- `Notification.js`
- `Payment.js`
- `PronunciationPhrase.js`
- `PronunciationTest.js`
- `Quiz.js`
- `Report.js`
- `Student.js`
- `User.js`
- `Webhook.js`

Modelos com papel central na rodada de IA:

- `Activity.js`: artefato canônico para atividades geradas e publicadas pelo AI Hub. Agora aceita origem manual ou por aula e metadata de `providerMode`, `batchId`, `targetMode`, `gradeLevel` e `learningObjective`.
- `LessonPreparation.js`: plano persistido de aula gerado pelo AI Hub e anexado à `Class` quando aprovado.
- `LearningSignal.js`: event store canônico de aprendizagem, usado para armazenar respostas por questão, eventos de pronúncia por palavra/frase e consolidar insights do AI Hub.
- `User.js`: agora também armazena `teacherWorkspace.studentGroups`, usados no AI Hub para segmentação persistida.

### Services

- `aiAssistantService.js`
- `automationEngine.js`
- `cacheService.js`
- `cloudinaryService.js`
- `emailService.js`
- `googleCalendarService.js`
- `liveClassService.js`
- `learningSignalsService.js`
- `monitoringService.js`
- `pdfService.js`
- `pronunciationService.js`
- `reportGeneratorService.js`
- `resendService.js`
- `stripeService.js`
- `teachingAssistantService.js`
- `telegramService.js`
- `transcriptionService.js`
- `twilioWhatsappService.js`
- `whatsappService.js`
- `zoomService.js`

### Rotas principais

Rotas em [backend-core/src/routes](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/routes):

- `auth.js`: autenticação de professores.
- `students.js`: CRUD da base de alunos.
- `classes.js`: agenda, criação e execução de aulas.
- `payments.js`: pagamentos e estatísticas financeiras.
- `analytics.js`: indicadores e dashboards do professor.
- `onboarding.js`: configuração inicial da conta.
- `automation.js`: rotinas e regras automatizadas.
- `aiAssistant.js`: recursos de assistência por IA.
- `studentPortal.js`: agregação de fluxos do portal.
- `studentOnboarding.js`: onboarding acadêmico do aluno.

### Rotas novas e reforçadas do AI Hub

O arquivo [backend-core/src/routes/aiAssistant.js](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/routes/aiAssistant.js) passou a concentrar o contrato real do AI Hub refatorado.

Principais endpoints:

- `GET /api/ai/provider-status`: expõe o estado real do provider e se o sistema está em `live` ou `fallback`.
- `GET /api/ai/workspace-data`: devolve a camada compartilhada de dados reais do professor.
- `GET /api/ai/students/:studentId/subject-suggestion`: sugere a próxima matéria/tópico com base em sinais reais, histórico de aulas e desempenho.
- `POST /api/ai/chat`: conversa com o assistente e nunca devolve erro bruto de provider; cai para fallback quando necessário.
- `GET /api/ai/suggestions`: recomenda ações rápidas com base no contexto do professor.
- `POST /api/ai/generate-activity`: gera atividade estruturada com contexto manual ou a partir de aula real.
- `POST /api/ai/publish-activity`: persiste `Activity` real e publica para aluno específico, grupo ou todos.
- `POST /api/ai/lesson-preparations/generate`: cria e salva `LessonPreparation`, já vinculando o plano à aula correspondente.
- `PUT /api/ai/lesson-preparations/:id/review`: aprova ou revisa o plano e consolida o vínculo com a aula.
- `GET|POST|PUT|DELETE /api/ai/student-groups`: CRUD persistido dos grupos usados no AI Hub.
- `GET|DELETE /api/ai/history`: histórico do assistente do professor.

### Estratégia de fallback da IA

O serviço [backend-core/src/services/aiAssistantService.js](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/services/aiAssistantService.js) agora opera em modo híbrido robusto:

- tenta usar o provider configurado;
- normaliza respostas para o frontend;
- valida a qualidade mínima das atividades geradas;
- usa fallback determinístico quando o provider externo falha ou entrega conteúdo inconsistente;
- sempre informa `providerMode: 'live' | 'fallback'`.
- `chat.js`: comunicação.
- `notifications.js`: notificações.
- `reports.js`: relatórios.
- `pronunciation.js` e `pronunciationTeacher.js`: pronúncia.
- `dailyVideo.js` e `liveClass.js`: aulas ao vivo.
- `contentLibrary.js`, `courses.js`, `hub.js`: conteúdo e recursos.
- `gamification.js`, `hangman.js`, `goals.js`, `quizzes.js`: engajamento e prática.
- `certificates.js`, `auditLogs.js`, `integrations.js`, `webhooks.js`: recursos auxiliares.

Rotas do portal em [backend-core/src/routes/portal](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/routes/portal):

- `auth.js`
- `profile.js`
- `classes.js`
- `payments.js`
- `goals.js`
- `chat.js`
- `courses.js`
- `ai.js`
- `helpers.js`

Rotas do portal reforçadas na rodada atual:

- `GET /api/portal/activities`: lista resumida das atividades do aluno, incluindo status, total de questões e último envio.
- `GET /api/portal/activities/:activityId`: abre a atividade completa sem expor gabarito antes da submissão.
- `POST /api/portal/activities/:activityId/submissions`: recebe respostas, dispara autocorreção quando cabível e grava sinais granulares de aprendizagem.

### Busca unificada e contexto vivo

O padrão pesquisável do projeto foi consolidado no componente [frontend/src/components/ui/SearchableSelect.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ui/SearchableSelect.tsx).

Ele é usado em:

- criação de atividades do AI Hub;
- preparação automática de aulas;
- agendamento inteligente;
- criação de grupos;
- agendamento manual de aulas em [frontend/src/components/Classes.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/Classes.tsx).

Comportamento atual:

- ao focar o campo, o usuário recebe sugestões recentes;
- ao digitar, a filtragem considera título, nome, série, matéria e palavras-chave;
- o trecho correspondente fica em negrito;
- os itens são agrupados por contexto, como `Aulas recentes`, `Alunos ativos` e `Grupos salvos`.

## 6. Jornadas Principais

### Jornada do professor

1. Acessa a tela inicial em `/`.
2. Seleciona `Sou Professor`.
3. Faz login ou cria conta em `/professor/login`.
4. Se necessário, segue para `/onboarding`.
5. Após autenticação, entra no shell principal.
6. Opera dashboard, aulas, alunos, financeiro, analytics e automações.
7. No AI Hub, consegue gerar atividade, preparar aula, criar grupos, obter insights e pedir sugestão de matéria com base em sinais reais.
8. Ao agendar uma aula, informa título e matéria obrigatoriamente e pode aplicar uma sugestão pedagógica explicada pelo sistema.

### Jornada do aluno

1. Entra pelo link público do professor ou pelo login do portal.
2. Autentica via `/portal/login` ou cadastro público.
3. Pode passar por onboarding do portal.
4. Acessa dashboard, perfil, pagamentos, aulas e atividades.
5. Abre a atividade recebida, responde no portal e envia a submissão real para o backend.
6. Os resultados alimentam o histórico do professor, os insights e as próximas sugestões pedagógicas.

## 7. Sistema Visual Atual

### Direção adotada na rodada atual

- Tom editorial sóbrio.
- Paleta preservada: `Ink` escuro, índigo como acento principal, ciano como apoio.
- Gradiente reduzido a detalhe atmosférico de fundo.
- Tipografia nova:
  `Fraunces` para títulos.
  `Manrope` para corpo.
- Navegação do professor reorganizada por leitura e contexto.

### Arquivos diretamente responsáveis pela camada visual nova

- [src/index.css](C:/Users/User/Desktop/Nexus-Academy/frontend/src/index.css)
- [src/components/LoginPage.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/LoginPage.tsx)
- [src/components/TeacherLogin.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/TeacherLogin.tsx)
- [src/components/Dashboard.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/Dashboard.tsx)
- [src/AppWithRouter.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/AppWithRouter.tsx)
- [src/components/ui/Animations.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ui/Animations.tsx)

## 8. Scripts Úteis

### Frontend

- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm run preview`
- `npm run test:e2e`

### Backend

- `npm start`
- `npm run dev`
- `npm test`
- `npm run lint`
- `npm run seed`
- `npm run validate-env`
- `npm run deploy:check`

## 9. Testes e Qualidade

### Estado validado nesta rodada

- Frontend:
  `npm run build` aprovado.
  `npm run typecheck` aprovado.
  `npm run lint -- --quiet` aprovado.
- Backend:
  `npm test -- --runInBand` aprovado.
  `npm run lint -- --quiet` aprovado.
- E2E:
  `npm run test:e2e -- ai-hub.spec.ts portal.spec.ts` aprovado em ambiente limpo.

### Testes backend existentes

Suites encontradas em [backend-core/src/__tests__](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/__tests__):

- `auth.test.js`
- `authSanitize.test.js`
- `aiHubSignals.test.js`
- `hangmanGame.test.js`
- `portalAuth.test.js`
- `studentRegistration.test.js`
- `students.test.js`
- `tenantAware.test.js`

### Testes E2E frontend

Arquivos em [frontend/e2e](C:/Users/User/Desktop/Nexus-Academy/frontend/e2e):

- `entry.spec.ts`: smoke tests da entrada principal e do login do professor.
- `ai-hub.spec.ts`: criação de grupo, geração/publicação de atividade, preparação automática e agendamento inteligente.
- `portal.spec.ts`: login, cadastro público e submissão real de atividade pelo aluno.
- `students.spec.ts`: autenticação do professor e dashboard/base de alunos.

## 10. Ambiente e Variáveis

### Frontend

- `.env`
- `.env.development`
- variável esperada: `VITE_API_URL`

### Backend

Arquivo principal: [backend-core/.env](C:/Users/User/Desktop/Nexus-Academy/backend-core/.env)

Variáveis citadas pelo projeto e documentação:

- `NODE_ENV`
- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `FRONTEND_URL`
- `API_URL`
- chaves de Stripe
- chaves de Cloudinary
- chaves de Resend
- chaves de Daily
- chaves de AssemblyAI
- credenciais opcionais de Redis e integrações de mensagens

## 11. Situação Atual e Riscos Técnicos

- O frontend gera um bundle principal grande, próximo de 1 MB minificado.
- A suíte atual fecha com `build`, `typecheck`, `lint`, backend tests e E2E verdes.
- Em ambientes sem provedor Gemini válido, os fluxos do AI Hub degradam corretamente para `fallback`, mas o backend ainda loga o erro original do provider para observabilidade.
- O sistema depende de várias integrações externas; em ambientes de teste sem chaves, alguns serviços degradam para modo parcial.
- Há arquivos temporários de execução (`tmp-*`) no workspace que não fazem parte da lógica do produto.

## 12. Dados Demo e Seed Local

O backend mantém um seed de desenvolvimento em [backend-core/src/dev/ensureDemoData.js](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/dev/ensureDemoData.js).

Ele garante:

- professor demo com assinatura ativa;
- base curada com mais de 15 alunos adicionais;
- aulas concluídas e agendadas;
- pagamentos em múltiplos estados;
- atividades diagnósticas e pendentes;
- histórico de pronúncia para alunos de English;
- grupos persistidos do professor;
- sinais de aprendizagem suficientes para busca, insights e sugestão de matéria.

## 13. Arquivos Mais Importantes para Manutenção

Se alguém entrar no projeto hoje e precisar entender rápido a aplicação, a ordem mais útil é:

1. [frontend/src/main.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/main.tsx)
2. [frontend/src/AppWithRouter.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/AppWithRouter.tsx)
3. [frontend/src/store/authStore.ts](C:/Users/User/Desktop/Nexus-Academy/frontend/src/store/authStore.ts)
4. [frontend/src/context/ThemeContext.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/context/ThemeContext.tsx)
5. [frontend/src/lib/api.ts](C:/Users/User/Desktop/Nexus-Academy/frontend/src/lib/api.ts)
6. [backend-core/src/server-prod.js](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/server-prod.js)
7. [backend-core/src/routes](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/routes)
8. [backend-core/src/models](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/models)
9. [backend-core/src/services](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/services)

## 14. Resumo da Rodada de Redesign e Conexão Real

Nesta rodada foram feitos os seguintes ajustes de base:

- unificação de tokens globais visuais;
- redesign da tela inicial;
- redesign do login/cadastro do professor;
- redesign do shell autenticado do professor;
- redesign do dashboard principal;
- contenção das animações compartilhadas;
- documentação inline dos módulos centrais tocados;
- expansão do conjunto de smoke tests E2E para entrada, AI Hub e portal;
- unificação da busca com sugestões ao foco e destaque em negrito;
- criação do event store de aprendizagem e dos snapshots pedagógicos;
- submissão real de atividades no portal do aluno;
- sugestão pedagógica de matéria/tópico para criação de aulas.
