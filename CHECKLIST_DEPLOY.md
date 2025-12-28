# ✅ Checklist Interativo de Deploy - Nexus Academy

Use este checklist para garantir que todos os passos sejam seguidos corretamente.

---

## 📦 Preparação Local

- [ ] Código sincronizado com GitHub
- [ ] Dependências instaladas (`npm install` em backend e frontend)
- [ ] Testes locais passando
- [ ] Backend iniciando sem erros (`npm run validate-env`)
- [ ] Frontend buildando corretamente (`npm run build`)

---

## 🔑 Contas e Serviços Externos

### MongoDB Atlas
- [ ] Conta criada em https://www.mongodb.com/cloud/atlas
- [ ] Cluster criado (free tier M0 é suficiente)
- [ ] Usuário de banco criado
- [ ] Network Access configurado (IP `0.0.0.0/0`)
- [ ] Connection string copiada

### Render.com
- [ ] Conta criada em https://render.com
- [ ] GitHub conectado
- [ ] Repositório com acesso permitido

### Stripe
- [ ] Conta criada em https://stripe.com
- [ ] Modo Test ativado (para começar)
- [ ] Produto "Plano Básico" criado
- [ ] Produto "Plano Pro" criado
- [ ] API Keys copiadas (Publishable e Secret)

### Cloudinary
- [ ] Conta criada em https://cloudinary.com
- [ ] Cloud Name, API Key e Secret copiados
- [ ] Pasta de upload criada (opcional)

### Resend
- [ ] Conta criada em https://resend.com
- [ ] API Key criada
- [ ] Domínio verificado (ou usando resend.dev)

### Daily.co
- [ ] Conta criada em https://daily.co
- [ ] API Key criada
- [ ] Configurações de sala ajustadas

### AssemblyAI
- [ ] Conta criada em https://assemblyai.com
- [ ] API Key copiada

---

## 🚀 Deploy no Render

### 1. Push para GitHub
```bash
# Se ainda não inicializou o git:
git init
git add .
git commit -m "Initial commit - Ready for deploy"
git branch -M main
git remote add origin https://github.com/seu-usuario/nexus-academy.git
git push -u origin main
```

- [ ] Código enviado para GitHub
- [ ] Branch main criada
- [ ] Repositório público ou privado configurado

### 2. Conectar Render ao GitHub
1. [ ] Acessar https://dashboard.render.com
2. [ ] Clicar em "New +" → "Blueprint"
3. [ ] Conectar repositório GitHub
4. [ ] Render detecta `render.yaml`
5. [ ] Revisar configuração

### 3. Configurar Variáveis de Ambiente - Backend

No Render Dashboard, seção "Environment":

**Obrigatórias:**
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `5000`
- [ ] `MONGO_URI` = `sua-connection-string-mongodb`
- [ ] `JWT_SECRET` = `gerar-chave-forte-32-chars`
- [ ] `ENCRYPTION_KEY` = `gerar-chave-forte-32-chars`
- [ ] `FRONTEND_URL` = `https://seu-frontend.onrender.com`
- [ ] `API_URL` = `https://seu-backend.onrender.com`

**Stripe:**
- [ ] `STRIPE_SECRET_KEY` = `sk_test_...` (ou `sk_live_...`)
- [ ] `STRIPE_PUBLISHABLE_KEY` = `pk_test_...` (ou `pk_live_...`)
- [ ] `STRIPE_PRICE_BASIC` = `price_...`
- [ ] `STRIPE_PRICE_PRO` = `price_...`

**Outros Serviços:**
- [ ] `RESEND_API_KEY` = `re_...`
- [ ] `CLOUDINARY_CLOUD_NAME` = `seu-cloud-name`
- [ ] `CLOUDINARY_API_KEY` = `sua-api-key`
- [ ] `CLOUDINARY_API_SECRET` = `seu-api-secret`
- [ ] `CLOUDINARY_URL` = `cloudinary://...`
- [ ] `ASSEMBLYAI_API_KEY` = `sua-api-key`
- [ ] `DAILY_API_KEY` = `sua-api-key`

**Opcional:**
- [ ] `GEMINI_API_KEY` = `sua-api-key` (se usar Google Gemini)

### 4. Configurar Variáveis de Ambiente - Frontend

- [ ] `VITE_API_URL` = `https://seu-backend.onrender.com/api`

### 5. Iniciar Deploy

- [ ] Clicar em "Apply" ou "Create"
- [ ] Aguardar build do backend (~2-5 min)
- [ ] Aguardar build do frontend (~1-3 min)
- [ ] Verificar logs (sem erros)

---

## 🧪 Testes Pós-Deploy

### Backend
- [ ] Health check funcionando: `https://seu-backend.onrender.com/api/health`
- [ ] API Docs acessível: `https://seu-backend.onrender.com/api-docs`
- [ ] Logs sem erros críticos
- [ ] MongoDB conectado (verificar logs)

### Frontend
- [ ] Site carregando: `https://seu-frontend.onrender.com`
- [ ] Página de login aparecendo
- [ ] Console sem erros críticos
- [ ] Assets carregando (imagens, CSS)

### Integração
- [ ] Login funcionando
- [ ] Criar conta de professor funcionando
- [ ] Dashboard carregando
- [ ] API respondendo corretamente

---

## 🔧 Configurações Pós-Deploy

### Stripe Webhook
1. [ ] Acessar Stripe Dashboard → Developers → Webhooks
2. [ ] Adicionar endpoint: `https://seu-backend.onrender.com/api/webhooks/stripe`
3. [ ] Selecionar eventos:
   - [ ] `checkout.session.completed`
   - [ ] `customer.subscription.created`
   - [ ] `customer.subscription.updated`
   - [ ] `customer.subscription.deleted`
4. [ ] Copiar Webhook Secret
5. [ ] Adicionar `STRIPE_WEBHOOK_SECRET` no Render
6. [ ] Fazer redeploy

### Domínio Personalizado (Opcional)
- [ ] Comprar domínio (Namecheap, Google Domains, etc)
- [ ] Adicionar domínio no Render (Settings → Custom Domain)
- [ ] Configurar DNS CNAME
- [ ] Aguardar propagação DNS (~24h)
- [ ] SSL automático do Render ativado
- [ ] Atualizar `FRONTEND_URL` e `API_URL`

### Email Configuration
- [ ] Verificar domínio no Resend
- [ ] Configurar DNS records (SPF, DKIM)
- [ ] Testar envio de email

---

## 📊 Monitoramento

### Render Dashboard
- [ ] Verificar CPU usage (< 50% ideal)
- [ ] Verificar Memory usage (< 80% ideal)
- [ ] Configurar alertas
- [ ] Verificar uptime

### Logs
- [ ] Logs de backend sem erros
- [ ] Logs de frontend sem warnings críticos
- [ ] Configurar log retention

### Performance
- [ ] Tempo de resposta da API (< 500ms ideal)
- [ ] Tempo de carregamento do frontend (< 3s ideal)
- [ ] MongoDB queries otimizadas

---

## 🛡️ Segurança Final

- [ ] HTTPS ativado (Render faz automaticamente)
- [ ] Variáveis de ambiente não expostas
- [ ] `.env` no `.gitignore`
- [ ] Rate limiting ativo
- [ ] CORS configurado corretamente
- [ ] Chaves de produção diferentes das de desenvolvimento

---

## 🎉 Lançamento

### Testes Finais
- [ ] Criar conta de professor
- [ ] Adicionar aluno de teste
- [ ] Agendar aula teste
- [ ] Testar videoconferência
- [ ] Testar chat
- [ ] Gerar relatório teste
- [ ] Testar upload de arquivo
- [ ] Testar geração de certificado

### Go Live!
- [ ] Comunicar lançamento
- [ ] Monitorar primeiras 24h
- [ ] Coletar feedback
- [ ] Fazer ajustes rápidos se necessário

---

## 📞 Troubleshooting

### Backend não inicia
- [ ] Verificar logs no Render
- [ ] Confirmar MONGO_URI correto
- [ ] Testar conexão MongoDB no Atlas
- [ ] Verificar variáveis de ambiente

### Frontend com erro 404
- [ ] Verificar `VITE_API_URL` correto
- [ ] Rebuild frontend
- [ ] Verificar logs de build

### CORS errors
- [ ] Confirmar `FRONTEND_URL` no backend
- [ ] Verificar CORS no `server.js`
- [ ] Fazer redeploy

### Stripe não funciona
- [ ] Verificar webhook configurado
- [ ] Verificar `STRIPE_WEBHOOK_SECRET`
- [ ] Testar com Stripe CLI localmente

---

## 📈 Métricas de Sucesso

Após 1 semana:
- [ ] Uptime > 99%
- [ ] Tempo de resposta < 500ms
- [ ] Sem erros críticos
- [ ] Primeiros usuários ativos

Após 1 mês:
- [ ] 10+ professores cadastrados
- [ ] 50+ alunos na plataforma
- [ ] 100+ aulas realizadas
- [ ] Feedback positivo dos usuários

---

## 🎯 Próximos Passos

- [ ] Implementar analytics (Google Analytics)
- [ ] Configurar backup automático
- [ ] Adicionar monitoramento (UptimeRobot)
- [ ] Coletar feedback de usuários
- [ ] Planejar próximas features

---

**Boa sorte com seu deploy! 🚀**

---

**Última atualização:** 28/12/2025
