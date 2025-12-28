# 🎨 TEMPLATES DE CUSTOMIZAÇÃO

> **Jogo de Substituição:** Copie, cole e troque apenas as palavras marcadas!

---

## 📋 COMO USAR ESTE GUIA

1. **Escolha** o template que quer usar
2. **Copie** o código completo
3. **Substitua** as partes entre `___UNDERLINES___`
4. **Cole** no arquivo certo
5. **Teste** e veja funcionar!

**🎯 Regra de Ouro:** Se tem `___ASSIM___`, você DEVE trocar. O resto pode deixar como está!

---

## 📚 ÍNDICE DE TEMPLATES

1. [Adicionar Nova API](#1-adicionar-nova-api)
2. [Criar Novo Componente de Formulário](#2-criar-novo-componente-de-formulário)
3. [Adicionar Nova Rota/Página](#3-adicionar-nova-rotapágina)
4. [Customizar Cores do Tema](#4-customizar-cores-do-tema)
5. [Adicionar Campo em Formulário Existente](#5-adicionar-campo-em-formulário-existente)
6. [Criar Novo Toast/Notificação](#6-criar-novo-toastnotificação)
7. [Adicionar Validação Customizada](#7-adicionar-validação-customizada)

---

## 1. ADICIONAR NOVA API

### 📍 ONDE: `frontend/src/lib/api.ts`

### 📝 TEMPLATE:

```typescript
// ============================================================================
// API PARA ___NOME_DA_FEATURE___ (___DESCRIÇÃO___)
// ============================================================================

export const ___nomeAPI___ = {
  // Buscar todos os itens
  getAll: () => apiService.get('/___rota-no-backend___'),

  // Buscar um item específico por ID
  getOne: (id: string) => apiService.get(`/___rota-no-backend___/${id}`),

  // Criar novo item
  create: (data: any) => apiService.post('/___rota-no-backend___', data),

  // Atualizar item existente
  update: (id: string, data: any) => apiService.put(`/___rota-no-backend___/${id}`, data),

  // Deletar item
  delete: (id: string) => apiService.delete(`/___rota-no-backend___/${id}`),
};
```

### ✏️ EXEMPLO PREENCHIDO (Sistema de Notas):

```typescript
// ============================================================================
// API PARA NOTAS (Gerenciar notas de provas e trabalhos)
// ============================================================================

export const notasAPI = {
  // Buscar todas as notas de um aluno
  getAll: () => apiService.get('/notas'),

  // Buscar uma nota específica
  getOne: (id: string) => apiService.get(`/notas/${id}`),

  // Criar nova nota
  create: (data: any) => apiService.post('/notas', data),

  // Atualizar nota existente
  update: (id: string, data: any) => apiService.put(`/notas/${id}`, data),

  // Deletar nota
  delete: (id: string) => apiService.delete(`/notas/${id}`),
};
```

### 🎯 COMO USAR DEPOIS:

```typescript
// Em qualquer componente:
import { notasAPI } from '../../lib/api';

// Buscar todas as notas:
const notas = await notasAPI.getAll();

// Criar uma nota nova:
await notasAPI.create({
  aluno: 'João',
  materia: 'Matemática',
  valor: 8.5,
  data: '2025-01-15'
});
```

---

## 2. CRIAR NOVO COMPONENTE DE FORMULÁRIO

### 📍 ONDE: `frontend/src/components/___NomeDoComponente___.tsx`

### 📝 TEMPLATE:

```typescript
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ___iconeAPI___ } from '../../lib/api';

interface ___NomeDoFormulario___Data {
  ___campo1___: string;
  ___campo2___: number;
  // Adicione mais campos conforme necessário
}

export const ___NomeDoComponente___ = () => {
  // Estados para cada campo do formulário
  const [___campo1___, set___Campo1___] = useState('');
  const [___campo2___, set___Campo2___] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await ___iconeAPI___.create({
        ___campo1___,
        ___campo2___,
      });

      toast.success('___MENSAGEM_DE_SUCESSO___!');

      // Limpar formulário
      set___Campo1___('');
      set___Campo2___(0);

    } catch (error) {
      toast.error('___MENSAGEM_DE_ERRO___');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">___TÍTULO_DO_FORMULÁRIO___</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campo 1 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            ___LABEL_CAMPO_1___
          </label>
          <input
            type="text"
            value={___campo1___}
            onChange={(e) => set___Campo1___(e.target.value)}
            placeholder="___PLACEHOLDER_CAMPO_1___"
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>

        {/* Campo 2 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            ___LABEL_CAMPO_2___
          </label>
          <input
            type="number"
            value={___campo2___}
            onChange={(e) => set___Campo2___(Number(e.target.value))}
            placeholder="___PLACEHOLDER_CAMPO_2___"
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>

        {/* Botão de Enviar */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? '___TEXTO_CARREGANDO___...' : '___TEXTO_BOTAO___'}
        </button>
      </form>
    </div>
  );
};
```

### ✏️ EXEMPLO PREENCHIDO (Cadastro de Tarefa):

```typescript
import { useState } from 'react';
import toast from 'react-hot-toast';
import { tarefasAPI } from '../../lib/api';

interface TarefaData {
  titulo: string;
  pontos: number;
}

export const CadastrarTarefa = () => {
  const [titulo, setTitulo] = useState('');
  const [pontos, setPontos] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await tarefasAPI.create({
        titulo,
        pontos,
      });

      toast.success('Tarefa criada com sucesso!');

      setTitulo('');
      setPontos(0);

    } catch (error) {
      toast.error('Erro ao criar tarefa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Nova Tarefa</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Título da Tarefa
          </label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Fazer exercícios de matemática"
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Pontos (XP)
          </label>
          <input
            type="number"
            value={pontos}
            onChange={(e) => setPontos(Number(e.target.value))}
            placeholder="Ex: 50"
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Criando...' : 'Criar Tarefa'}
        </button>
      </form>
    </div>
  );
};
```

---

## 3. ADICIONAR NOVA ROTA/PÁGINA

### 📍 ONDE: `frontend/src/App.tsx` (ou arquivo de rotas)

### 📝 TEMPLATE:

```typescript
// 1. Importar o componente
import { ___NomeDoComponente___ } from './components/___caminho___/___NomeDoComponente___';

// 2. Adicionar a rota dentro de <Routes>
<Route path="/___url-da-pagina___" element={<___NomeDoComponente___ />} />
```

### ✏️ EXEMPLO PREENCHIDO (Página de Tarefas):

```typescript
// 1. Importar
import { TarefasPage } from './components/Tarefas/TarefasPage';

// 2. Adicionar rota
<Route path="/tarefas" element={<TarefasPage />} />
```

### 🎯 COMO NAVEGAR PARA A PÁGINA:

```typescript
// Em qualquer componente:
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// Em um botão:
<button onClick={() => navigate('/tarefas')}>
  Ver Tarefas
</button>
```

---

## 4. CUSTOMIZAR CORES DO TEMA

### 📍 ONDE: `frontend/tailwind.config.js`

### 📝 TEMPLATE:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        '___nome-da-cor___': {
          50: '___cor-mais-clara___',
          100: '___...',
          200: '___...',
          300: '___...',
          400: '___...',
          500: '___cor-base___',    // ← Cor principal
          600: '___...',
          700: '___...',
          800: '___...',
          900: '___cor-mais-escura___',
        }
      }
    }
  }
}
```

### ✏️ EXEMPLO PREENCHIDO (Tema Roxo):

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'roxo-nexus': {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',  // ← Roxo principal
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        }
      }
    }
  }
}
```

### 🎯 COMO USAR AS CORES:

```typescript
// Em qualquer className:
<div className="bg-roxo-nexus-500 text-white">
  Fundo roxo com texto branco
</div>

<button className="bg-roxo-nexus-600 hover:bg-roxo-nexus-700">
  Botão roxo que escurece ao passar o mouse
</button>
```

---

## 5. ADICIONAR CAMPO EM FORMULÁRIO EXISTENTE

### 📝 TEMPLATE (Adicionar um campo de texto):

```typescript
// 1. ADICIONAR ESTADO (no topo do componente)
const [___nomeDoCampo___, set___NomeDoCampo___] = useState('');

// 2. ADICIONAR NO JSX (dentro do <form>)
<div>
  <label className="block text-sm font-medium mb-2">
    ___LABEL_VISÍVEL___
  </label>
  <input
    type="___tipo___"  {/* text, email, number, date, etc */}
    value={___nomeDoCampo___}
    onChange={(e) => set___NomeDoCampo___(e.target.value)}
    placeholder="___TEXTO_DE_AJUDA___"
    className="w-full px-4 py-2 border rounded-lg"
    required={___true_ou_false___}
  />
</div>

// 3. INCLUIR NO ENVIO (dentro do try do handleSubmit)
await ___API___.create({
  // ... campos existentes ...
  ___nomeDoCampo___,  // ← Adicione aqui
});
```

### ✏️ EXEMPLO PREENCHIDO (Adicionar campo "Categoria"):

```typescript
// 1. Estado
const [categoria, setCategoria] = useState('');

// 2. JSX
<div>
  <label className="block text-sm font-medium mb-2">
    Categoria
  </label>
  <select
    value={categoria}
    onChange={(e) => setCategoria(e.target.value)}
    className="w-full px-4 py-2 border rounded-lg"
    required
  >
    <option value="">Selecione...</option>
    <option value="urgente">Urgente</option>
    <option value="normal">Normal</option>
    <option value="baixa">Baixa Prioridade</option>
  </select>
</div>

// 3. Envio
await tarefasAPI.create({
  titulo,
  pontos,
  categoria,  // ← Campo novo
});
```

---

## 6. CRIAR NOVO TOAST/NOTIFICAÇÃO

### 📝 TEMPLATE:

```typescript
// Importar (já deve estar importado):
import toast from 'react-hot-toast';

// SUCESSO (verde)
toast.success('___MENSAGEM___', {
  duration: ___MILISSEGUNDOS___,  // Quanto tempo fica na tela
  icon: '___EMOJI___',            // Emoji opcional
});

// ERRO (vermelho)
toast.error('___MENSAGEM___', {
  duration: ___MILISSEGUNDOS___,
});

// AVISO (amarelo)
toast('___MENSAGEM___', {
  icon: '⚠️',
  duration: ___MILISSEGUNDOS___,
});

// CARREGANDO (girando)
const loadingToast = toast.loading('___MENSAGEM___');
// Quando terminar:
toast.dismiss(loadingToast);
```

### ✏️ EXEMPLOS PREENCHIDOS:

```typescript
// Sucesso simples
toast.success('Dados salvos com sucesso!');

// Sucesso com emoji e duração customizada
toast.success('Parabéns! Você ganhou 50 pontos!', {
  duration: 5000,  // 5 segundos
  icon: '🎉',
});

// Erro detalhado
toast.error('Ops! Não foi possível salvar. Tente novamente.', {
  duration: 4000,
});

// Aviso
toast('Atenção: Esta ação não pode ser desfeita!', {
  icon: '⚠️',
  duration: 6000,
});

// Loading que desaparece depois
const loading = toast.loading('Enviando dados...');
// ... faz a requisição ...
toast.dismiss(loading);
toast.success('Dados enviados!');
```

---

## 7. ADICIONAR VALIDAÇÃO CUSTOMIZADA

### 📝 TEMPLATE:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // ═══════════════════════════════════════════════════
  //  VALIDAÇÕES (ANTES de enviar para o backend)
  // ═══════════════════════════════════════════════════

  // VALIDAÇÃO 1: ___DESCRIÇÃO___
  if (___CONDIÇÃO_DO_ERRO___) {
    toast.error('___MENSAGEM_DE_ERRO___');
    return; // Para aqui, não continua
  }

  // VALIDAÇÃO 2: ___DESCRIÇÃO___
  if (___CONDIÇÃO_DO_ERRO___) {
    toast.error('___MENSAGEM_DE_ERRO___');
    return;
  }

  // Se chegou aqui, está tudo OK!
  setLoading(true);
  try {
    // ... código normal de envio ...
  }
};
```

### ✏️ EXEMPLOS PREENCHIDOS:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // VALIDAÇÃO: Email deve ter @
  if (!email.includes('@')) {
    toast.error('📧 Email inválido! Deve conter @');
    return;
  }

  // VALIDAÇÃO: Senha mínima
  if (password.length < 6) {
    toast.error('🔒 Senha deve ter pelo menos 6 caracteres');
    return;
  }

  // VALIDAÇÃO: Confirmar senha
  if (password !== confirmPassword) {
    toast.error('🔑 As senhas não coincidem');
    return;
  }

  // VALIDAÇÃO: Idade mínima
  if (idade < 13) {
    toast.error('🎂 Você deve ter pelo menos 13 anos');
    return;
  }

  // VALIDAÇÃO: Pontos positivos
  if (pontos <= 0) {
    toast.error('⭐ Pontos devem ser maior que zero');
    return;
  }

  // VALIDAÇÃO: Título não vazio
  if (titulo.trim() === '') {
    toast.error('📝 Título não pode estar vazio');
    return;
  }

  // Tudo válido! Prosseguir...
  setLoading(true);
  try {
    await tarefasAPI.create({ titulo, pontos });
    toast.success('Tarefa criada!');
  } catch (error) {
    toast.error('Erro ao criar tarefa');
  } finally {
    setLoading(false);
  }
};
```

---

## 🎮 DESAFIO: CRIE SEU PRÓPRIO!

Agora é sua vez! Use os templates acima para criar:

### 🏆 **Nível Iniciante:**
- [ ] Adicionar campo "Observações" em um formulário existente
- [ ] Mudar a cor do botão de "indigo" para "roxo"
- [ ] Criar toast de sucesso com emoji diferente

### 🥈 **Nível Intermediário:**
- [ ] Criar nova API para "Certificados"
- [ ] Adicionar validação de CPF em formulário
- [ ] Criar página nova de "Conquistas"

### 🥇 **Nível Avançado:**
- [ ] Criar formulário completo de cadastro de cursos
- [ ] Adicionar sistema de upload de imagens
- [ ] Implementar filtro de busca em lista

---

## 📖 GLOSSÁRIO DE SUBSTITUIÇÕES COMUNS

| Placeholder | O que colocar | Exemplo |
|-------------|---------------|---------|
| `___nomeDoCampo___` | Nome da variável (camelCase) | `email`, `nomeCompleto`, `dataDeNascimento` |
| `___NomeDoCampo___` | Nome formatado (PascalCase) | `Email`, `NomeCompleto`, `DataDeNascimento` |
| `___MENSAGEM___` | Texto que aparece para o usuário | `"Salvo com sucesso!"` |
| `___rota-no-backend___` | URL da API | `/alunos`, `/tarefas`, `/notas` |
| `___tipo___` | Tipo do campo HTML | `text`, `email`, `number`, `date`, `password` |
| `___EMOJI___` | Emoji decorativo | `🎉`, `✅`, `❌`, `⚠️`, `📧` |

---

## 💡 DICAS DE OURO

### ✅ **BOAS PRÁTICAS:**

1. **Nomes claros:** Use `emailDoAluno` ao invés de `e` ou `x`
2. **Um estado por campo:** Não junte tudo em um objeto se não precisar
3. **Validar antes de enviar:** Sempre valide no frontend E no backend
4. **Mensagens amigáveis:** "Senha incorreta" é melhor que "Error 401"
5. **Loading states:** Sempre desabilite botões durante requisições

### ❌ **ERROS COMUNS:**

1. **Esquecer `required`:** Campo obrigatório sem validação
2. **Não limpar formulário:** Após enviar, limpe os campos
3. **Toast sem mensagem:** `toast.success('')` não mostra nada!
4. **Validação apenas no frontend:** Backend SEMPRE deve validar também
5. **Copiar ID errado:** Certifique-se que está usando o ID certo

---

## 🔗 PRÓXIMOS PASSOS

Agora que você domina os templates básicos:

1. **Pratique** criando suas próprias customizações
2. **Experimente** combinar templates diferentes
3. **Documente** suas mudanças (comentários no código)
4. **Compartilhe** com a equipe o que criou!

---

**🎨 Templates criados com ❤️ para facilitar sua vida!**
