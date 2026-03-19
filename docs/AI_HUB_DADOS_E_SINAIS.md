# AI Hub, Busca e Sinais de Aprendizagem

## 1. Objetivo

Este documento descreve a camada nova que conecta:

- busca unificada com sugestões ao foco;
- AI Hub do professor;
- agendamento de aulas com contexto pedagógico;
- portal do aluno com submissão real de atividades;
- event store de aprendizagem usado para insights e recomendação de matéria.

## 2. Busca unificada

O padrão pesquisável do projeto foi consolidado em [frontend/src/components/ui/SearchableSelect.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ui/SearchableSelect.tsx).

Comportamento:

- ao focar o campo, mostra sugestões recentes;
- ao digitar, filtra por `label`, `description`, `meta` e `keywords`;
- agrupa resultados por contexto;
- destaca em negrito o trecho digitado;
- suporta seleção simples e multisseleção.

Campos que já usam esse padrão:

- [frontend/src/components/ai-hub/TeacherAIActivityWorkspace.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ai-hub/TeacherAIActivityWorkspace.tsx)
- [frontend/src/components/ai-hub/TeacherLessonPrepWorkspace.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ai-hub/TeacherLessonPrepWorkspace.tsx)
- [frontend/src/components/ai-hub/TeacherSmartSchedulingWorkspace.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ai-hub/TeacherSmartSchedulingWorkspace.tsx)
- [frontend/src/components/ai-hub/TeacherStudentGroupsWorkspace.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ai-hub/TeacherStudentGroupsWorkspace.tsx)
- [frontend/src/components/Classes.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/Classes.tsx)

## 3. Camada compartilhada de dados do professor

O frontend hidrata o AI Hub por meio de [frontend/src/hooks/useTeacherWorkspaceData.ts](C:/Users/User/Desktop/Nexus-Academy/frontend/src/hooks/useTeacherWorkspaceData.ts).

Contrato retornado por `GET /api/ai/workspace-data`:

- `students`
- `classes`
- `payments`
- `activities`
- `lessonPreparations`
- `studentGroups`
- `learningSnapshots`
- `counts`
- `provider`

Essa resposta alimenta todos os workspaces do AI Hub e evita estados vazios silenciosos.

## 4. Event store pedagógico

O modelo [backend-core/src/models/LearningSignal.js](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/models/LearningSignal.js) é a fonte canônica dos sinais de aprendizagem.

Campos centrais:

- `student`
- `teacher`
- `class`
- `activity`
- `pronunciationTest`
- `sourceType`
- `eventType`
- `subject`
- `topic`
- `difficulty`
- `correctness`
- `score`
- `signalWeight`
- `metadata`
- `capturedAt`

Tipos já usados:

- `sourceType: 'activity'`
- `sourceType: 'pronunciation'`
- `eventType: 'question_response'`
- `eventType: 'activity_submission'`
- `eventType: 'pronunciation_word'`
- `eventType: 'pronunciation_phrase'`

## 5. Como os sinais são gravados

### Atividade respondida pelo aluno

Fluxo:

1. O aluno abre a atividade no portal.
2. O frontend envia `POST /api/portal/activities/:activityId/submissions`.
3. O backend corrige automaticamente o que for objetivo.
4. O serviço [backend-core/src/services/learningSignalsService.js](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/services/learningSignalsService.js) grava:
   - um sinal por questão;
   - um sinal consolidado da submissão.

Rotas relacionadas:

- [backend-core/src/routes/portal/profile.js](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/routes/portal/profile.js)

Frontend relacionado:

- [frontend/src/components/StudentPortal/StudentActivitiesWorkspace.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/StudentPortal/StudentActivitiesWorkspace.tsx)

### Teste de pronúncia

Fluxo:

1. O aluno finaliza um teste de pronúncia.
2. O backend salva `PronunciationTest`.
3. O serviço de sinais grava:
   - um evento da frase;
   - eventos por palavra.

Rotas relacionadas:

- [backend-core/src/routes/pronunciation.js](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/routes/pronunciation.js)

## 6. Snapshots e insights

O serviço [backend-core/src/services/learningSignalsService.js](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/services/learningSignalsService.js) agrega sinais em snapshots por aluno.

Campos do snapshot:

- `studentId`
- `totalSignals`
- `averageScore`
- `objectiveAccuracy`
- `pronunciationAverage`
- `weakestSubjects`
- `weakestTopics`
- `lastSignalAt`

Esses snapshots abastecem:

- [frontend/src/components/ai-hub/TeacherAIInsightsWorkspace.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ai-hub/TeacherAIInsightsWorkspace.tsx)
- [backend-core/src/routes/aiAssistant.js](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/routes/aiAssistant.js)

## 7. Sugestão pedagógica de matéria

Endpoint:

- `GET /api/ai/students/:studentId/subject-suggestion`

Ele combina:

- fraquezas declaradas no perfil;
- sinais recentes do event store;
- histórico de aulas do aluno.

Resposta:

- `providerMode`
- `confidence`
- `suggestion.subject`
- `suggestion.topic`
- `suggestion.explanation`
- `suggestion.evidence`
- `suggestion.basedOn`

Consumo no frontend:

- [frontend/src/components/Classes.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/Classes.tsx)
- [frontend/src/components/ai-hub/TeacherSmartSchedulingWorkspace.tsx](C:/Users/User/Desktop/Nexus-Academy/frontend/src/components/ai-hub/TeacherSmartSchedulingWorkspace.tsx)

## 8. Portal do aluno

O portal agora tem dois níveis de atividade:

- lista resumida em `GET /api/portal/activities`;
- detalhe completo em `GET /api/portal/activities/:activityId`.

Regra importante:

- antes do envio, o detalhe não mostra gabarito;
- depois do envio, o frontend pode exibir resposta correta, explicação e resultado consolidado.

## 9. Seed de desenvolvimento

O seed [backend-core/src/dev/ensureDemoData.js](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/dev/ensureDemoData.js) foi expandido para suportar essa arquitetura.

Ele inclui:

- professor demo;
- mais de 15 alunos extras;
- atividades diagnósticas e pendentes;
- sinais de atividade;
- sinais de pronúncia;
- grupos persistidos.

## 10. Testes que travam essa camada

Backend:

- [backend-core/src/__tests__/aiHubSignals.test.js](C:/Users/User/Desktop/Nexus-Academy/backend-core/src/__tests__/aiHubSignals.test.js)

Frontend E2E:

- [frontend/e2e/ai-hub.spec.ts](C:/Users/User/Desktop/Nexus-Academy/frontend/e2e/ai-hub.spec.ts)
- [frontend/e2e/portal.spec.ts](C:/Users/User/Desktop/Nexus-Academy/frontend/e2e/portal.spec.ts)
