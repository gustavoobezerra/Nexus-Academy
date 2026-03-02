# Nexus Academy - Plano de Correção de Erros

## Resumo dos Problemas Identificados

### CRÍTICO - Backend (`backend-core/src/server.js`)

#### 1. Encoding UTF-8 Corrompido (Todo o arquivo)
**Problema:** O arquivo server.js contém caracteres UTF-8 corrompidos em toda a extensão. São strings com encoding Latin-1 (Windows-1252) sendo exibidas como UTF-8.
- Exemplos: `ðŸš€` → `🚀`, `Ã©` → `é`, `Ã£o` → `ão`, `âœ…` → `✅`, `MatemÃ¡tica` → `Matemática`
- Afeta: mensagens de console, strings de dados demo, textos de erro, comentários, templates de notificações
- **Causa:** Arquivo salvo com encoding incorreto

#### 2. JWT_SECRET Inconsistente (Lines 406, 875, 915)
**Problema Crítico de Segurança:**
- `protect` middleware (linha 406): `jwt.verify(token, JWT_SECRET || 'insecure-dev-secret')`
- Rotas de login/register (linhas 875, 915): `jwt.sign(..., process.env.JWT_SECRET || 'nexus-secret-key-2025')`
- Os fallbacks são **diferentes** (`'insecure-dev-secret'` vs `'nexus-secret-key-2025'`), causando falha de verificação JWT em desenvolvimento quando `JWT_SECRET` não está definido.

#### 3. `import` no Meio/Final do Arquivo (Linha 2054)
**Problema:** `import hangmanRoutes from './routes/hangman.js'` está na linha 2054, depois de todo o código de rotas e middlewares. Imports ESM devem estar no topo do arquivo.

#### 4. Inconsistência de Prefixo de Rotas (Linhas 1598-1931)
**Problema Funcional:** Muitas rotas não têm o prefixo `/api/`:
- `/notifications`, `/notifications/templates`, `/notifications/send`
- `/grades`, `/grades/student/:id`
- `/materials`
- `/teaching-templates`
- `/referral`
- `/course-plans`
- `/analytics/teacher`, `/analytics/student-payments`

Enquanto outras usam `/api/` corretamente (`/api/students`, `/api/payments`, `/api/classes`). Isso provavelmente causa erros 404 no frontend se ele chama `/api/notifications`, etc.

#### 5. Rotas Duplicadas de Analytics (Linhas 1398-1556 e 1839-1931)
**Problema:** Há duas implementações de `/api/analytics/teacher` e `/analytics/teacher` com lógicas diferentes. A primeira (com `/api/`) usa `Math.random()` para dados pedagógicos; a segunda (sem `/api/`) usa dados fixos.

#### 6. `Math.random()` em Dados de Analytics (Linhas 1503-1515)
**Problema:** Métricas como `avgPerformance` e `improvementRate` são calculadas com `Math.random()`, retornando dados não-determinísticos a cada requisição.

#### 7. Autorização Faltando no Update de Pagamento (Linha 1108)
**Problema:** A rota `PUT /api/payments/:id` não verifica se o pagamento pertence a um aluno do professor autenticado - qualquer professor pode atualizar pagamentos de qualquer aluno.

#### 8. `id` e `_id` com valores potencialmente diferentes em criação de aluno (Linha 961-962)
**Problema:** `id: \`student_${Date.now()}\`` e `_id: \`student_${Date.now()}\`` são duas chamadas separadas ao `Date.now()` que podem resultar em valores diferentes.

### MÉDIO - Frontend

#### 9. Inconsistência de Props em SmartScheduling (App.tsx:319 vs AppWithRouter.tsx:497)
- `App.tsx` linha 319: `<SmartScheduling students={[]} classes={[]} />`
- `AppWithRouter.tsx` linha 497: `<SmartScheduling />` (sem props)
- Se o componente requer as props, AppWithRouter.tsx causará erro TypeScript.

#### 10. Comentários de "ATENÇÃO" Desnecessários (App.tsx:82,85,107 / AppWithRouter.tsx:104,109,134,146)
- Comentários como `// ATENÇÃO: setState em useEffect pode causar re-renders` estão no código de produção sem valor funcional.

#### 11. `window.location.reload()` no Onboarding (App.tsx:333)
- Usar `window.location.reload()` para atualizar estado após onboarding é ruim para UX e desnecessário numa app React com Zustand.

#### 12. App.tsx Nunca é Usado (main.tsx usa AppWithRouter.tsx)
- `App.tsx` existe mas `main.tsx` importa e usa `AppWithRouter.tsx`.
- `App.tsx` referencia `OnboardingWizardNew` enquanto `AppWithRouter.tsx` usa `OnboardingWizard`.

---

## Plano de Implementação

### FASE 1: Correção do Encoding UTF-8 no server.js

**Arquivo:** `backend-core/src/server.js`

Substituir todos os padrões de encoding corrompido com os caracteres corretos. Principais substituições:
- `Ã¡` → `á`, `Ã©` → `é`, `Ã³` → `ó`, `Ãº` → `ú`
- `Ã¢` → `â`, `Ãª` → `ê`, `Ã´` → `ô`
- `Ã£` → `ã`, `Ã§` → `ç`, `Ãµ` → `õ`
- `Ã­` → `í`
- `Ã‡` → `Ç`, `Ã‰` → `É`
- `ðŸš€` → `🚀`, `âœ…` → `✅`, `âŒ` → `❌`
- `ðŸŽ¬` → `🎬`, `ðŸ"Œ` → `📌`, `ðŸ'¬` → `💬`
- `ðŸŽ"` → `🎓`, `ðŸ"'` → `🔒`, `ðŸ"¡` → `📡`
- `ðŸ'¤` → `👤`, `ðŸ"¨` → `📨`

### FASE 2: Correções Críticas de Backend

**Arquivo:** `backend-core/src/server.js`

1. **Mover import hangmanRoutes para o topo** (linha 2054 → linha ~10)

2. **Corrigir JWT_SECRET** - padronizar fallback para `'insecure-dev-secret'` em todos os usos:
   - Linha 875: `process.env.JWT_SECRET || 'nexus-secret-key-2025'` → `JWT_SECRET || 'insecure-dev-secret'`
   - Linha 915: mesmo fix

3. **Corrigir prefixo de rotas** - Adicionar `/api/` nas rotas sem prefixo:
   - `/notifications` → `/api/notifications`
   - `/notifications/templates` → `/api/notifications/templates`
   - `/notifications/send` → `/api/notifications/send`
   - `/grades` → `/api/grades`
   - `/grades/student/:id` → `/api/grades/student/:id`
   - `/materials` → `/api/materials`
   - `/teaching-templates` → `/api/teaching-templates`
   - `/referral` → `/api/referral`
   - `/course-plans` → `/api/course-plans`
   - `/analytics/teacher` → `/api/analytics/teacher` (linha ~1841)
   - `/analytics/student-payments` → `/api/analytics/student-payments` (linha ~1908)

4. **Remover rotas duplicadas de analytics** - As rotas em linhas 1398-1556 (`/api/analytics/teacher` e `/api/analytics/student-payments`) e linhas 1839-1931 (sem `/api/`) são duplicadas. Manter apenas a versão com `/api/` (linhas 1400 e 1559) que têm lógica mais completa, e remover as duplicatas das linhas 1841 e 1908.

5. **Corrigir `Math.random()` em analytics** (linhas 1503-1515):
   - `avgPerformance`: calcular a partir de `studentGrades` reais
   - `improvementRate`: calcular com base em comparação de notas no tempo
   - `studentsByPerformance`: usar dados reais de `studentGrades`

6. **Adicionar autorização no update de pagamento** (linha 1108):
   - Verificar que `payments[paymentIndex].studentId` pertence a um aluno do `req.user.id`

7. **Corrigir `id`/`_id` na criação de aluno** (linhas 961-962):
   - Usar uma variável `const studentId = \`student_${Date.now()}\`` e referenciar nos dois campos

### FASE 3: Correções de Frontend

**Arquivo:** `frontend/src/App.tsx`
1. Remover comentários `// ATENÇÃO: setState em useEffect...` (linhas 82, 85, 107)
2. Substituir `window.location.reload()` por uso do store Zustand para atualizar dados após onboarding (linha 333)

**Arquivo:** `frontend/src/AppWithRouter.tsx`
1. Remover comentários `// ATENÇÃO: setState em useEffect...` (linhas 104, 109, 134, 146)
2. Corrigir `<SmartScheduling />` para incluir props corretas (linha 497)

---

## Arquivos a Modificar

| Arquivo | Prioridade | Descrição |
|---|---|---|
| `backend-core/src/server.js` | CRÍTICA | Encoding, JWT, imports, rotas, auth |
| `frontend/src/App.tsx` | MÉDIA | Comentários, window.reload |
| `frontend/src/AppWithRouter.tsx` | MÉDIA | Comentários, SmartScheduling props |

## Ordem de Execução

1. Corrigir encoding UTF-8 em `server.js` (1 grande edição de conteúdo de strings)
2. Mover `import hangmanRoutes` para o topo em `server.js`
3. Padronizar JWT_SECRET fallback em `server.js`
4. Adicionar prefixo `/api/` nas rotas sem prefixo em `server.js`
5. Remover rotas duplicadas de analytics em `server.js`
6. Corrigir `Math.random()` em analytics em `server.js`
7. Adicionar autorização no update de pagamento em `server.js`
8. Corrigir `id`/`_id` na criação de aluno em `server.js`
9. Limpar comentários e corrigir props no frontend (`App.tsx`, `AppWithRouter.tsx`)
