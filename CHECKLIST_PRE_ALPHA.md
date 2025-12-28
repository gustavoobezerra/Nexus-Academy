# ✅ CHECKLIST COMPLETO PARA TESTES PRÉ-ALPHA
## Nexus Academy - Guia de Preparação e Execução de Testes Reais

**Data:** 28 de Dezembro de 2025  
**Versão:** 2.0.0  
**Fase:** Pré-Alpha Testing (Ambiente Controlado)  
**Testadores:** Irmã (Professora) + 3-5 Amigos (Alunos)

---

## 🎯 O QUE É PRÉ-ALPHA?

Pré-Alpha é a **primeira fase de testes com usuários reais** em um ambiente controlado. O objetivo NÃO é ter um produto perfeito, mas sim:

✅ **Validar funcionalidades core** (cadastro, onboarding, videoaula)  
✅ **Identificar bugs críticos** que impedem uso básico  
✅ **Coletar feedback qualitativo** de usuários reais  
✅ **Testar fluxo end-to-end** em condições próximas da realidade  
❌ **NÃO esperamos perfeição** - bugs são esperados e bem-vindos!

**Expectativa:** 70-80% de funcionalidades working. Bugs não críticos são aceitáveis.

---

## 📅 CRONOGRAMA DE PREPARAÇÃO

### 🔴 DIA -2: Correções Críticas (4-6 horas)

**Manhã (2-3 horas):**
- [ ] Corrigir BUG-001 (onboarding aluno - erro de conexão)
- [ ] Corrigir BUG-002 (campos required invisíveis)
- [ ] Configurar Daily.co API Key

**Tarde (2-3 horas):**
- [ ] Criar arquivo `.env.example` documentado
- [ ] Configurar ambiente de staging/produção
- [ ] Deploy do backend e frontend

### 🟡 DIA -1: Testes Internos (6-8 horas)

**Manhã (3-4 horas):**
- [ ] Teste completo fluxo professor (você mesmo)
- [ ] Teste completo fluxo aluno (você mesmo)
- [ ] Testar videoconferência (Daily.co ou Jitsi)
- [ ] Verificar emails (Resend funcionando)

**Tarde (3-4 horas):**
- [ ] Criar dados de seed se necessário
- [ ] Preparar documentos de teste para testadores
- [ ] Criar formulário de feedback
- [ ] Preparar WhatsApp/Telegram para suporte

### 🟢 DIA 0: Execução dos Testes (2-3 horas)

**Teste com Professora (45-60 min):**
- [ ] Observar cadastro e onboarding
- [ ] Cadastrar 1 aluno demo
- [ ] Agendar 1 aula teste
- [ ] Iniciar videoconferência

**Testes com Alunos (30-45 min cada):**
- [ ] 3-5 alunos se cadastram usando link da professora
- [ ] Completam onboarding
- [ ] Entram em aula teste
- [ ] Navegam pelo dashboard

---

## 🔧 PREPARAÇÃO DO AMBIENTE

### 1. Variáveis de Ambiente Obrigatórias

Crie os arquivos `.env` necessários:

**Backend** (`backend-core/.env`):
```bash
# ===== BANCO DE DADOS =====
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/nexus-academy
NODE_ENV=production

# ===== AUTENTICAÇÃO =====
JWT_SECRET=sua-chave-super-secreta-minimo-32-caracteres-aqui

# ===== APIs EXTERNAS CRÍTICAS =====
# Stripe (Cobrança de assinatura dos professores)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Daily.co (Videoconferência - 10k min/mês grátis)
DAILY_API_KEY=sua-daily-api-key-aqui

# Resend (Emails transacionais)
RESEND_API_KEY=re_...

# Cloudinary (Upload de arquivos)
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# ===== APIs OPCIONAIS (Podem ficar em branco) =====
# Assembly AI (Transcrição de áudio)
ASSEMBLYAI_API_KEY=

# Google Gemini (IA)
GEMINI_API_KEY=

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ===== URLs =====
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:5000
PORT=5000
```

**Frontend** (`frontend/.env`):
```bash
# URL do backend
VITE_API_URL=http://localhost:5000/api

# (Opcional) Stripe Publishable Key para checkout
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 2. Verificação de Serviços Externos

**Antes de começar os testes, CONFIRME:**

#### ✅ Daily.co (Videoconferência)
```bash
# 1. Acesse: https://dashboard.daily.co/
# 2. Crie conta gratuita (10.000 min/mês)
# 3. Vá em "Developers" > "API Keys"
# 4. Copie a key e adicione no .env

# Teste:
curl -X POST https://api.daily.co/v1/rooms \
  -H "Authorization: Bearer SEU_DAILY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-room"}'

# Se retornar JSON com room criada = ✅ Configurado
```

#### ✅ Resend (Emails)
```bash
# 1. Acesse: https://resend.com/
# 2. Crie conta (3.000 emails/mês grátis)
# 3. Vá em "API Keys" e crie uma nova
# 4. Adicione no .env

# Teste no backend:
node -e "
const Resend = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
resend.emails.send({
  from: 'Nexus Academy <onboarding@resend.dev>',
  to: 'seu-email@gmail.com',
  subject: 'Teste',
  html: '<p>Funciona!</p>'
}).then(console.log).catch(console.error);
"
```

#### ✅ Stripe (Assinaturas)
```bash
# 1. Acesse: https://dashboard.stripe.com/test/apikeys
# 2. Use TEST keys (começam com sk_test_)
# 3. Configure webhook para /api/webhooks/stripe
# 4. Anote o signing secret (whsec_...)

# Teste:
curl https://api.stripe.com/v1/customers \
  -u SEU_STRIPE_SECRET_KEY:

# Se retornar dados = ✅ Configurado
```

#### ✅ Cloudinary (Arquivos)
```bash
# 1. Acesse: https://cloudinary.com/
# 2. Crie conta gratuita
# 3. Vá em Dashboard e copie:
#    - Cloud Name
#    - API Key
#    - API Secret

# Teste no código:
# (Backend já tem cloudinaryService.js configurado)
```

#### ⚠️ MongoDB Atlas
```bash
# 1. Acesse: https://cloud.mongodb.com/
# 2. Crie cluster gratuito (M0)
# 3. Crie usuário de banco de dados
# 4. Whitelist IP: 0.0.0.0/0 (permite qualquer IP - apenas para teste)
# 5. Copie connection string

# Teste:
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado!'))
  .catch(console.error);
"
```

### 3. Deploy e Inicialização

**Opção A: Local (Desenvolvimento)**
```bash
# Terminal 1 - Backend
cd backend-core
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev

# Acesse: http://localhost:5173
```

**Opção B: Staging (Recomendado para testes externos)**
```bash
# Deploy no Render, Vercel, Railway, etc.
# Configure variáveis de ambiente no painel
# Anote URLs:
# - Backend: https://nexus-backend.onrender.com
# - Frontend: https://nexus-academy.vercel.app

# Atualize VITE_API_URL no frontend
# Atualize FRONTEND_URL no backend
```

### 4. Limpeza e Seeds (Se Necessário)

**Se quiser começar com banco limpo:**
```bash
# Conectar no MongoDB Atlas
# Ir em Collections > Drop Database

# Ou via código:
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.dropDatabase()
  .then(() => console.log('Banco limpo!'));
"
```

**Se quiser criar dados de exemplo:**
```bash
cd backend-core
node seed.js
# Isso criará usuários/alunos demo se seed.js estiver implementado
```

---

## 📝 ROTEIROS DE TESTE

### TESTE 1: Cadastro e Onboarding da Professora

**Objetivo:** Professora consegue criar conta e configurar perfil  
**Duração:** 15-20 minutos  
**Executor:** Sua irmã (professora)

#### Passo a Passo:

**1.1 - Acessar Homepage**
- [ ] Acesse `http://sua-url.com` ou `http://localhost:5173`
- [ ] **Esperado:** Homepage carrega sem erros
- [ ] **Checagem:** Console do navegador sem erros vermelhos (F12)

**1.2 - Iniciar Cadastro**
- [ ] Clique em "Cadastrar como Professor" ou botão equivalente
- [ ] **Esperado:** Formulário de cadastro aparece
- [ ] **Se falhar:** Capture screenshot + mensagem de erro

**1.3 - Preencher Dados Básicos**
- [ ] Nome: `[Nome da professora]`
- [ ] Email: `professora.teste@gmail.com` (email real para receber confirmações)
- [ ] Senha: `Teste@123` (mínimo 6 caracteres)
- [ ] Telefone: `(11) 99999-9999`
- [ ] **Esperado:** Campos aceitam entrada
- [ ] **Problema conhecido:** Se aparecer "Preencha este campo" apontando para área vazia = **BUG-002** ainda não corrigido

**1.4 - Step 1: Escolher Slug Único**
- [ ] Digite slug desejado: `professora-maria` (exemplo)
- [ ] Sistema deve verificar disponibilidade
- [ ] **Esperado:** ✅ "Slug disponível!" ou ❌ "Slug já em uso"
- [ ] **Se falhar:** Pode ser problema de conexão com backend

**1.5 - Step 2: Configurar Pagamentos dos Alunos**
- [ ] Escolher "Receber Manualmente" > "Fora do Sistema"
  - OU se quiser testar PIX: "PIX no Sistema" + inserir chave PIX
- [ ] Clicar "Continuar"
- [ ] **Esperado:** Avança para próximo step
- [ ] **Problema conhecido:** Se travar aqui em "campo invisível" = **BUG-002**

**1.6 - Step 3: Assinatura do Nexus**
- [ ] Escolher plano: "Básico (R$ 97)" ou "Pro (R$ 197)"
- [ ] Se Stripe configurado: Checkout abre
- [ ] Se Stripe NÃO configurado: Pode dar erro (esperado)
- [ ] **Opção:** Clicar "Pular por enquanto" se houver
- [ ] **Esperado:** Trial de 30 dias inicia

**1.7 - Finalização**
- [ ] **Esperado:** Mensagem "Conta criada com sucesso!"
- [ ] **Esperado:** Email de boas-vindas recebido (verificar spam)
- [ ] **Esperado:** Redirecionamento para dashboard do professor
- [ ] **Checagem:** Link único gerado: `nexusacademy.com/professor/[slug]`

**1.8 - Exploração Inicial do Dashboard**
- [ ] **Esperado:** Dashboard aparece sem erros
- [ ] **Checagem:** Sidebar com menu funcional
- [ ] **Checagem:** Nome da professora aparece no topo
- [ ] **Checagem:** Não há dados de alunos (ainda vazio)

#### Resultados Possíveis:

| Resultado | Ação |
|-----------|------|
| ✅ **Tudo funcionou** | Prosseguir para Teste 2 |
| ⚠️ **Erro no Step 2 (campos invisíveis)** | BUG-002 não corrigido - CORRIGIR AGORA |
| ❌ **Erro de conexão** | Backend não está rodando - VERIFICAR |
| ❌ **Erro no Stripe** | Normal se não configurado - pular pagamento |

---

### TESTE 2: Cadastro e Onboarding dos Alunos

**Objetivo:** 3-5 alunos conseguem se cadastrar usando link da professora  
**Duração:** 10-15 minutos por aluno  
**Executores:** Amigos/familiares

#### Passo a Passo:

**2.1 - Obter Link Único da Professora**
- [ ] Professora acessa dashboard
- [ ] Encontra "Meu Link de Cadastro" ou equivalente
- [ ] **Esperado:** Link aparece: `nexusacademy.com/professor/[slug]`
- [ ] **Ação:** Compartilhar link com alunos via WhatsApp

**2.2 - Aluno Acessa Link**
- [ ] Aluno clica no link recebido
- [ ] **Esperado:** Página de cadastro do aluno carrega
- [ ] **Esperado:** Aparece nome/foto da professora ("Aulas com Professora Maria")
- [ ] **Se falhar:** Link pode estar errado - verificar slug

**2.3 - Criar Conta do Aluno**
- [ ] Nome: `[Nome do aluno]`
- [ ] Email: `aluno1@teste.com`
- [ ] Senha: `Aluno@123`
- [ ] Idade: `25`
- [ ] Série/Nível: `Superior`
- [ ] Nome do Responsável: `[Responsável]` (pode ser o próprio)
- [ ] Tel. Responsável: `(11) 98888-8888`
- [ ] Email Responsável: `responsavel@teste.com`
- [ ] Clicar "Criar Conta"
- [ ] **Esperado:** Conta criada, redirecionamento para onboarding

**2.4 - Onboarding - Escolher Matéria**
- [ ] **Esperado:** Tela "Qual matéria você quer aprender?"
- [ ] Escolher: "Inglês" (ou outra disponível)
- [ ] **Esperado:** Questionário específico de inglês carrega

**2.5 - Onboarding - Responder Questionário**
- [ ] **Step 1 - Objetivo:** "Por que quer aprender inglês?"
  - Escolher: "Trabalho/Carreira"
- [ ] **Step 2 - Nível:** "Qual seu nível atual?"
  - Escolher: "Intermediário"
- [ ] **Step 3 - Disponibilidade:**
  - Horário: "Noite"
  - Horas/semana: "5 horas"
  - Prazo: "6 meses"
- [ ] **Step 4 - Estilo de Aprendizado:**
  - Escolher: "Misto"
  - Experiência prévia: "Estudei 2 anos na escola"
- [ ] **Step 5 - Desafios:**
  - Marcar 2-3 dificuldades: "Vergonha de falar", "Vocabulário limitado"
- [ ] **Step 6 - Metas:**
  - Adicionar meta: "Conseguir assistir séries sem legenda"
  - Adicionar meta: "Fazer entrevista de emprego em inglês"
  - (Até 5 metas)

**2.6 - Finalizar Onboarding**
- [ ] Clicar botão "Começar minha jornada!" 🚀
- [ ] **CRÍTICO:** Verificar se aparece erro de conexão
- [ ] **Esperado:** Mensagem "Perfil configurado com sucesso! 🎉"
- [ ] **Esperado:** Redirecionamento para dashboard do aluno
- [ ] **Se falhar:** **BUG-001** - Anotar mensagem exata do erro

**2.7 - Exploração Dashboard do Aluno**
- [ ] **Esperado:** Dashboard carrega com informações
- [ ] **Checagem:** Nome do aluno aparece
- [ ] **Checagem:** Pontos/Level aparecem (mesmo que zerados)
- [ ] **Checagem:** Card "Próximas Aulas" aparece (vazio inicialmente)
- [ ] **Checagem:** Metas definidas aparecem listadas

#### Repetir para Cada Aluno:

- [ ] **Aluno 1:** Matéria "Inglês" ✅
- [ ] **Aluno 2:** Matéria "Matemática" ✅
- [ ] **Aluno 3:** Matéria "Programação" ✅
- [ ] **Aluno 4:** Matéria "Outros" (teste questionário genérico) ✅
- [ ] **Aluno 5:** (Opcional) ✅

#### Resultados Possíveis:

| Resultado | Ação |
|-----------|------|
| ✅ **Todos alunos completaram onboarding** | SUCESSO! Prosseguir Teste 3 |
| ❌ **Erro "Começar minha jornada"** | **BUG-001** - Backend não respondendo |
| ⚠️ **Alguns campos não aceitam entrada** | Verificar validações no console (F12) |
| ⚠️ **Aluno não aparece no dashboard da professora** | Problema de vinculação - verificar banco |

---

### TESTE 3: Agendar e Realizar Aula ao Vivo

**Objetivo:** Professora agenda aula e realiza videoconferência com aluno  
**Duração:** 20-30 minutos  
**Executores:** Professora + 1 Aluno

#### Passo a Passo:

**3.1 - Professora Agenda Aula**
- [ ] Dashboard da professora > "Aulas" ou "Calendário"
- [ ] Clicar "Nova Aula" ou "Agendar"
- [ ] **Preencher:**
  - Aluno: Selecionar um dos cadastrados
  - Matéria: "Inglês - Conversação"
  - Data: Hoje
  - Horário: Daqui 5 minutos
  - Duração: 30 minutos
- [ ] Salvar
- [ ] **Esperado:** Aula aparece no calendário
- [ ] **Esperado:** Botão "Iniciar Aula" aparece próximo ao horário

**3.2 - Aluno Vê Aula Agendada**
- [ ] Aluno faz login no portal
- [ ] Dashboard > Card "Próximas Aulas"
- [ ] **Esperado:** Aula agendada aparece listada
- [ ] **Esperado:** Horário correto exibido
- [ ] **Checagem:** Botão "Entrar na Aula" fica disponível próximo ao horário

**3.3 - Iniciar Videoconferência**
- [ ] **Professora:** Clicar "Iniciar Aula"
- [ ] **Esperado:** Sala de vídeo abre (Daily.co ou Jitsi)
- [ ] **Esperado:** Câmera e microfone pedem permissão
- [ ] **Esperado:** Professora entra na sala

**3.4 - Aluno Entra na Sala**
- [ ] **Aluno:** Clicar "Entrar na Aula"
- [ ] **Esperado:** Mesmo sala abre para o aluno
- [ ] **Esperado:** Professora e aluno se vêem/ouvem

**3.5 - Testar Funcionalidades da Sala**
- [ ] **Áudio:** Professora fala > Aluno ouve ✅
- [ ] **Áudio:** Aluno fala > Professora ouve ✅
- [ ] **Vídeo:** Ambos se vêem ✅
- [ ] **Compartilhar Tela:** Professora compartilha (se disponível) ✅
- [ ] **Chat:** Enviar mensagem de texto (se disponível) ✅
- [ ] **Duração:** Deixar rodando 10+ minutos
  - ⚠️ Se Jitsi: Vai desconectar em 5min (problema conhecido)
  - ✅ Se Daily.co: Deve funcionar perfeitamente

**3.6 - Encerrar Aula**
- [ ] Professora clica "Encerrar Aula"
- [ ] **Esperado:** Sala fecha para ambos
- [ ] **Esperado:** Retornam ao dashboard
- [ ] **Esperado:** Aula marcada como "Concluída"

**3.7 - Verificação Pós-Aula**
- [ ] Professora vê histórico da aula
- [ ] Aluno vê aula no histórico
- [ ] **Opcional:** Professora adiciona notas sobre a aula
- [ ] **Opcional:** Sistema pede avaliação (estrelas)

#### Resultados Possíveis:

| Resultado | Ação |
|-----------|------|
| ✅ **Videoconferência funcionou perfeitamente** | SUCESSO TOTAL! 🎉 |
| ⚠️ **Jitsi desconectou em 5min** | **BUG-003** - Migrar para Daily.co |
| ❌ **Sala não abriu** | Daily API Key não configurada - CORRIGIR |
| ❌ **Áudio/vídeo não funcionou** | Problema de permissões do navegador |

---

### TESTE 4: Gestão de Pagamentos (Opcional)

**Objetivo:** Testar fluxo de pagamento aluno → professora  
**Duração:** 10 minutos  
**Status:** Opcional (não crítico para pré-alpha)

#### Cenário A: PIX Manual no Sistema

- [ ] Professora define mensalidade do aluno: R$ 150
- [ ] Sistema gera cobrança com vencimento
- [ ] Aluno vê cobrança no seu dashboard
- [ ] Aluno vê chave PIX da professora
- [ ] Aluno marca como "Pago" e anexa comprovante (simulado)
- [ ] Professora recebe notificação
- [ ] Professora aprova pagamento
- [ ] Status muda para "Pago"

#### Cenário B: Pagamento Externo

- [ ] Professora marca aluno como "Pagamento Externo"
- [ ] Aluno não vê cobranças no sistema
- [ ] Professora gerencia fora da plataforma

---

## 🐛 REPORTE DE BUGS DURANTE TESTES

### Formulário de Feedback para Testadores

Prepare um Google Forms ou documento com:

**Informações do Testador:**
- Nome:
- Papel: ( ) Professora ( ) Aluno
- Dispositivo: ( ) Desktop ( ) Mobile
- Navegador: ( ) Chrome ( ) Firefox ( ) Safari ( ) Outro

**Reporte de Problema:**
- O que você estava tentando fazer?
- O que aconteceu?
- O que você esperava que acontecesse?
- Anexar screenshot (se possível)
- Gravidade: ( ) Crítico ( ) Médio ( ) Baixo

**Avaliação Geral:**
- De 1 a 5, quão fácil foi usar a plataforma?
- O que você mais gostou?
- O que você menos gostou?
- Sugestões de melhoria?

### Categorização de Bugs Encontrados

**🔴 CRÍTICOS (Impedem uso básico):**
- Cadastro não funciona
- Onboarding trava
- Videoconferência não inicia
- Sistema inteiro fora do ar

**🟡 MÉDIOS (Causam frustração mas não impedem):**
- Algumas funcionalidades não respondem
- Dados não salvam
- Layout quebrado
- Performance lenta

**🟢 MENORES (Cosméticos ou edge cases):**
- Botão desalinhado
- Texto errado
- Falta de feedback visual
- Problema em situação rara

---

## 📊 MÉTRICAS DE SUCESSO

### Objetivos Quantitativos Mínimos:

- [ ] **80%+ dos testadores** completam cadastro sem ajuda
- [ ] **70%+ dos alunos** finalizam onboarding sem travar
- [ ] **100% das videoaulas** iniciam (mesmo que com problemas menores)
- [ ] **Tempo médio de resposta** < 3 segundos em ações básicas
- [ ] **Zero erros 500** em fluxos críticos (cadastro, login, onboarding)

### Qualitativo:

- [ ] Testadores conseguem navegar intuitivamente
- [ ] Interface não causa confusão excessiva
- [ ] Feedback geral positivo sobre conceito da plataforma
- [ ] Pelo menos 3 sugestões construtivas de melhoria

---

## 🔧 PLANO DE CONTINGÊNCIA

### Se Backend Cair Durante Testes:

1. **Verificar logs:** `pm2 logs` ou equivalente
2. **Reiniciar:** `pm2 restart all` ou `npm run dev`
3. **Comunicar testadores:** "Problema técnico, voltamos em 5 min"
4. **Investigar causa:** Verificar últimas ações antes de cair

### Se Banco de Dados Ficar Lento:

1. **Verificar conexões ativas:** MongoDB Atlas Dashboard
2. **Limpar cache:** Redis flush ou restart
3. **Temporário:** Reduzir número de testadores simultâneos

### Se API Externa Falhar:

| Serviço | Impacto | Solução Temporária |
|---------|---------|-------------------|
| **Daily.co** | Vídeo não funciona | Usar Jitsi por 5min |
| **Resend** | Emails não enviam | Avisar testadores que email pode não chegar |
| **Stripe** | Assinatura falha | Pular pagamento, ativar manualmente |
| **Cloudinary** | Upload falha | Desabilitar upload temporariamente |

### Se Bug Crítico Não Previsto Aparecer:

1. **Anotar tudo:** Screenshot, mensagem de erro, passos para reproduzir
2. **Avaliar impacto:** Bloqueia todos? Ou só alguns fluxos?
3. **Decisão:**
   - Se bloqueia tudo → **PAUSAR TESTES**, corrigir, reagendar
   - Se bloqueia parcial → Continuar testando outros fluxos
4. **Comunicar testadores:** Transparência sobre problema

---

## 📞 SUPORTE AO VIVO DURANTE TESTES

### Preparação:

- [ ] Criar grupo WhatsApp com todos os testadores
- [ ] Estar 100% disponível durante os testes
- [ ] Ter laptop pronto para debug se necessário
- [ ] Ter acesso ao banco de dados (MongoDB Compass)
- [ ] Ter logs do servidor visíveis

### Mensagens Template:

**Boas-vindas:**
```
Olá! 👋 Bem-vindos ao teste do Nexus Academy!

Vamos testar uma plataforma educacional. Esperem bugs - eles são normais e importantes!

📝 Link do formulário de feedback: [link]
💬 Este grupo é para tirar dúvidas em tempo real
🐛 Reportem qualquer problema aqui

Vamos começar! 🚀
```

**Problema técnico:**
```
⚠️ Pessoal, identificamos um problema técnico.

Estamos trabalhando para resolver. Aguardem 5-10 minutos.

Podem pausar os testes e relaxar um pouco! ☕
```

**Sucesso:**
```
🎉 TESTE CONCLUÍDO!

Muito obrigado pela participação de todos!

Por favor, preencham o formulário de feedback: [link]

Suas opiniões são MUITO valiosas! ❤️
```

---

## 📋 CHECKLIST PRÉ-TESTE (Dia Anterior)

### Ambiente Técnico:

- [ ] Backend rodando e acessível
- [ ] Frontend rodando e acessível
- [ ] MongoDB conectado e funcionando
- [ ] Daily.co configurado (ou Jitsi com aviso de 5min)
- [ ] Resend enviando emails
- [ ] Stripe em modo test
- [ ] Cloudinary recebendo uploads
- [ ] Todas as variáveis de ambiente configuradas

### Testes Internos:

- [ ] Você consegue criar conta de professor
- [ ] Você consegue criar conta de aluno usando link do professor
- [ ] Onboarding do aluno completa sem erros
- [ ] Dashboard de ambos carrega
- [ ] Videoconferência inicia
- [ ] Não há erros no console do navegador

### Documentação:

- [ ] Formulário de feedback criado e testado
- [ ] Link do formulário acessível
- [ ] Grupo WhatsApp criado
- [ ] Mensagens template prontas

### Logística:

- [ ] Horário combinado com todos os testadores
- [ ] Você está disponível no horário
- [ ] Você tem backup de internet (celular)
- [ ] Laptop carregado e pronto

---

## 📈 PRÓXIMOS PASSOS APÓS TESTES

### Coleta de Feedback (Dia +1):

- [ ] Consolidar respostas do formulário
- [ ] Criar planilha com bugs reportados
- [ ] Categorizar bugs (crítico/médio/baixo)
- [ ] Calcular métricas (% de sucesso em cada fluxo)

### Priorização de Correções (Dia +2):

- [ ] Listar bugs críticos (impedem uso)
- [ ] Listar melhorias de UX sugeridas
- [ ] Estimar tempo de correção de cada item
- [ ] Criar roadmap de correções

### Decisão (Dia +3):

**Cenário A: Testes Positivos (70%+ sucesso)**
→ Corrigir bugs críticos + planejar Beta público

**Cenário B: Testes Mistos (50-70% sucesso)**
→ Corrigir todos os bugs encontrados + rodar segundo round de testes

**Cenário C: Testes Negativos (< 50% sucesso)**
→ Refatoração profunda + redesign de fluxos problemáticos

---

## 🎓 CONSIDERAÇÕES FINAIS

### O Que Esperar:

✅ **Bugs VÃO acontecer** - É normal e esperado  
✅ **Nem tudo vai funcionar perfeitamente** - Estamos em pré-alpha  
✅ **Feedback negativo é valioso** - Mostra o que melhorar  
✅ **Testadores vão ter dúvidas** - Esteja pronto para suportar  

### O Que NÃO Esperar:

❌ Sistema perfeito sem bugs  
❌ Todos os testadores adorarem tudo  
❌ Zero problemas técnicos  
❌ Funcionalidades avançadas todas funcionando  

### Mentalidade Correta:

> "Cada bug encontrado agora é um bug que NÃO vai afetar usuários reais pagantes no futuro."

> "Feedback honesto, mesmo que negativo, é o melhor presente que os testadores podem dar."

> "Melhor descobrir problemas com 5 amigos do que com 500 clientes pagantes."

---

## 📞 CONTATO E SUPORTE

**Este checklist foi criado para:** Guiar os primeiros testes reais do Nexus Academy em ambiente controlado.

**Próximo documento:** Após testes, criar `ANALISE_FEEDBACK_TESTES.md`

**Dúvidas sobre o checklist?** Revise `RELATORIO_AUDITORIA.md` e `RESUMO_EXECUTIVO.md`

---

**BOA SORTE NOS TESTES! 🚀🎉**

*Lembre-se: O sucesso não é medido pela ausência de bugs, mas pela qualidade do feedback coletado e pela capacidade de iteração rápida.*

