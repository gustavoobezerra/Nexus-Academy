# Catalogo de Skills

Este documento resume as skills mais importantes para o Nexus Academy e explica como elas sao descobertas no workspace.

Nao tente usar este arquivo como indice completo da colecao de terceiros em `.agent/skills/skills/`. Para isso, use o catalogo proprio daquela colecao.

## Como a descoberta funciona

- Skills expostas pela sessao atual do agente continuam sendo a fonte principal para auto-trigger no ambiente.
- Skills customizadas do projeto vivem em `.agent/skills/<nome-da-skill>`.
- A colecao de terceiros instalada em `.agent/skills/skills/` tem indice proprio.
- O indice gerado de `.agent/skills/skills_index.json` e o `web-app/public/skills.json` indexam apenas a colecao de terceiros.
- Portanto, skills customizadas do Nexus devem ser descobertas por:
  - `AGENTS.md`
  - este `CATALOGO_SKILLS.md`
  - referencia direta por caminho/nome quando necessario

## Skills locais do Nexus

| Skill | Caminho | Quando usar |
|---|---|---|
| `nexus-academy-review-specialist` | `.agent/skills/nexus-academy-review-specialist/SKILL.md` | Review especializado do Nexus com foco em contratos, tenant safety, AI Hub, portal e fluxo fim a fim |
| `nexus-system-audit` | `.agent/skills/nexus-system-audit/SKILL.md` | Auditoria ampla do sistema, procurando drift arquitetural, fluxos desconectados e riscos cross-surface |
| `nexus-agent-ops` | `.agent/skills/nexus-agent-ops/SKILL.md` | Criar, delegar, administrar, reutilizar e encerrar agentes no contexto do Nexus Academy |

## Correcao de inventario

- O catalogo antigo citava `nexus-deep-review`, mas esse caminho nao representa o estado atual do workspace.
- As skills locais realmente presentes nesta rodada sao:
  - `nexus-academy-review-specialist`
  - `nexus-system-audit`
  - `nexus-agent-ops`

## Matriz de decisao curta

| Se o pedido for... | Use esta skill | Motivo |
|---|---|---|
| revisar diff, commit, PR ou mudancas de codigo | `code-review` | prioriza bugs, seguranca, regressao e testes |
| testar browser, login, formulario, responsividade ou tirar screenshot | `playwright` | automatiza navegador e fluxo real |
| publicar no Render | `render-deploy` | cobre `render.yaml`, servicos e deploy |
| consultar docs oficiais da OpenAI ou escolher modelo atual | `openai-docs` | usa fonte oficial e atual |
| criar ou atualizar skill do ecossistema Codex | `skill-creator` da `.codex/.system` | segue o formato e o fluxo do Codex |
| criar ou atualizar skill do ecossistema Claude legado | `skill-creator` da `.agents` | segue o formato da colecao Claude |
| instalar skill pronta | `skill-installer` | instala skills curadas ou de outros repos |
| revisar o Nexus Academy com foco em contrato e regressao | `nexus-academy-review-specialist` | entende teacher shell, AI Hub, portal, seed e fallback |
| auditar o Nexus Academy de ponta a ponta | `nexus-system-audit` | olha rotas, persistencia, journeys e drift arquitetural |
| abrir, dividir, coordenar ou encerrar subagentes no Nexus | `nexus-agent-ops` | aplica orquestracao especifica do projeto |

## Guia rapido por skill

### `code-review`

- Origem: `C:/Users/User/.agents/skills/code-review/SKILL.md`
- Use quando o usuario pedir review de diff, commit, range git ou mudancas de codigo.
- Melhor quando o foco principal e corretude, seguranca, regressao e cobertura.

### `playwright`

- Origem: `C:/Users/User/.agents/skills/playwright/SKILL.md`
- Use quando a tarefa exigir browser real, login, formulario, screenshot ou fluxo visual.
- Evite quando a tarefa nao envolver navegador.

### `render-deploy`

- Origem: `C:/Users/User/.codex/skills/render-deploy/SKILL.md`
- Use quando o objetivo for publicar o app no Render ou revisar `render.yaml`.

### `openai-docs`

- Origem: `C:/Users/User/.codex/skills/.system/openai-docs/SKILL.md`
- Use quando a pergunta for sobre modelos, APIs e documentacao oficial da OpenAI.

### `skill-creator` da `.codex/.system`

- Origem: `C:/Users/User/.codex/skills/.system/skill-creator/SKILL.md`
- Use quando a skill-alvo precisa seguir o fluxo/UX do Codex.
- E a variante preferida quando o pedido menciona criar ou evoluir skill para o ambiente atual.

### `skill-creator` da `.agents`

- Origem: `C:/Users/User/.agents/skills/skill-creator/SKILL.md`
- Use quando a skill-alvo pertence ao ecossistema Claude/Antigravity legado.

### `skill-installer`

- Origem: `C:/Users/User/.codex/skills/.system/skill-installer/SKILL.md`
- Use quando o usuario quer instalar skill pronta, nao desenhar uma nova.

### `nexus-academy-review-specialist`

- Origem: `.agent/skills/nexus-academy-review-specialist/SKILL.md`
- Skill local especializada em review do Nexus Academy.
- Prioriza contratos frontend/backend, fluxo professor/aluno, AI fallback e tenant safety.

### `nexus-system-audit`

- Origem: `.agent/skills/nexus-system-audit/SKILL.md`
- Skill local para auditoria ampla do sistema.
- Boa para pedidos do tipo "revise o sistema inteiro", "procure incoerencias" ou "cheque fluxos fim a fim".

### `nexus-agent-ops`

- Origem: `.agent/skills/nexus-agent-ops/SKILL.md`
- Skill local para orquestracao de agentes no Nexus Academy.
- Use quando o pedido envolver:
  - spawnar ou administrar agentes;
  - dividir backend, frontend, portal e testes;
  - decidir entre reutilizar ou abrir novo agente;
  - consolidar memoria operacional antes/depois da delegacao.

## Recomendacoes praticas

- Para memoria e contexto do projeto, leia primeiro `AGENTS.md`.
- Para criar ou administrar agentes dentro do Nexus, prefira `nexus-agent-ops`.
- Para review profundo do produto, prefira uma das skills locais do Nexus em vez de uma skill generica.
- Para skills de terceiros, parta da colecao em `.agent/skills/skills/` e do catalogo proprio dela.
