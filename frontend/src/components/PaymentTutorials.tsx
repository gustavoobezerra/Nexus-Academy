import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle, ExternalLink, Copy, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const tutorials = {
  mercadopago: {
    name: 'Mercado Pago',
    logo: '💳',
    steps: [
      {
        title: '1. Criar Conta no Mercado Pago',
        description: 'Primeiro, você precisa ter uma conta no Mercado Pago',
        content: (
          <>
            <p className="mb-3">Acesse <a href="https://www.mercadopago.com.br/hub/registration/landing" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.mercadopago.com.br</a> e clique em "Criar conta grátis"</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Preencha seus dados pessoais (CPF, e-mail, telefone)</li>
              <li>Verifique seu e-mail clicando no link enviado</li>
              <li>Complete seu cadastro com dados bancários</li>
            </ul>
          </>
        )
      },
      {
        title: '2. Acessar o Painel de Desenvolvedores',
        description: 'Agora você precisa gerar suas credenciais de integração',
        content: (
          <>
            <p className="mb-3">Após fazer login, acesse:</p>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg mb-3">
              <a href="https://www.mercadopago.com.br/developers/panel" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-2">
                <ExternalLink size={16} />
                Mercado Pago Developers
              </a>
            </div>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>No menu lateral, clique em "Suas integrações"</li>
              <li>Clique em "Criar aplicação"</li>
              <li>Dê um nome (ex: "Nexus Academy")</li>
              <li>Selecione "Pagamentos online"</li>
            </ul>
          </>
        )
      },
      {
        title: '3. Copiar Access Token',
        description: 'Copie seu Access Token de Produção',
        content: (
          <>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-3">
              <div className="flex gap-2">
                <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-800 dark:text-yellow-300">Importante!</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">Use o Access Token de <strong>PRODUÇÃO</strong>, não o de teste!</p>
                </div>
              </div>
            </div>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Na página da aplicação, procure por "Credenciais de Produção"</li>
              <li>Copie o <strong>Access Token</strong> (começa com APP_USR_...)</li>
              <li>Guarde esse token em local seguro</li>
              <li>Nunca compartilhe esse token publicamente!</li>
            </ul>
          </>
        )
      },
      {
        title: '4. Colar no Nexus Academy',
        description: 'Agora é só colar o token aqui no onboarding',
        content: (
          <>
            <p className="mb-3">De volta ao wizard de onboarding:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Cole o Access Token no campo indicado</li>
              <li>Clique em "Continuar"</li>
              <li>Pronto! Sua integração está configurada</li>
            </ul>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
              <div className="flex gap-2">
                <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-300">Taxas e Prazos</p>
                  <p className="text-sm text-green-700 dark:text-green-400">• Taxa: 2,99% PIX | 4,99% Cartão</p>
                  <p className="text-sm text-green-700 dark:text-green-400">• Prazo: Receba em até 14 dias corridos</p>
                </div>
              </div>
            </div>
          </>
        )
      }
    ]
  },
  asaas: {
    name: 'Asaas',
    logo: '💚',
    steps: [
      {
        title: '1. Criar Conta no Asaas',
        description: 'Cadastre-se gratuitamente no Asaas',
        content: (
          <>
            <p className="mb-3">Acesse <a href="https://www.asaas.com/cadastro" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.asaas.com/cadastro</a></p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Preencha o formulário com seus dados</li>
              <li>Confirme seu e-mail</li>
              <li>Complete o cadastro com dados bancários</li>
              <li>Aguarde aprovação (geralmente 1-2 dias úteis)</li>
            </ul>
          </>
        )
      },
      {
        title: '2. Acessar API Keys',
        description: 'Gere sua chave de API',
        content: (
          <>
            <p className="mb-3">Após aprovação da conta:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Faça login no painel do Asaas</li>
              <li>No menu lateral, vá em "Integrações" → "API Keys"</li>
              <li>Clique em "Gerar nova chave"</li>
              <li>Copie a API Key gerada</li>
            </ul>
          </>
        )
      },
      {
        title: '3. Colar no Nexus Academy',
        description: 'Configure a integração',
        content: (
          <>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Cole a API Key no campo indicado</li>
              <li>Clique em "Continuar"</li>
            </ul>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
              <div className="flex gap-2">
                <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-300">Taxas e Prazos (MELHOR OPÇÃO!)</p>
                  <p className="text-sm text-green-700 dark:text-green-400">• Taxa: 1,49% PIX | 3,49% Cartão</p>
                  <p className="text-sm text-green-700 dark:text-green-400">• Prazo: Receba em 1 dia útil</p>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-2">✅ Mais barato e mais rápido!</p>
                </div>
              </div>
            </div>
          </>
        )
      }
    ]
  },
  pagseguro: {
    name: 'PagSeguro',
    logo: '🟡',
    steps: [
      {
        title: '1. Criar Conta PagSeguro',
        description: 'Cadastre-se no PagSeguro',
        content: (
          <>
            <p className="mb-3">Acesse <a href="https://pagseguro.uol.com.br/cadastro/vendedor" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">pagseguro.uol.com.br</a></p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Clique em "Criar conta grátis"</li>
              <li>Preencha com CPF, e-mail e telefone</li>
              <li>Confirme seu e-mail</li>
              <li>Complete os dados bancários</li>
            </ul>
          </>
        )
      },
      {
        title: '2. Gerar Token de Integração',
        description: 'Crie seu token de API',
        content: (
          <>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Faça login no PagSeguro</li>
              <li>Vá em "Integrações" → "Token de Segurança"</li>
              <li>Clique em "Gerar novo token"</li>
              <li>Copie o token gerado</li>
            </ul>
          </>
        )
      },
      {
        title: '3. Configurar no Nexus',
        description: 'Insira email e token',
        content: (
          <>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Cole o e-mail da sua conta PagSeguro</li>
              <li>Cole o token gerado</li>
              <li>Clique em "Continuar"</li>
            </ul>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
              <div className="flex gap-2">
                <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-800 dark:text-yellow-300">Atenção ao Prazo</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">• Taxa: 3,49% PIX | 4,99% Cartão</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">• Prazo: 30 dias corridos para receber</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-2">⚠️ Prazo mais longo que as outras opções</p>
                </div>
              </div>
            </div>
          </>
        )
      }
    ]
  },
  efi: {
    name: 'Efi Pay (antiga Gerencianet)',
    logo: '🟢',
    steps: [
      {
        title: '1. Criar Conta Efi',
        description: 'Cadastre-se no Efi Pay',
        content: (
          <>
            <p className="mb-3">Acesse <a href="https://sejaefi.com.br/cadastro" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">sejaefi.com.br</a></p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Clique em "Criar conta"</li>
              <li>Preencha o cadastro completo</li>
              <li>Envie documentos para análise</li>
              <li>Aguarde aprovação (1-3 dias úteis)</li>
            </ul>
          </>
        )
      },
      {
        title: '2. Gerar Credenciais de API',
        description: 'Crie Client ID e Client Secret',
        content: (
          <>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Faça login no painel Efi</li>
              <li>Vá em "API" → "Minhas Aplicações"</li>
              <li>Clique em "Criar nova aplicação"</li>
              <li>Copie o Client ID e Client Secret</li>
            </ul>
          </>
        )
      },
      {
        title: '3. Configurar no Nexus',
        description: 'Insira as credenciais',
        content: (
          <>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Cole o Client ID no primeiro campo</li>
              <li>Cole o Client Secret no segundo campo</li>
              <li>Clique em "Continuar"</li>
            </ul>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
              <div className="flex gap-2">
                <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-300">Taxas e Prazos</p>
                  <p className="text-sm text-green-700 dark:text-green-400">• Taxa: 3,49% PIX | 5,49% Cartão</p>
                  <p className="text-sm text-green-700 dark:text-green-400">• Prazo: Receba em 1 dia útil</p>
                </div>
              </div>
            </div>
          </>
        )
      }
    ]
  }
};

export function PaymentTutorials() {
  const { gateway: paramGateway } = useParams<{ gateway: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  // Extrair gateway da URL manualmente se useParams não funcionar
  // A URL pode ser /tutoriais/mercadopago ou similar
  const extractGatewayFromPath = () => {
    const path = location.pathname;
    const match = path.match(/^\/tutoriais\/([^/]+)/);
    return match ? match[1] : null;
  };

  const gateway = paramGateway || extractGatewayFromPath();
  const tutorial = gateway ? tutorials[gateway as keyof typeof tutorials] : null;

  if (!tutorial) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Tutorial não encontrado</h1>
          <button
            onClick={() => navigate('/onboarding')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
          >
            Voltar ao Onboarding
          </button>
        </div>
      </div>
    );
  }

  const copyStepContent = (stepIndex: number) => {
    const step = tutorial.steps[stepIndex];
    const text = `${step.title}\n\n${step.description}`;
    navigator.clipboard.writeText(text);
    setCopiedStep(stepIndex);
    toast.success('Conteúdo copiado!');
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900/50 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Voltar</span>
            </button>
            <div className="text-4xl">{tutorial.logo}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Tutorial: {tutorial.name}
          </h1>
          <p className="text-slate-400 text-lg">
            Siga o passo a passo abaixo para configurar sua integração de pagamentos
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {tutorial.steps.map((step, index) => (
            <div
              key={index}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-indigo-700 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">{step.title}</h2>
                  <p className="text-indigo-400 font-medium">{step.description}</p>
                </div>
                <button
                  onClick={() => copyStepContent(index)}
                  className="ml-4 p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Copiar conteúdo"
                >
                  {copiedStep === index ? (
                    <CheckCircle size={20} className="text-green-500" />
                  ) : (
                    <Copy size={20} className="text-slate-400" />
                  )}
                </button>
              </div>
              <div className="prose prose-invert max-w-none text-slate-300">
                {step.content}
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Tudo configurado?</h3>
          <p className="text-indigo-100 mb-6">
            Volte ao onboarding para continuar a configuração
          </p>
          <button
            onClick={() => navigate('/onboarding')}
            className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Voltar ao Onboarding
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentTutorials;
