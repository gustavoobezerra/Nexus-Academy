# 🚀 Guia de Deploy - Nexus Academy

## 📋 Pré-requisitos

1. **Contas Necessárias:**
   - [Render.com](https://render.com) (hospedagem)
   - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (banco de dados)
   - [Cloudinary](https://cloudinary.com) (upload de arquivos)
   - [Stripe](https://stripe.com) (pagamentos)
   - [Resend](https://resend.com) (emails)
   - [Daily.co](https://daily.co) (videoconferência)
   - [AssemblyAI](https://www.assemblyai.com) (transcrição)

2. **Repositório Git:**
   - Seu código deve estar em um repositório GitHub/GitLab

## 🎯 Opções de Deploy

### Opção 1: Render.com (RECOMENDADO)

#### Vantagens:
- ✅ Deploy automático via Git
- ✅ SSL grátis
- ✅ Plano free tier generoso
- ✅ Suporte nativo para Node.js e Static Sites
- ✅ Variáveis de ambiente fáceis de configurar

#### Passos:

1. **Preparar Repositório:**
   ```bash
   # Inicializar git (se ainda não fez)
   git init
   git add .
   git commit -m "Initial commit for deploy"

   # Conectar com GitHub
   git remote add origin https://github.com/seu-usuario/nexus-academy.git
   git push -u origin main
   ```

2. **Deploy no Render:**
   - Acesse [Render Dashboard](https://dashboard.render.com)
   - Clique em "New +" → "Blueprint"
   - Conecte seu repositório GitHub
   - O Render detectará automaticamente o arquivo `render.yaml`
   - Configure as variáveis de ambiente (veja seção abaixo)
   - Clique em "Apply"

3. **Configurar Variáveis de Ambiente:**

   No painel do Render, configure estas variáveis para o **Backend**:
   ```
   NODE_ENV=production
   PORT=5000
   MONGO_URI=<sua-connection-string-mongodb>
   JWT_SECRET=<gerar-chave-forte>
   ENCRYPTION_KEY=<gerar-chave-forte>
   FRONTEND_URL=<url-do-frontend-render>
   API_URL=<url-do-backend-render>
   STRIPE_SECRET_KEY=<sua-chave-stripe>
   STRIPE_PUBLISHABLE_KEY=<sua-chave-publica-stripe>
   STRIPE_PRICE_BASIC=<price-id-basico>
   STRIPE_PRICE_PRO=<price-id-pro>
   RESEND_API_KEY=<sua-chave-resend>
   CLOUDINARY_CLOUD_NAME=<seu-cloud-name>
   CLOUDINARY_API_KEY=<sua-api-key>
   CLOUDINARY_API_SECRET=<seu-api-secret>
   CLOUDINARY_URL=<sua-url-cloudinary>
   ASSEMBLYAI_API_KEY=<sua-chave-assemblyai>
   DAILY_API_KEY=<sua-chave-daily>
   ```

   Para o **Frontend**:
   ```
   VITE_API_URL=<url-do-backend-render>
   ```

### Opção 2: Alternativas

#### Railway.app
- Similar ao Render
- Excelente para projetos Node.js
- $5/mês após free tier

#### Vercel (Frontend) + Railway (Backend)
- Vercel: Ótimo para frontend React
- Railway: Ótimo para backend Node.js
- Combinação poderosa

#### Heroku
- Clássico, mas mais caro
- Sem plano free desde 2022

## 🔐 Configuração de Serviços Externos

### MongoDB Atlas

1. Acesse [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crie um cluster (tier free é suficiente para começar)
3. Configure acesso de rede:
   - Database Access: Crie usuário e senha
   - Network Access: Adicione IP `0.0.0.0/0` (permitir de qualquer lugar)
4. Copie a connection string: `mongodb+srv://usuario:senha@cluster.mongodb.net/nexus-academy`

### Stripe

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com)
2. Ative o modo Test para testes
3. Crie produtos e preços:
   - Plano Básico (mensal)
   - Plano Pro (mensal)
4. Copie as API keys: Publishable key e Secret key
5. Configure webhook para `/api/webhooks/stripe`

### Cloudinary

1. Acesse [Cloudinary Console](https://console.cloudinary.com)
2. Copie: Cloud Name, API Key, API Secret
3. Crie pasta de upload: `nexus-academy/`

### Resend

1. Acesse [Resend Dashboard](https://resend.com/dashboard)
2. Crie API Key
3. Verifique domínio de email (ou use resend.dev para testes)

### Daily.co

1. Acesse [Daily Dashboard](https://dashboard.daily.co)
2. Crie API Key
3. Configure limites de sala conforme necessário

### AssemblyAI

1. Acesse [AssemblyAI Dashboard](https://www.assemblyai.com/dashboard)
2. Copie API Key
3. Plano free: 5 horas/mês

## 🧪 Testar Antes do Deploy

```bash
# Backend
cd backend-core
npm install
npm start

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev
```

Acesse: http://localhost:5173

## 📊 Monitoramento Pós-Deploy

1. **Logs do Render:**
   - Acesse o dashboard do serviço
   - Aba "Logs" mostra logs em tempo real

2. **Health Checks:**
   - Backend: `https://seu-backend.onrender.com/api/health`
   - Frontend: `https://seu-frontend.onrender.com`

3. **Métricas:**
   - Render mostra CPU, memória e requests

## 🐛 Troubleshooting

### Backend não inicia
- Verifique logs no Render
- Confirme MONGO_URI está correto
- Teste conexão MongoDB no Atlas

### Frontend com erro 404
- Verifique se `VITE_API_URL` aponta para backend correto
- Rebuild frontend: força novo build no Render

### CORS errors
- Adicione URL do frontend em `FRONTEND_URL` no backend
- Verifique configuração CORS no `backend-core/src/server.js`

### Stripe webhook não funciona
- Configure webhook URL no Stripe Dashboard
- URL: `https://seu-backend.onrender.com/api/webhooks/stripe`
- Copie webhook secret e adicione em `STRIPE_WEBHOOK_SECRET`

## 🔄 Deploy Contínuo

Render faz deploy automático quando você faz push:

```bash
git add .
git commit -m "Nova feature"
git push origin main
```

## 📈 Escalonamento

### Render Free Tier Limits:
- **Web Services**: 750 horas/mês (suficiente para 1 instância 24/7)
- **Static Sites**: Ilimitado
- **Bandwidth**: 100GB/mês

### Upgrade necessário quando:
- Mais de 1000 usuários ativos
- Precisa de múltiplas instâncias
- Uso intensivo de CPU/memória

### Planos Render:
- **Starter**: $7/mês por serviço
- **Standard**: $25/mês (mais recursos)
- **Pro**: $85/mês (alta disponibilidade)

## 🎉 Checklist Final

- [ ] Repositório no GitHub configurado
- [ ] Variáveis de ambiente configuradas no Render
- [ ] MongoDB Atlas configurado e acessível
- [ ] Stripe com produtos criados e webhook configurado
- [ ] Cloudinary com credenciais válidas
- [ ] Resend com API key válida
- [ ] Daily.co com API key válida
- [ ] AssemblyAI com API key válida
- [ ] Testes locais realizados
- [ ] Deploy realizado no Render
- [ ] Health checks passando
- [ ] Teste de login funcionando
- [ ] Teste de criação de aluno funcionando
- [ ] Teste de videoconferência funcionando

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no Render
2. Teste localmente primeiro
3. Consulte documentação do Render: https://render.com/docs
4. Entre em contato com suporte do serviço específico

---

**Boa sorte com seu deploy! 🚀**
