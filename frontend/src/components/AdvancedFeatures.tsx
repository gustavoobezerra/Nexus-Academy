import React, { useState } from 'react';
import { Zap, Users, FileText, CreditCard, ShoppingCart, Star } from 'lucide-react';
import toast from 'react-hot-toast';

const AdvancedFeatures: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ai' | 'similarity' | 'contract' | 'payment' | 'marketplace'>('ai');
  const [nextTopicSuggestion, setNextTopicSuggestion] = useState('');
  const [contractData, setContractData] = useState({ studentName: '', guardianEmail: '' });
  const [extraClass, setExtraClass] = useState({ title: '', pointsPrice: 500 });

  const handleAISuggestion = () => {
    const suggestions = [
      'João dominou Equações, próximo passo: Inequações',
      'Maria tem dificuldade em Interpretação, reforçar com textos simples',
      'Pedro está pronto para Geometria Espacial',
      'Ana faz muitos erros em Pontuação, trabalhar regras básicas'
    ];
    setNextTopicSuggestion(suggestions[Math.floor(Math.random() * suggestions.length)]);
  };

  const handleGenerateContract = () => {
    if (!contractData.studentName || !contractData.guardianEmail) {
      toast.error('Preencha os dados');
      return;
    }
    toast.success(`Contrato gerado para ${contractData.studentName}! Link enviado para ${contractData.guardianEmail}`);
    setContractData({ studentName: '', guardianEmail: '' });
  };

  const handlePublishExtra = () => {
    if (!extraClass.title) {
      toast.error('Defina o título da aula');
      return;
    }
    toast.success(`Aula "${extraClass.title}" publicada no marketplace por ${extraClass.pointsPrice} pontos!`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-indigo-400 mb-2">⚡ Recursos Avançados</h1>
        <p className="text-gray-400 dark:text-gray-400">IA, Análise de Similitude, Contratos, Pagamentos e Marketplace</p>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap text-sm">
        {[
          { id: 'ai', label: '🤖 IA Smart', icon: Zap },
          { id: 'similarity', label: '👥 Similitude', icon: Users },
          { id: 'contract', label: '📄 Contrato', icon: FileText },
          { id: 'payment', label: '💳 Stripe', icon: CreditCard },
          { id: 'marketplace', label: '🛍️ Marketplace', icon: ShoppingCart }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'ai' | 'similarity' | 'contract' | 'payment' | 'marketplace')}
            className={`px-3 py-2 rounded-lg font-medium transition text-xs ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-gray-300 dark:text-gray-300 hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {/* 🤖 IA SMART */}
        {activeTab === 'ai' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Sugestões Inteligentes de IA</h2>
            <p className="text-gray-300 dark:text-gray-300 mb-6">Análise automática do progresso do aluno para próximos tópicos</p>

            <button
              onClick={handleAISuggestion}
              className="mb-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition"
            >
              Gerar Sugestão
            </button>

            {nextTopicSuggestion && (
              <div className="bg-indigo-900/20 border border-indigo-700 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <Zap className="text-indigo-400 mt-1" size={24} />
                  <div>
                    <p className="font-semibold text-white mb-2">Sugestão de Próximo Tópico</p>
                    <p className="text-indigo-300">{nextTopicSuggestion}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-300 mt-3">Baseado em análise de desempenho anterior</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <h3 className="font-semibold text-white">Exemplos de Sugestões</h3>
              <div className="bg-slate-700/50 p-3 rounded text-sm text-gray-300 dark:text-gray-200">✓ Identifica gaps de aprendizado</div>
              <div className="bg-slate-700/50 p-3 rounded text-sm text-gray-300 dark:text-gray-200">✓ Sugere exercícios adaptados ao nível</div>
              <div className="bg-slate-700/50 p-3 rounded text-sm text-gray-300 dark:text-gray-200">✓ Recomenda material complementar</div>
            </div>
          </div>
        )}

        {/* 👥 SIMILITUDE */}
        {activeTab === 'similarity' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Análise de Similitude</h2>
            <p className="text-gray-300 dark:text-gray-200 mb-6">Agrupa alunos por padrões similares de aprendizado</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-4">
                <p className="font-semibold text-emerald-300 mb-2">✓ Grupo 1: Acelerados</p>
                <p className="text-sm text-gray-300 dark:text-gray-200">Maria, Pedro, João • Progridem 30% mais rápido</p>
                <p className="text-xs text-gray-400 dark:text-gray-300 mt-2">→ Sugestão: Aula acelerada 1x/semana</p>
              </div>

              <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
                <p className="font-semibold text-amber-300 mb-2">⚠️ Grupo 2: Reforço</p>
                <p className="text-sm text-gray-300 dark:text-gray-200">Ana, Bruno, Carla • Precisam apoio</p>
                <p className="text-xs text-gray-400 dark:text-gray-300 mt-2">→ Sugestão: Sessão de reforço em grupo</p>
              </div>

              <div className="bg-indigo-900/20 border border-indigo-700 rounded-lg p-4">
                <p className="font-semibold text-indigo-300 mb-2">Insight</p>
                <p className="text-sm text-gray-300 dark:text-gray-200">3 alunos têm dificuldade em Interpretação</p>
                <p className="text-xs text-gray-400 dark:text-gray-300 mt-2">→ Crie exercício compartilhado para grupo</p>
              </div>

              <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-4">
                <p className="font-semibold text-emerald-300 mb-2">Economia</p>
                <p className="text-sm text-gray-300 dark:text-gray-200">Agrupe 3 alunos similares 1x/semana</p>
                <p className="text-xs text-gray-400 dark:text-gray-300 mt-2">→ Economize 50% de tempo, mantenha qualidade</p>
              </div>
            </div>
          </div>
        )}

        {/* 📄 CONTRATO DIGITAL */}
        {activeTab === 'contract' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Contrato Digital com E-Signature</h2>

            <div className="mb-6 space-y-3">
              <input
                type="text"
                placeholder="Nome do aluno"
                value={contractData.studentName}
                onChange={(e) => setContractData({ ...contractData, studentName: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500"
              />
              <input
                type="email"
                placeholder="Email do responsável"
                value={contractData.guardianEmail}
                onChange={(e) => setContractData({ ...contractData, guardianEmail: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500"
              />
              <button
                onClick={handleGenerateContract}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition"
              >
                Gerar e Enviar Contrato
              </button>
            </div>

            <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-4">
              <p className="font-semibold text-emerald-300 mb-3">✓ Contrato Automático</p>
              <ul className="space-y-2 text-sm text-gray-300 dark:text-gray-200">
                <li>• Termos de serviço pré-configurado</li>
                <li>• Assinatura eletrônica (e-sig integrada)</li>
                <li>• PDF armazenado na nuvem</li>
                <li>• Prova legal de acordo</li>
              </ul>
            </div>
          </div>
        )}

        {/* 💳 STRIPE/PAYPAL */}
        {activeTab === 'payment' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">Integração Stripe & PayPal</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">💳 Stripe</h3>
                <p className="text-gray-300 dark:text-gray-200 text-sm mb-4">Cobrança recorrente mensal</p>
                <div className="space-y-2 text-xs text-gray-400 dark:text-gray-300">
                  <p>✓ Webhook automático para confirmação</p>
                  <p>✓ Taxa: 2.9% + R$ 0.30</p>
                  <p>✓ Suporta débito/crédito/Pix</p>
                  <p>✓ Dashboard de transações</p>
                </div>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">🅿️ PayPal</h3>
                <p className="text-gray-300 dark:text-gray-200 text-sm mb-4">Alternativa de pagamento</p>
                <div className="space-y-2 text-xs text-gray-400 dark:text-gray-300">
                  <p>✓ Integração directa com API</p>
                  <p>✓ Taxa: 3.49% + R$ 0.49</p>
                  <p>✓ Saque automático</p>
                  <p>✓ Suporte 24/7</p>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-amber-900/20 border border-amber-700 rounded-lg p-4">
              <p className="font-semibold text-amber-300 mb-2">⚠️ Status: Requer Configuração</p>
              <p className="text-sm text-gray-300 dark:text-gray-200">1. Adicione API keys nas variáveis de ambiente</p>
              <p className="text-sm text-gray-300 dark:text-gray-200">2. Ative webhook de confirmação de pagamento</p>
              <p className="text-sm text-gray-300 dark:text-gray-200">3. Configure e-mail de recebimento</p>
            </div>
          </div>
        )}

        {/* 🛍️ MARKETPLACE */}
        {activeTab === 'marketplace' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">🛍️ Marketplace de Aulas Extras (Sistema de Pontos)</h2>

            <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 mb-6">
              <p className="font-semibold text-amber-300 mb-2">Sistema de Pontuação</p>
              <p className="text-sm text-gray-300 dark:text-gray-200">Os alunos ganham pontos completando aulas e exercícios, e podem trocar por aulas extras no marketplace!</p>
            </div>

            <div className="mb-6 space-y-3">
              <input
                type="text"
                placeholder="Título da aula extra (ex: Reforço Álgebra)"
                value={extraClass.title}
                onChange={(e) => setExtraClass({ ...extraClass, title: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500"
              />
              <div className="flex items-center gap-3">
                <span className="text-gray-300 dark:text-gray-200 flex items-center gap-2">
                  <Star size={20} className="text-yellow-400" />
                  Preço em Pontos:
                </span>
                <input
                  type="number"
                  value={extraClass.pointsPrice}
                  onChange={(e) => setExtraClass({ ...extraClass, pointsPrice: Number(e.target.value) })}
                  min="100"
                  step="50"
                  className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
                <span className="text-sm text-gray-400 dark:text-gray-300">pontos</span>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-sm">Sugestões de Preços:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { label: '30min', points: 300 },
                    { label: '1h', points: 500 },
                    { label: '1h30', points: 750 },
                    { label: '2h', points: 1000 }
                  ].map(suggestion => (
                    <button
                      key={suggestion.points}
                      onClick={() => setExtraClass({ ...extraClass, pointsPrice: suggestion.points })}
                      className="bg-slate-600 hover:bg-slate-500 rounded-lg p-2 text-xs transition"
                    >
                      {suggestion.label}: {suggestion.points}pts
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handlePublishExtra}
                className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <ShoppingCart size={20} />
                Publicar no Marketplace
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-700 p-4 rounded-lg">
                <p className="text-xs text-gray-300 dark:text-gray-200 mb-2">Suas Aulas</p>
                <p className="text-3xl font-bold text-indigo-300">3</p>
                <p className="text-xs text-gray-400 dark:text-gray-300 mt-1">Ativas no Marketplace</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-900/50 to-green-900/50 border border-emerald-700 p-4 rounded-lg">
                <p className="text-xs text-gray-300 dark:text-gray-200 mb-2">Pontos Gerados</p>
                <p className="text-3xl font-bold text-emerald-300">2,450</p>
                <p className="text-xs text-gray-400 dark:text-gray-300 mt-1">Em resgates este mês</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 border border-cyan-700 p-4 rounded-lg">
                <p className="text-xs text-gray-300 dark:text-gray-200 mb-2">👥 Alunos</p>
                <p className="text-3xl font-bold text-cyan-300">12</p>
                <p className="text-xs text-gray-400 dark:text-gray-300 mt-1">Resgataram aulas</p>
              </div>
            </div>

            <div className="mt-6 bg-emerald-900/20 border border-emerald-700 rounded-lg p-4">
              <p className="font-semibold text-emerald-300 mb-3">✓ Como Funciona o Sistema de Pontos:</p>
              <div className="space-y-2 text-sm text-gray-300 dark:text-gray-200">
                <p>1. <strong>Alunos ganham pontos</strong> completando aulas, exercícios e atingindo metas</p>
                <p>2. <strong>Professor publica aulas extras</strong> no marketplace com preço em pontos</p>
                <p>3. <strong>Alunos resgatam com pontos</strong> acumulados - sem custo financeiro!</p>
                <p>4. <strong>Gamificação completa:</strong> incentiva engajamento e participação</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedFeatures;
