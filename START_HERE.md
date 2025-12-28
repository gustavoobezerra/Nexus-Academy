# 🚀 NEXUS ACADEMY - COMECE AQUI!
## Guia Rápido de Início Após Correções

**Última Atualização:** 28 de Dezembro de 2025  
**Status:** ✅ Bugs Críticos Corrigidos - Pronto para Testes  

---

## ⚡ INÍCIO RÁPIDO (5 MINUTOS)

```bash
# 1. Clone o repositório (se ainda não fez)
git clone [url-do-repo]
cd Nexus-Academy

# 2. Instale dependências
cd backend-core && npm install
cd ../frontend && npm install

# 3. Configure ambiente (escolha uma opção)
```

### Opção A: Configuração Mínima (Desenvolvimento)

```bash
# Backend
cd backend-core
cat > .env << 'EOF'
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nexus-academy
JWT_SECRET=dev-secret-change-in-production-min-32-chars
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:5000
EOF

# Frontend
cd ../frontend
cat > .env << 'EOF'
VITE_API_URL=http://localhost:5000/api
EOF
```

### Opção B: Configuração Completa (Com APIs)

Leia: [`ENV_SETUP_GUIDE.md`](./ENV_SETUP_GUIDE.md) para configurar:
- ✅ Daily.co (videoconferência)
- ✅ Resend (emails)
- ✅ Cloudinary (arquivos)
- ⚠️ Stripe (pagamentos - opcional em dev)

```bash
# 4. Inicie o sistema

# Terminal 1 - Backend
cd backend-core
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# ✅ Acesse: http://localhost:5173
```

---

## 📋 O QUE FOI CORRIGIDO?

### ✅ Bugs Críticos Resolvidos:

1. **BUG-002: Campos Invisíveis**
   - ❌ Problema: "Preencha este campo" em área vazia
   - ✅ Solução: Removido atributo `required` HTML
   - 📍 Arquivo: `frontend/src/components/onboarding/Step2_PaymentSetup.tsx`

2. **BUG-001: Erro no Onboarding do Aluno**
   - ❌ Problema: Erro de conexão ao finalizar
   - ✅ Solução: Logs detalhados + fallback offline
   - 📍 Arquivo: `frontend/src/components/StudentPortal/StudentOnboarding.tsx`

3. **SEC-001: Chamadas API Inconsistentes**
   - ❌ Problema: Mistura de fetch e axios
   - ✅ Solução: Migrado para apiService centralizado
   - 📍 Arquivo: `frontend/src/components/onboarding/Step2_PaymentSetup.tsx`

**Detalhes completos:** [`CORRECOES_APLICADAS.md`](./CORRECOES_APLICADAS.md)

---

## 🧪 TESTANDO AS CORREÇÕES

### Teste 1: Cadastro de Professor

```bash
# 1. Acesse: http://localhost:5173
# 2. Clique "Cadastrar como Professor"
# 3. Preencha dados básicos
# 4. Step 1: Escolha um slug único
# 5. Step 2: Configure pagamento
#    - Teste "PIX no Sistema" > preencha chave
#    - Mude para "Fora do Sistema"
#    - Clique "Continuar"
# ✅ NÃO deve aparecer erro de campo invisível
# 6. Step 3: Escolha plano (pode pular se Stripe não configurado)
# ✅ Deve completar cadastro com sucesso
```

### Teste 2: Cadastro de Aluno

```bash
# 1. Copie link único do professor (ex: /professor/seu-slug)
# 2. Abra em aba anônima
# 3. Preencha cadastro do aluno
# 4. Complete onboarding (6 steps)
# 5. Clique "Começar minha jornada!"
# ✅ Deve finalizar sem erro

# TESTE EXTRA (Backend Offline):
# 1. Pare o backend (Ctrl+C)
# 2. Repita teste do aluno
# ✅ Deve salvar localmente e permitir continuar
# ⚠️ Aparece aviso: "Sem conexão com servidor"
```

### Teste 3: Videoconferência

```bash
# Pré-requisito: Configure DAILY_API_KEY no backend/.env

# 1. Professor agenda aula para um aluno
# 2. Professor clica "Iniciar Aula"
# ✅ Sala Daily.co abre
# 3. Aluno clica "Entrar na Aula"
# ✅ Ambos se vêem/ouvem
# ⏱️ Deixe rodando 10+ minutos
# ✅ Não deve desconectar (se Daily.co configurado)

# Se DAILY_API_KEY não configurado:
# ⚠️ Sala abre mas não funciona (modo simulado)
# ⚠️ OU usa Jitsi (desconecta em 5min)
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

### Relatórios de Auditoria:

1. **[RESUMO_EXECUTIVO.md](./RESUMO_EXECUTIVO.md)** ⭐ LEIA PRIMEIRO
   - Visão geral consolidada
   - Decisões e recomendações
   - Próximos passos

2. **[RELATORIO_AUDITORIA.md](./RELATORIO_AUDITORIA.md)**
   - Análise técnica completa (18k palavras)
   - 21 problemas identificados
   - Código de correção para cada um

3. **[CHECKLIST_PRE_ALPHA.md](./CHECKLIST_PRE_ALPHA.md)**
   - Roteiros de teste passo a passo
   - Preparação de ambiente
   - Planos de contingência

### Guias de Configuração:

4. **[ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md)**
   - Variáveis de ambiente necessárias
   - Como obter cada API Key
   - Troubleshooting

5. **[CORRECOES_APLICADAS.md](./CORRECOES_APLICADAS.md)**
   - Resumo das mudanças implementadas
   - Antes e depois
   - Checklist de testes

---

## 🎯 PRÓXIMOS PASSOS

### Hoje (2-4 horas):

- [ ] ✅ Configurar ambiente usando `ENV_SETUP_GUIDE.md`
- [ ] ✅ Testar todos os fluxos corrigidos
- [ ] ✅ Configurar Daily.co API Key (30 min)
- [ ] ✅ Verificar se não há erros no console

### Amanhã (6-8 horas):

- [ ] 📖 Ler `CHECKLIST_PRE_ALPHA.md` completo
- [ ] 🧪 Executar testes internos sistemáticos
- [ ] 📝 Preparar documentos para testadores
- [ ] 📱 Criar grupo WhatsApp de suporte

### Depois de Amanhã (3 horas):

- [ ] 👥 Testes com sua irmã (professora)
- [ ] 👥 Testes com 3-5 amigos (alunos)
- [ ] 📊 Consolidar feedback
- [ ] 📋 Planejar correções baseadas no feedback

---

## ⚠️ PROBLEMAS CONHECIDOS

### 🟡 Médios (Não Bloqueantes):

1. **Videoconferência Duplicada**
   - Sistema tem Jitsi E Daily.co instalados
   - Recomendação: Configurar Daily.co e remover Jitsi
   - Prioridade: Média

2. **Componentes Grandes**
   - Alguns arquivos com 800+ linhas
   - Recomendação: Refatorar em componentes menores
   - Prioridade: Baixa (não afeta funcionalidade)

**Detalhes:** `RELATORIO_AUDITORIA.md` seção "BUGS MÉDIOS"

### 🟢 Melhorias Futuras:

- Code splitting (reduzir bundle)
- Paginação em queries grandes
- Dashboard do aluno mais visual
- Refresh automático de JWT

**Não são urgentes. Podem ser feitos pós-testes.**

---

## 🆘 TROUBLESHOOTING RÁPIDO

### "Cannot connect to MongoDB"
```bash
# MongoDB Atlas: Verifique connection string e whitelist IP
# MongoDB Local:
mongod --dbpath ~/data/db
```

### "JWT_SECRET is not defined"
```bash
# Adicione no backend/.env:
JWT_SECRET=your-secret-key-min-32-characters-here
```

### "Failed to fetch" no frontend
```bash
# 1. Verifique se backend está rodando:
curl http://localhost:5000/api/health

# 2. Verifique VITE_API_URL no frontend/.env:
VITE_API_URL=http://localhost:5000/api
```

### "Daily.co não funciona"
```bash
# Configure DAILY_API_KEY no backend/.env
# Obter em: https://dashboard.daily.co/developers
DAILY_API_KEY=sua_key_aqui
```

### Console mostra erros
```bash
# Abra console do navegador (F12)
# Leia erros em vermelho
# Consulte RELATORIO_AUDITORIA.md seção correspondente
```

---

## 💡 DICAS IMPORTANTES

1. **Use dois terminais:** Um para backend, outro para frontend
2. **Verifique logs:** Backend mostra requets, frontend mostra erros
3. **Console do navegador (F12):** Sua melhor ferramenta de debug
4. **MongoDB Compass:** Visualize dados do banco facilmente
5. **Postman/Thunder Client:** Teste endpoints diretamente

---

## 📞 SUPORTE

### Documentação Interna:

- Todos os `.md` na raiz do projeto
- Código comentado nos arquivos principais
- Swagger: http://localhost:5000/api-docs (quando backend rodando)

### Logs e Debug:

```bash
# Backend
cd backend-core
npm run dev
# ✅ Logs aparecem no terminal

# Frontend
# Abra console do navegador (F12)
# ✅ Logs aparecem com prefixo [API], [Onboarding], etc
```

### Comunidade:

- Stack Overflow para dúvidas técnicas
- GitHub Issues para bugs do sistema
- Discord/Telegram para discussão em grupo

---

## ✅ CHECKLIST DE INÍCIO

Antes de começar os testes, verifique:

- [ ] ✅ Node.js 18+ instalado
- [ ] ✅ MongoDB rodando (local ou Atlas)
- [ ] ✅ Dependências instaladas (npm install)
- [ ] ✅ Arquivo .env criado em backend e frontend
- [ ] ✅ Backend rodando sem erros (npm run dev)
- [ ] ✅ Frontend rodando sem erros (npm run dev)
- [ ] ✅ http://localhost:5173 abre sem erro 404
- [ ] ✅ Console do navegador sem erros vermelhos
- [ ] ⚠️ Daily.co configurado (opcional mas recomendado)
- [ ] ⚠️ Resend configurado (opcional para emails)

---

## 🎉 ESTÁ PRONTO!

Se chegou até aqui e todos os checks passaram:

✅ **Sistema está configurado e pronto para testes!**

**Próximo passo:**
1. Leia [`RESUMO_EXECUTIVO.md`](./RESUMO_EXECUTIVO.md) (10 min)
2. Execute testes internos (1-2 horas)
3. Prepare testadores externos ([`CHECKLIST_PRE_ALPHA.md`](./CHECKLIST_PRE_ALPHA.md))

---

**🚀 Boa sorte nos testes! Qualquer dúvida, consulte a documentação detalhada.**

---

**Última atualização:** 28/12/2025  
**Versão:** 2.0.0 (Pós-Correções Críticas)  
**Status:** ✅ Pronto para Testes Pré-Alpha

