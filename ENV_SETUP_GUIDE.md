# 🔧 GUIA DE CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE
## Nexus Academy - Setup Completo

Este guia documenta todas as variáveis de ambiente necessárias para rodar o Nexus Academy.

---

## 📋 BACKEND (.env no backend-core/)

Crie o arquivo `backend-core/.env` com o seguinte conteúdo:

```bash
# ===== AMBIENTE =====
NODE_ENV=development
PORT=5000

# ===== BANCO DE DADOS =====
MONGODB_URI=mongodb://localhost:27017/nexus-academy
# Ou MongoDB Atlas: mongodb+srv://usuario:senha@cluster.mongodb.net/nexus-academy

# ===== SEGURANÇA =====
# Gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=sua-chave-super-secreta-minimo-32-caracteres-aqui

# ===== URLs =====
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:5000

# ===== STRIPE (Assinaturas dos Professores) =====
STRIPE_SECRET_KEY=sk_test_sua_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_sua_webhook_secret
STRIPE_BASIC_PRICE_ID=price_id_basico
STRIPE_PRO_PRICE_ID=price_id_pro

# ===== DAILY.CO (Videoconferência - CRÍTICO) =====
DAILY_API_KEY=sua_daily_api_key
# Obter em: https://dashboard.daily.co/developers

# ===== RESEND (Emails - CRÍTICO) =====
RESEND_API_KEY=re_sua_resend_api_key
# Obter em: https://resend.com/api-keys

# ===== CLOUDINARY (Upload de Arquivos - CRÍTICO) =====
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=sua_api_secret
# Obter em: https://cloudinary.com/console

# ===== OPCIONAIS =====
ASSEMBLYAI_API_KEY=
GEMINI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 📋 FRONTEND (.env no frontend/)

Crie o arquivo `frontend/.env` com o seguinte conteúdo:

```bash
# URL do backend
VITE_API_URL=http://localhost:5000/api

# Stripe Publishable Key (opcional)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_sua_stripe_key
```

---

## ✅ SETUP RÁPIDO (Mínimo para Testes)

Execute estes comandos:

```bash
# 1. Backend
cd backend-core
cat > .env << 'EOF'
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nexus-academy
JWT_SECRET=change-this-to-a-random-32-character-string-in-production
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:5000
DAILY_API_KEY=your_daily_key_here
RESEND_API_KEY=your_resend_key_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
EOF

# 2. Frontend
cd ../frontend
cat > .env << 'EOF'
VITE_API_URL=http://localhost:5000/api
EOF
```

---

## 🔑 OBTENDO AS API KEYS

### Daily.co (Videoconferência)
1. Acesse: https://dashboard.daily.co/
2. Crie conta gratuita
3. Vá em "Developers" > "API Keys"
4. Copie a key
5. **Plano Free:** 10.000 minutos/mês

### Resend (Emails)
1. Acesse: https://resend.com/
2. Crie conta gratuita
3. Vá em "API Keys"
4. Crie uma nova key
5. **Plano Free:** 3.000 emails/mês

### Cloudinary (Arquivos)
1. Acesse: https://cloudinary.com/
2. Crie conta gratuita
3. Dashboard mostra: Cloud Name, API Key, API Secret
4. **Plano Free:** 25GB de armazenamento

### Stripe (Pagamentos)
1. Acesse: https://dashboard.stripe.com/test/apikeys
2. Use keys de TESTE (começam com sk_test_)
3. Configure webhook em: https://dashboard.stripe.com/test/webhooks
4. URL do webhook: `http://seu-dominio.com/api/webhooks/stripe`

---

## ✅ VERIFICAÇÃO

Execute para verificar se está tudo configurado:

```bash
# Backend
cd backend-core
npm run dev
# Deve iniciar sem erros de "undefined"

# Frontend (em outro terminal)
cd frontend
npm run dev
# Deve abrir em http://localhost:5173
```

---

## 🚨 TROUBLESHOOTING

### Erro: "JWT_SECRET is not defined"
**Solução:** Adicione `JWT_SECRET` no .env do backend

### Erro: "Cannot connect to MongoDB"
**Solução:** 
- MongoDB local: Inicie com `mongod`
- MongoDB Atlas: Verifique connection string e whitelist de IP

### Erro: "Failed to fetch" no frontend
**Solução:** Verifique se `VITE_API_URL` aponta para URL correta do backend

### Videoconferência não funciona
**Solução:** Configure `DAILY_API_KEY` (vídeo só funciona com API key real)

---

## 📝 NOTAS IMPORTANTES

1. **NUNCA commite arquivos .env** no Git
2. `.env` deve estar no `.gitignore`
3. Use `.env.example` como template
4. Em produção, use variáveis de ambiente do servidor
5. Keys de teste do Stripe são seguras para commit, mas evite

---

Pronto! Agora você está pronto para rodar o Nexus Academy localmente! 🚀

