# 🧪 TESTE DA VALIDAÇÃO DE SLUG - PASSO A PASSO

## ✅ CORREÇÕES APLICADAS

### 1. **Adicionado logs de debug no console**
Agora você verá no Console do navegador (F12) todas as etapas da validação:
- `[SLUG DEBUG] Valor digitado:...`
- `[SLUG DEBUG] Chamando API...`
- `[SLUG DEBUG] Resposta da API:...`

### 2. **Borda colorida no campo de input**
- 🟢 **Verde** = Slug disponível
- 🔴 **Vermelho** = Slug indisponível ou inválido
- ⚪ **Cinza** = Neutro (campo vazio ou aguardando)

### 3. **Indicador visual de debug**
Em ambiente de desenvolvimento, aparece um box amarelo mostrando:
- Estado do `available` (true/false/null)
- Estado do `checking` (true/false)
- Valor do slug digitado
- Se o botão está habilitado ou desabilitado

---

## 🚀 COMO TESTAR LOCALMENTE

### **PASSO 1: Iniciar o Backend**

Abra um terminal e rode:

```bash
cd backend-core
npm install
npm start
```

Aguarde até ver:
```
✅ Server running on port: 5000
✅ MongoDB: Connected
```

---

### **PASSO 2: Iniciar o Frontend**

Abra OUTRO terminal e rode:

```bash
cd frontend
npm install
npm run dev
```

Aguarde até ver:
```
Local: http://localhost:5173
```

---

### **PASSO 3: Acessar o Onboarding**

1. Abra o navegador em `http://localhost:5173`
2. Faça login ou registre-se
3. Vá até o wizard de onboarding (ou acesse diretamente a rota do onboarding)

---

### **PASSO 4: Testar a Validação de Slug**

#### **Abra o Console do Navegador (F12)**
Pressione `F12` → Aba "Console"

#### **Teste 1: Slug muito curto**
Digite: `ab`

**Esperado:**
- Console: `[SLUG DEBUG] Muito curto`
- Campo: 🔴 **Borda vermelha**
- Mensagem: "Mínimo de 3 caracteres"
- Botão: **DESABILITADO** (cinza)

---

#### **Teste 2: Slug com caracteres inválidos**
Digite: `joão@123`

**Esperado:**
- Console: `[SLUG DEBUG] Formato inválido`
- Campo: 🔴 **Borda vermelha**
- Mensagem: "Use apenas letras minúsculas, números e hífen"
- Botão: **DESABILITADO**

---

#### **Teste 3: Slug válido e disponível**
Digite: `gustavo-teste-123`

**Esperado (após 500ms):**
- Console:
  ```
  [SLUG DEBUG] Validações locais OK, chamando API em 500ms...
  [SLUG DEBUG] Chamando API /onboarding/check-slug com: gustavo-teste-123
  [SLUG DEBUG] Resposta da API: {success: true, available: true, message: "Slug disponível!"}
  [SLUG DEBUG] Slug disponível: true
  ```
- Campo: 🟢 **Borda verde**
- Ícone: ✅ **CheckCircle verde** (à direita)
- Mensagem: "Slug disponível!"
- Botão: **HABILITADO** (azul)
- Box debug: `available=true | checking=false | botão=HABILITADO`

---

#### **Teste 4: Slug reservado**
Digite: `admin`

**Esperado:**
- Console: `[SLUG DEBUG] Resposta da API: {success: false, available: false, message: "Este slug está reservado..."}`
- Campo: 🔴 **Borda vermelha**
- Ícone: ❌ **XCircle vermelho**
- Mensagem: "Este slug está reservado. Escolha outro."
- Botão: **DESABILITADO**

---

#### **Teste 5: Clicar em "Continuar" com slug válido**

1. Digite um slug válido (ex: `prof-gustavo`)
2. Aguarde aparecer borda verde ✅
3. Clique no botão "Continuar"

**Esperado:**
- Console: `[API] POST /onboarding/set-slug`
- Toast verde: "Slug configurado!"
- Avança para o próximo passo do wizard

---

## 🐛 SE NÃO FUNCIONAR - CHECKLIST DE DEBUG

### ❌ **Problema: Nada acontece ao digitar**

**Verifique:**
1. Backend está rodando? `http://localhost:5000/api/health` deve retornar JSON
2. Frontend está rodando? Deve estar em `http://localhost:5173`
3. Console mostra erro de CORS? → Verificar `allowedOrigins` no backend
4. Está logado? Endpoint requer autenticação (`Authorization: Bearer <token>`)

**Como testar se está logado:**
```javascript
// No Console do navegador:
console.log('Token:', localStorage.getItem('token'));
```

Se retornar `null`, faça login novamente.

---

### ❌ **Problema: Console mostra erro 404**

**Exemplo:**
```
POST http://localhost:5173/onboarding/check-slug 404 (Not Found)
```

**Causa:** A URL está sem `/api`

**Solução:** Limpe o cache do navegador:
1. `Ctrl + Shift + Delete`
2. Marque "Cached images and files"
3. Clique "Clear data"
4. Recarregue a página (`Ctrl + F5`)

---

### ❌ **Problema: Console mostra erro de CORS**

**Exemplo:**
```
Access to XMLHttpRequest at 'http://localhost:5000/api/onboarding/check-slug'
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solução:**
Verifique o arquivo `backend-core/src/server.js` linha 50-54:

```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174'
];
```

Certifique-se que `http://localhost:5173` está na lista.

---

### ❌ **Problema: Console mostra erro 401 (Unauthorized)**

**Exemplo:**
```
POST http://localhost:5000/api/onboarding/check-slug 401 (Unauthorized)
```

**Causa:** Token expirado ou inválido

**Solução:**
1. Faça logout
2. Faça login novamente
3. Tente o onboarding de novo

---

### ❌ **Problema: Campo não fica verde mesmo digitando slug válido**

**Debug no Console:**
```javascript
// Cole no Console do navegador:
console.log('Estado atual:', {
  slug: document.querySelector('input[placeholder="seu-nome"]').value,
  token: localStorage.getItem('token'),
  apiUrl: 'http://localhost:5000/api'
});
```

**Copie a saída e me envie para análise.**

---

## 📊 TESTE MANUAL DA API (ALTERNATIVA)

Se o frontend não funcionar, teste direto a API:

### **1. Obter seu token**
1. Faça login no frontend
2. Abra Console (F12)
3. Digite: `console.log(localStorage.getItem('token'))`
4. Copie o token exibido

### **2. Teste via cURL ou Postman**

**Verificar slug:**
```bash
curl -X POST http://localhost:5000/api/onboarding/check-slug \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{"slug": "gustavo-teste"}'
```

**Resposta esperada:**
```json
{
  "success": true,
  "available": true,
  "message": "Slug disponível!"
}
```

---

## 🎯 TESTES EM PRODUÇÃO (RENDER)

### **Depois do Deploy:**

1. Acesse sua URL do Render (ex: `https://nexus-academy.onrender.com`)
2. Faça login
3. Vá ao onboarding
4. Digite um slug válido
5. Abra Console (F12) e observe os logs `[SLUG DEBUG]`

### **Se não funcionar em produção:**

Verifique variáveis de ambiente no Render:
- `VITE_API_URL` deve apontar para URL do backend em produção
- Backend deve ter `FRONTEND_URL` configurado

---

## 📝 RESUMO DO QUE FOI CORRIGIDO

| Arquivo | Mudança |
|---------|---------|
| `Step1_SlugSelection.tsx` | ✅ Substituído `fetch()` por `apiService.post()` |
| | ✅ Adicionado logs de debug no console |
| | ✅ Adicionado bordas coloridas dinâmicas |
| | ✅ Adicionado box de debug visual |
| `Step3_SubscriptionPlan.tsx` | ✅ Substituído `fetch()` por `apiService.post()` |
| `OnboardingSuccess.tsx` | ✅ Substituído `fetch()` por `apiService` |

---

## 🚨 SE AINDA NÃO FUNCIONAR

**Me envie:**

1. **Screenshot do Console (F12)** mostrando os logs `[SLUG DEBUG]`
2. **Screenshot da tela** mostrando:
   - O campo de slug
   - O box amarelo de debug
   - O botão
3. **Resposta da API** (se aparecer no console)

Com essas informações, consigo identificar exatamente onde está o problema!

---

**Boa sorte com os testes! 🚀**
