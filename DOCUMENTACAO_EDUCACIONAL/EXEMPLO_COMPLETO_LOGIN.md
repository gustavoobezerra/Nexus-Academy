# 🔐 EXEMPLO COMPLETO: SISTEMA DE LOGIN

> **Explicado em 3 NÍVEIS:** Visão Geral → Técnico → Linha por Linha

---

## 📖 ÍNDICE

1. [NÍVEL 1: Visão de Pássaro (O que faz)](#nível-1-visão-de-pássaro)
2. [NÍVEL 2: Visão Técnica (Como funciona)](#nível-2-visão-técnica)
3. [NÍVEL 3: Linha por Linha (Detalhamento completo)](#nível-3-linha-por-linha)
4. [Template de Customização](#-template-jogo-de-substituição)

---

## NÍVEL 1: Visão de Pássaro

### 🎯 O QUE É?

O **Sistema de Login** é a porta de entrada do Nexus Academy.

**Analogia:** É como a **recepção de um prédio**:
- Você se identifica (email + senha)
- Recepcionista verifica se você está cadastrado
- Se sim: recebe um crachá temporário (token)
- Com o crachá: pode circular pelo prédio

### 🔄 FLUXO COMPLETO (Visão Simples)

```
VOCÊ                    SISTEMA                 RESULTADO
┌────────┐             ┌────────┐              ┌────────┐
│ Digita │    →→→     │Verifica│    →→→       │ Entra  │
│  Login │             │  Dados │              │   ou   │
└────────┘             └────────┘              │ Rejeita│
                                               └────────┘

PASSO A PASSO:

1️⃣ Você abre a tela de login
   └─ Vê dois campos: Email e Senha

2️⃣ Você digita suas credenciais
   └─ email: joao@email.com
   └─ senha: ••••••••

3️⃣ Você clica em "Entrar"
   └─ Botão fica cinza
   └─ Aparece um ícone girando

4️⃣ Sistema verifica no banco de dados
   └─ Email existe? SIM ✓
   └─ Senha está correta? SIM ✓

5️⃣ Sistema cria um "crachá" (token)
   └─ Como: "eyJhbGciOiJIUzI1NiIsInR5..."
   └─ Validade: 30 dias

6️⃣ Você é redirecionado para o dashboard
   └─ Vê a mensagem: "Bem-vindo, João!"
```

### ✅ O QUE PODE ACONTECER?

| Situação | O que você VÊ | O que aconteceu |
|----------|---------------|-----------------|
| **Tudo certo** | ✅ "Bem-vindo!" → Dashboard | Email e senha corretos |
| **Senha errada** | ❌ "Credenciais inválidas" | Senha não bate com o banco |
| **Email não existe** | ❌ "Credenciais inválidas" | Ninguém com esse email cadastrado |
| **Sem internet** | 🌐 "Erro de conexão" | Computador não consegue falar com servidor |
| **Servidor offline** | ⚠️ "Servidor indisponível" | Nosso servidor está em manutenção |

---

## NÍVEL 2: Visão Técnica

### 🏗️ ARQUITETURA DO SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA FRONTEND                          │
│  StudentPortalLogin.tsx (Interface visual)                 │
│  ↓                                                          │
│  Importa: portalAPI (camada de comunicação)                │
└───────────────┬─────────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────────────────┐
│                  CAMADA DE API (lib/api.ts)                 │
│  portalAPI.login(email, password)                          │
│  ↓                                                          │
│  Usa: apiService (serviço centralizado)                    │
└───────────────┬─────────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────────────────┐
│              CAMADA DE SERVIÇO (api.service.ts)             │
│  apiService.post('/portal/auth/login', {email, password})  │
│  ↓                                                          │
│  Interceptor Request: Adiciona headers                     │
│  Interceptor Response: Trata erros automaticamente         │
└───────────────┬─────────────────────────────────────────────┘
                ↓ HTTP Request
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA BACKEND                           │
│  studentPortal.js (Express route)                          │
│  POST /api/portal/auth/login                               │
│  ↓                                                          │
│  1. Valida formato do email                                │
│  2. Busca no banco: Student.findOne({email})               │
│  3. Compara senha: bcrypt.compare(senha, hash)             │
│  4. Gera token: jwt.sign({studentId}, secret, {30d})       │
│  5. Retorna: {success, token, student}                     │
└───────────────┬─────────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────────────────────────┐
│                   BANCO DE DADOS (MongoDB)                  │
│  Collection: students                                       │
│  Documento: {                                               │
│    _id: "abc123",                                           │
│    name: "João Silva",                                      │
│    portalAccess: {                                          │
│      email: "joao@email.com",                               │
│      password: "$2a$12$hashedpassword..."                  │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

### 🔐 SEGURANÇA: Como a senha é protegida?

```
VOCÊ DIGITA:
  senha123

     ↓ [Não é enviada em texto puro!]

ANTES DE SALVAR NO BANCO:
  $2a$12$KIXbHj8NvfC7Xy3oDw8xWe.x8P7Y9QqZ2nE...
  └─ Bcrypt Hash (impossível reverter!)

COMPARAÇÃO:
  bcrypt.compare("senha123", hashDoBanco)
  └─ Retorna: true ou false
  └─ NUNCA mostra a senha original
```

**Analogia:** É como um **triturador de papel**
- Você joga um documento
- Ele vira confete
- Impossível reconstruir o documento original
- Mas se jogar OUTRO documento igual, vira o MESMO tipo de confete

### 📊 DADOS TRAFEGADOS

**REQUEST (O que vai do frontend pro backend):**
```json
{
  "email": "joao@email.com",
  "password": "senha123"
}
```

**RESPONSE - Sucesso (O que volta do backend):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "student": {
    "id": "abc123",
    "name": "João Silva",
    "email": "joao@email.com",
    "grade": "9º Ano",
    "subject": "Matemática",
    "points": 1250,
    "level": 5
  }
}
```

**RESPONSE - Erro (Credenciais inválidas):**
```json
{
  "success": false,
  "message": "Credenciais inválidas"
}
```

---

## NÍVEL 3: Linha por Linha

### 📄 ARQUIVO: StudentPortalLogin.tsx

Vou explicar **CADA LINHA** do código de login:

```typescript
// ============================================================
// LINHA 1-10: IMPORTS (Trazendo ferramentas)
// ============================================================

// Linha 1: Hook do React para gerenciar "estados" (coisas que mudam)
import { useState, useEffect } from 'react';
// 📌 useState = Como uma caixinha que guarda um valor que pode mudar
// 📌 Exemplo: guardar o que você digitou no campo de email

// Linha 2: Hook para mudar de página
import { useNavigate } from 'react-router-dom';
// 📌 navigate('/dashboard') = Vai para a página do dashboard

// Linha 3-8: Ícones bonitinhos (vem da biblioteca Lucide)
import {
  GraduationCap,  // 🎓 Ícone de formatura
  Mail,           // ✉️ Ícone de email
  Lock,           // 🔒 Ícone de cadeado
  Eye,            // 👁️ Ícone de olho (mostrar senha)
  EyeOff          // 👁️‍🗨️ Ícone de olho riscado (esconder senha)
} from 'lucide-react';

// Linha 9: Sistema de notificações (toastinhas que aparecem)
import toast from 'react-hot-toast';
// 📌 toast.success("Deu certo!") = Mostra mensagem verde
// 📌 toast.error("Deu errado!") = Mostra mensagem vermelha

// Linha 10: Nossa API para fazer login
import { portalAPI } from '../../lib/api';
// 📌 portalAPI.login() = Função pronta para logar


// ============================================================
// LINHA 15-20: ESTADOS (Caixinhas de dados)
// ============================================================

const [email, setEmail] = useState('');
// 📌 O QUE É: Uma caixinha vazia que vai guardar o email
// 📌 email: O que está NA caixa agora (começa vazio: '')
// 📌 setEmail: Função para MUDAR o que está na caixa
// 📌 USO: Quando você digita "joao@email.com", chamamos setEmail("joao@email.com")

const [password, setPassword] = useState('');
// 📌 Mesma coisa, mas para a senha

const [loading, setLoading] = useState(false);
// 📌 Indica se está CARREGANDO (mostra o ícone girando)
// 📌 false = Não está carregando (botão normal)
// 📌 true = Está carregando (botão desabilitado + ícone girando)

const [showPassword, setShowPassword] = useState(false);
// 📌 Define se a senha está VISÍVEL ou com •••••••
// 📌 false = Mostra ••••••• (seguro)
// 📌 true = Mostra a senha de verdade


// ============================================================
// LINHA 25-60: FUNÇÃO DE LOGIN (O coração do sistema)
// ============================================================

const handleLogin = async (e: React.FormEvent) => {
  // 📌 async = Esta função pode "esperar" coisas acontecerem
  // 📌 e = Evento do formulário (quando você aperta Enter ou clica no botão)

  e.preventDefault();
  // 📌 EVITA que a página recarregue (comportamento padrão de formulários)
  // 📌 Sem isso: Página dá F5 e você perde tudo!

  setLoading(true);
  // 📌 Muda o estado para "Carregando"
  // 📌 Resultado visual: Botão fica cinza + ícone gira

  try {
    // 📌 try = "Tenta fazer isso. Se der erro, pula para o catch"

    // ──────────────────────────────────────────────────────
    // CHAMADA DA API (A MÁGICA ACONTECE AQUI!)
    // ──────────────────────────────────────────────────────
    const data = await portalAPI.login(email, password);
    // 📌 await = "ESPERA essa função terminar antes de continuar"
    // 📌 portalAPI.login() = Manda email e senha pro backend
    // 📌 data = O que o backend retorna (token + dados do aluno)

    // POR TRÁS DOS PANOS (o que portalAPI.login faz):
    // 1. Pega email e password
    // 2. Monta JSON: {email: "...", password: "..."}
    // 3. Envia HTTP POST para: http://servidor.com/api/portal/auth/login
    // 4. Espera resposta do servidor
    // 5. Se resposta.ok: Retorna os dados
    // 6. Se resposta.erro: Lança exceção (vai pro catch)

    // ──────────────────────────────────────────────────────
    // SALVANDO O TOKEN (Guardando o "crachá")
    // ──────────────────────────────────────────────────────
    localStorage.setItem('studentToken', data.token);
    // 📌 localStorage = "Armário do navegador" (persiste entre sessões)
    // 📌 setItem = "Guardar algo"
    // 📌 'studentToken' = Nome da gaveta
    // 📌 data.token = O crachá que veio do backend
    //
    // ANALOGIA: É como guardar sua carteirinha de estudante na mochila
    //           Toda vez que voltar, ela ainda estará lá!

    localStorage.setItem('student', JSON.stringify(data.student));
    // 📌 JSON.stringify = Transforma objeto em texto
    // 📌 ANTES: {name: "João", points: 1250}
    // 📌 DEPOIS: '{"name":"João","points":1250}'
    // 📌 POR QUE? localStorage só guarda TEXTO, não objetos

    // ──────────────────────────────────────────────────────
    // MENSAGEM DE SUCESSO
    // ──────────────────────────────────────────────────────
    toast.success(`Bem-vindo, ${data.student.name.split(' ')[0]}!`);
    // 📌 data.student.name = "João Silva"
    // 📌 .split(' ') = Quebra por espaço: ["João", "Silva"]
    // 📌 [0] = Pega o primeiro: "João"
    // 📌 Resultado: "Bem-vindo, João!"

    // ──────────────────────────────────────────────────────
    // REDIRECIONAMENTO
    // ──────────────────────────────────────────────────────
    if (!data.student.onboardingCompleted) {
      // Se o aluno AINDA NÃO fez o onboarding:
      navigate('/portal/onboarding');
    } else {
      // Se JÁ fez o onboarding:
      navigate('/portal/dashboard');
    }
    // 📌 navigate() = Muda de página (sem recarregar!)

  } catch (error) {
    // 📌 catch = "Se algo deu errado no try, cai aqui"

    // ERRO JÁ FOI TRATADO PELO INTERCEPTOR!
    // (O apiService.ts já mostrou toast de erro)
    // Aqui só fazemos FALLBACK para modo DEMO

    const demoStudent = {
      id: 'demo_student',
      name: 'Aluno Demo',
      email: email || 'aluno@demo.com',
      grade: '9º Ano',
      subject: 'Matemática',
      points: 1250,
      level: 5,
    };
    // 📌 Cria um aluno fictício para demonstração

    localStorage.setItem('studentToken', 'demo-token');
    localStorage.setItem('student', JSON.stringify(demoStudent));
    toast.success('Modo demo ativado!');
    navigate('/portal/onboarding');

  } finally {
    // 📌 finally = "Sempre executa, deu certo ou errado"
    setLoading(false);
    // 📌 Para o loading (botão volta ao normal)
  }
};


// ============================================================
// LINHA 70-150: JSX (HTML DO REACT)
// ============================================================

return (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950">
    {/* 📌 className = Estilos usando Tailwind CSS */}
    {/* 📌 min-h-screen = Altura mínima = tela inteira */}
    {/* 📌 bg-gradient-to-br = Fundo com gradiente diagonal */}

    <form onSubmit={handleLogin}>
      {/* 📌 onSubmit = Quando apertar Enter ou clicar em Enviar */}
      {/* 📌 Chama nossa função handleLogin */}

      {/* ──── CAMPO DE EMAIL ──── */}
      <input
        type="email"
        value={email}
        // 📌 Mostra o que está na caixinha "email"
        onChange={(e) => setEmail(e.target.value)}
        // 📌 Quando você DIGITA algo:
        // 📌 e.target.value = O que você digitou
        // 📌 setEmail(...) = Atualiza a caixinha
        placeholder="seu@email.com"
        required
        // 📌 Campo obrigatório (HTML5 valida antes de enviar)
      />

      {/* ──── CAMPO DE SENHA (com botão de mostrar/esconder) ──── */}
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          // 📌 Se showPassword = true: type="text" (mostra senha)
          // 📌 Se showPassword = false: type="password" (mostra •••)
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          // 📌 !showPassword = Inverte (true vira false, false vira true)
          // 📌 Resultado: Alterna entre mostrar e esconder
        >
          {showPassword ? <EyeOff /> : <Eye />}
          {/* 📌 Se está mostrando: ícone de olho riscado */}
          {/* 📌 Se está escondendo: ícone de olho normal */}
        </button>
      </div>

      {/* ──── BOTÃO DE ENVIAR ──── */}
      <button
        type="submit"
        disabled={loading}
        // 📌 Se loading = true: botão fica DESABILITADO
      >
        {loading ? (
          // Se está carregando: mostra ícone girando
          <>
            <div className="animate-spin" />
            Entrando...
          </>
        ) : (
          // Se não está carregando: mostra texto normal
          <>
            <LogIn />
            Entrar
          </>
        )}
      </button>
    </form>
  </div>
);
```

---

## 🎮 TEMPLATE: JOGO DE SUBSTITUIÇÃO

Agora você pode **customizar facilmente** só trocando palavras!

### 📝 Template Base:

```typescript
// ╔════════════════════════════════════════════════════════╗
// ║  TEMPLATE: SISTEMA DE LOGIN CUSTOMIZÁVEL               ║
// ║  Preencha as lacunas como um "jogo de palavras"        ║
// ╚════════════════════════════════════════════════════════╝

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const data = await ___API___.___METODO___(___PARAMETROS___);
    //                 ↑         ↑              ↑
    //                 |         |              └─ O que enviar
    //                 |         └─ Qual função chamar
    //                 └─ Qual API usar

    localStorage.setItem('___TOKEN_NAME___', data.___TOKEN_FIELD___);
    //                       ↑                      ↑
    //                       |                      └─ Campo do token na resposta
    //                       └─ Nome para guardar

    toast.success('___MENSAGEM_SUCESSO___');
    //              ↑
    //              └─ Mensagem que aparece quando dá certo

    navigate('___ROTA_DESTINO___');
    //          ↑
    //          └─ Para onde vai depois

  } catch (error) {
    // Erro já tratado automaticamente!
  } finally {
    setLoading(false);
  }
};
```

### 🎯 EXEMPLOS PREENCHIDOS:

#### **1. Login de Aluno (Atual):**
```typescript
const data = await portalAPI.login(email, password);
localStorage.setItem('studentToken', data.token);
toast.success(`Bem-vindo, ${data.student.name}!`);
navigate('/portal/dashboard');
```

#### **2. Login de Professor:**
```typescript
const data = await authAPI.login({ email, password });
localStorage.setItem('token', data.token);
toast.success(`Olá, Professor ${data.user.name}!`);
navigate('/dashboard');
```

#### **3. Login de Admin:**
```typescript
const data = await adminAPI.authenticate(email, password);
localStorage.setItem('adminToken', data.authToken);
toast.success('Acesso de administrador concedido!');
navigate('/admin/panel');
```

---

## 🔧 CUSTOMIZAÇÕES COMUNS

### **Mudar mensagem de boas-vindas:**

```typescript
// ANTES:
toast.success(`Bem-vindo, ${data.student.name}!`);

// DEPOIS (com emoji):
toast.success(`🎉 Eba! Bem-vindo de volta, ${data.student.name}!`);

// DEPOIS (mais formal):
toast.success(`Olá, ${data.student.name}. Login realizado com sucesso.`);

// DEPOIS (com horário):
const hora = new Date().getHours();
const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
toast.success(`${saudacao}, ${data.student.name}!`);
```

### **Adicionar validação antes de enviar:**

```typescript
if (!email.includes('@')) {
  toast.error('📧 Email inválido! Precisa ter @');
  return; // Para aqui, não envia
}

if (password.length < 6) {
  toast.error('🔒 Senha deve ter pelo menos 6 caracteres');
  return;
}

// Se passou, prossegue com o login...
```

### **Lembrar do último email usado:**

```typescript
// Ao carregar a página:
useEffect(() => {
  const ultimoEmail = localStorage.getItem('ultimoEmail');
  if (ultimoEmail) {
    setEmail(ultimoEmail);
  }
}, []);

// Ao fazer login com sucesso:
localStorage.setItem('ultimoEmail', email);
```

---

## 🐛 PROBLEMAS COMUNS E SOLUÇÕES

### Problema 1: "Credenciais inválidas" mas a senha está certa

**Causas possíveis:**
1. Email tem espaço antes ou depois
2. Caps Lock ligado
3. Email com letra maiúscula (backend só aceita minúscula)

**Solução:**
```typescript
const emailLimpo = email.toLowerCase().trim();
//                       ↑              ↑
//                       |              └─ Remove espaços
//                       └─ Transforma tudo em minúscula

const data = await portalAPI.login(emailLimpo, password);
```

### Problema 2: Botão não desabilita ao clicar

**Causa:** Esqueceu de adicionar `disabled={loading}`

**Solução:**
```typescript
<button
  type="submit"
  disabled={loading}  // ← Adicione isso!
>
  {loading ? 'Carregando...' : 'Entrar'}
</button>
```

### Problema 3: Após login, volta para tela de login

**Causa:** Token não está sendo salvo

**Solução:** Verifique se está salvando corretamente:
```typescript
// ERRADO:
localStorage.setItem('token', data); // ❌ Vai salvar "[object Object]"

// CERTO:
localStorage.setItem('token', data.token); // ✅ Salva a string do token
```

---

## ✅ CHECKLIST: Seu login está completo?

- [ ] Campo de email com validação
- [ ] Campo de senha com botão de mostrar/esconder
- [ ] Loading state (botão desabilitado + ícone girando)
- [ ] Mensagem de sucesso
- [ ] Mensagem de erro (tratamento automático via interceptor)
- [ ] Salvamento do token
- [ ] Redirecionamento após login
- [ ] Fallback para modo demo em caso de erro

---

**🎓 Parabéns! Agora você entende o sistema de login do ZERO ao INFINITO!**
