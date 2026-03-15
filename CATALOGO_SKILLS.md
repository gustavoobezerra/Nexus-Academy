# Catalogo de Skills

Este documento cataloga as skills disponiveis nesta sessao e resume quando usar cada uma.

## Escopo

- Fonte principal: lista de skills exposta pelo contexto do `AGENTS`.
- Estado local do projeto: a pasta `.agent/skills` agora contem a skill local `nexus-deep-review`.
- Total catalogado: 8 entradas considerando a lista da sessao mais a skill local do projeto, com 7 nomes efetivamente distintos porque `skill-creator` aparece em 2 variantes.

## Matriz de Decisao Curta

| Se o pedido for... | Use esta skill | Motivo |
|---|---|---|
| revisar PR, commit, diff ou mudancas de codigo | `code-review` | prioriza bugs, seguranca e regressao |
| testar tela, login, formulario, responsividade ou browser flow | `playwright` | automatiza navegador e fluxo real |
| publicar no Render | `render-deploy` | cobre `render.yaml`, servicos e deploy |
| consultar docs da OpenAI ou escolher modelo atual | `openai-docs` | usa fonte oficial e atual |
| revisar o Nexus Academy inteiro com jornadas e contratos | `nexus-deep-review` | audita front, back, APIs e fluxos professor/aluno |
| criar ou atualizar uma skill para Codex | `skill-creator` (`.codex/.system`) | segue o formato de skills do Codex |
| criar ou atualizar uma skill para Claude | `skill-creator` (`.agents`) | segue o formato do ecossistema Claude |
| instalar skill pronta | `skill-installer` | lista e instala skills disponiveis |

## Guia Rapido

| Skill | Quando usar | Nao usar quando |
|---|---|---|
| `code-review` | Revisar diff, commit, range git ou mudancas de codigo | O objetivo for implementar mudancas, nao revisar |
| `playwright` | Testar site, fluxo de login, formulario, responsividade, screenshot, automacao de browser | A tarefa nao envolver navegador |
| `render-deploy` | Publicar app no Render, gerar `render.yaml`, criar servicos no Render | O deploy for em outra nuvem/plataforma |
| `skill-creator` (`.agents`) | Criar ou atualizar uma skill voltada ao ecossistema Claude | O objetivo for apenas instalar uma skill existente |
| `openai-docs` | Consultar docs oficiais da OpenAI, escolher modelo atual, upgrade GPT-5.4 | A pergunta nao for sobre produtos/docs da OpenAI |
| `nexus-deep-review` | Revisar profundamente este SaaS, incluindo jornadas professor/aluno, rotas, APIs e contratos | O pedido for apenas um review rapido de diff isolado |
| `skill-creator` (`.codex/.system`) | Criar ou atualizar skill voltada ao ecossistema Codex | O objetivo for apenas catalogar ou instalar skills |
| `skill-installer` | Listar skills instalaveis e instalar skills curadas ou de outros repos | A skill ja estiver instalada e o usuario quiser edita-la |

## Catalogo Completo

### 1. `code-review`

- Origem: `C:/Users/User/.agents/skills/code-review/SKILL.md`
- Objetivo: revisar mudancas de codigo com foco em corretude, seguranca, performance e qualidade.
- Entradas esperadas:
  - diff em texto
  - hash de commit
  - range git
  - requisitos da tarefa
- Quando usar:
  - review de PR
  - review de commit
  - auditoria tecnica de mudancas
- Como opera:
  - obtem diff
  - le arquivos completos alterados
  - classifica achados em `P0` a `P3`
  - responde com veredito (`APPROVE`, `REQUEST CHANGES`, `NEEDS DISCUSSION`)
- Valor principal:
  - bom para achar bug funcional, regressao, falha de autorizacao, N+1, exposicao de segredo

### 2. `playwright`

- Origem: `C:/Users/User/.agents/skills/playwright/SKILL.md`
- Objetivo: automacao de navegador com Playwright.
- Quando usar:
  - testar fluxo de cadastro/login
  - validar layout responsivo
  - preencher formulario
  - verificar links quebrados
  - tirar screenshot
- Fluxo recomendado pela skill:
  - detectar servidores locais
  - escrever script temporario em `/tmp`
  - executar via `run.js`
  - reportar resultado
- Regras importantes:
  - por padrao usa browser visivel
  - evitar criar teste dentro do projeto do usuario para tarefas pontuais
  - preferir `waitForURL` e `waitForSelector` em vez de timeout fixo

### 3. `render-deploy`

- Origem: `C:/Users/User/.codex/skills/render-deploy/SKILL.md`
- Objetivo: deploy no Render por Blueprint (`render.yaml`) ou criacao direta.
- Quando usar:
  - hospedar app no Render
  - gerar `render.yaml`
  - configurar web service, worker, cron ou database no Render
- Decisao principal:
  - app simples, um servico: criacao direta
  - multi-servico, banco, worker, cron, IaC: Blueprint
- Dependencias relevantes:
  - git remote para fluxo baseado em repo
  - MCP do Render ou CLI do Render
  - possivel escalacao para chamadas de rede
- Valor principal:
  - evita deploy improvisado e obriga checagem de runtime, env vars, banco e deeplink de dashboard

### 4. `skill-creator` da pasta `.agents`

- Origem: `C:/Users/User/.agents/skills/skill-creator/SKILL.md`
- Objetivo: guiar criacao de skills para Claude.
- Quando usar:
  - desenhar uma skill nova
  - atualizar uma skill existente
  - estruturar `SKILL.md`, `scripts/`, `references/`, `assets/`
- Pontos fortes:
  - enfatiza economia de contexto
  - separa bem o que vai em `SKILL.md` e o que vai em `references`
  - inclui fluxo de inicializacao e empacotamento com `package_skill.py`
- Melhor para:
  - skills mais genericas do ecossistema Claude

### 5. `openai-docs`

- Origem: `C:/Users/User/.codex/skills/.system/openai-docs/SKILL.md`
- Objetivo: responder usando docs oficiais e atuais da OpenAI.
- Quando usar:
  - como usar API da OpenAI
  - qual modelo atual escolher
  - upgrade para GPT-5.4
  - ajustes de prompting ligados a GPT-5.4
- Regras centrais:
  - priorizar MCP de docs da OpenAI
  - usar refs locais apenas como apoio
  - fallback web apenas em dominio oficial da OpenAI
- Valor principal:
  - reduz risco de responder com doc desatualizada ou modelo errado

### 6. `skill-creator` da pasta `.codex/.system`

- Origem: `C:/Users/User/.codex/skills/.system/skill-creator/SKILL.md`
- Objetivo: criar ou atualizar skills para Codex.
- Quando usar:
  - o alvo e o ecossistema Codex
  - a skill precisa incluir metadados de UI em `agents/openai.yaml`
  - a skill precisa de validacao rapida e forward-testing
- Diferencas em relacao ao `skill-creator` da `.agents`:
  - inclui `agents/openai.yaml`
  - fala em `quick_validate.py`
  - trata explicitamente `forward-testing` com subagentes
  - tem convencoes de naming mais detalhadas
- Melhor para:
  - skills que vao viver no fluxo/UX do Codex

### 7. `nexus-deep-review`

- Origem: `.agent/skills/nexus-deep-review/SKILL.md`
- Objetivo: fazer auditoria full-stack profunda do Nexus Academy com rastreamento de jornadas, botoes, rotas e contratos de API.
- Quando usar:
  - review completo do projeto
  - auditoria detalhada de front e back
  - verificacao de fluxo professor/aluno
  - checagem se um botao, link, redirect ou endpoint realmente fecha a cadeia
- Diferenciais:
  - forca inventario inicial do sistema
  - exige cobertura de frontend, backend e API contracts
  - exige rastrear jornadas de professor e aluno
  - inclui script `collect_inventory.py` para acelerar mapeamento
- Melhor para:
  - pedidos amplos do tipo "revise absolutamente tudo"

### 8. `skill-installer`

- Origem: `C:/Users/User/.codex/skills/.system/skill-installer/SKILL.md`
- Objetivo: listar e instalar skills no `$CODEX_HOME/skills`.
- Quando usar:
  - o usuario quer ver skills disponiveis para instalar
  - quer instalar uma skill curada
  - quer instalar skill de outro repo GitHub
- Como opera:
  - lista skills via script helper
  - instala skill por repo/path
  - usa rede, entao geralmente precisa de escalacao fora do sandbox
- Regras importantes:
  - se instalar, avisar para reiniciar o Codex
  - skills `.system` normalmente ja vem preinstaladas

## Duplicidades e Diferencas

### `skill-creator` aparece duas vezes

- `C:/Users/User/.agents/skills/skill-creator/SKILL.md`
  - focada em Claude
  - empacotamento com `package_skill.py`
- `C:/Users/User/.codex/skills/.system/skill-creator/SKILL.md`
  - focada em Codex
  - inclui `agents/openai.yaml`, `quick_validate.py` e forward-testing

### Recomendacao pratica

- Se a skill vai ser usada dentro do ambiente Codex, prefira a variante de `skill-creator` em `.codex/.system`.
- Se a referencia de trabalho for o ecossistema Claude legado, use a variante da `.agents`.

## Ordem de Escolha Recomendada

1. Se o pedido for revisar mudanca de codigo: `code-review`
2. Se o pedido envolver browser: `playwright`
3. Se o pedido for deploy no Render: `render-deploy`
4. Se o pedido for docs OpenAI: `openai-docs`
5. Se o pedido for auditoria profunda do Nexus Academy: `nexus-deep-review`
6. Se o pedido for criar/editar skill:
   - skill de Codex: `skill-creator` de `.codex/.system`
   - skill de Claude: `skill-creator` de `.agents`
7. Se o pedido for instalar skill pronta: `skill-installer`

## Observacao sobre o Projeto

- Skill local criada neste projeto: `.agent/skills/nexus-deep-review`.
- Se voce quiser, o proximo passo natural e eu gerar uma segunda versao deste catalogo em formato mais operacional, por exemplo:
  - matriz de decisao
  - fluxograma
  - tabela com exemplos reais de prompts que disparam cada skill
