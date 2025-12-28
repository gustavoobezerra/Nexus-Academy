import React, { useState } from 'react';
import {
  Check, ChevronRight, ChevronLeft, User,
  Settings, DollarSign, Rocket, Star
} from 'lucide-react';
import toast from 'react-hot-toast';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    hourlyRate: '',
    pixKey: '',
    automationEnabled: true
  });

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
    else handleFinish();
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = () => {
    toast.success('Configuração concluída com sucesso!');
    onComplete();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User size={32} />
              </div>
              <h3 className="text-2xl font-bold">Perfil do Professor</h3>
              <p className="text-slate-500 dark:text-slate-400">Conte-nos um pouco sobre você.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  placeholder="Ex: Prof. Ricardo Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sua Principal Matéria</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  placeholder="Ex: Matemática, Inglês, Violão..."
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <DollarSign size={32} />
              </div>
              <h3 className="text-2xl font-bold">Financeiro</h3>
              <p className="text-slate-500 dark:text-slate-400">Configure como você recebe seus pagamentos.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Valor da Hora/Aula (R$)</label>
                <input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={e => setFormData({...formData, hourlyRate: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  placeholder="80"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Chave PIX (para cobranças automáticas)</label>
                <input
                  type="text"
                  value={formData.pixKey}
                  onChange={e => setFormData({...formData, pixKey: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  placeholder="E-mail, CPF ou Celular"
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Settings size={32} />
              </div>
              <h3 className="text-2xl font-bold">Automações</h3>
              <p className="text-slate-500 dark:text-slate-400">Ative o motor de produtividade.</p>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-700">
                <div>
                  <p className="font-bold">Lembretes de Aula</p>
                  <p className="text-xs text-slate-500">Enviar WhatsApp 24h antes da aula</p>
                </div>
                <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-700">
                <div>
                  <p className="font-bold">Resumos com IA</p>
                  <p className="text-xs text-slate-500">Gerar relatório pós-aula automaticamente</p>
                </div>
                <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-700">
                <div>
                  <p className="font-bold">Cobrança Automática</p>
                  <p className="text-xs text-slate-500">Notificar atrasos de pagamento</p>
                </div>
                <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 text-center animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Rocket size={48} className="animate-bounce" />
            </div>
            <h3 className="text-3xl font-bold">Tudo Pronto!</h3>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              Você está pronto para transformar suas aulas com o Nexus Academy.
            </p>
            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 text-left">
              <h4 className="font-bold text-indigo-900 dark:text-indigo-300 mb-3 flex items-center gap-2">
                <Star size={18} /> O que fazer agora?
              </h4>
              <ul className="space-y-2 text-sm text-indigo-800/80 dark:text-indigo-400/80">
                <li className="flex items-center gap-2"><Check size={14} /> Adicione seu primeiro aluno</li>
                <li className="flex items-center gap-2"><Check size={14} /> Agende sua primeira aula</li>
                <li className="flex items-center gap-2"><Check size={14} /> Deixe a IA cuidar da preparação</li>
              </ul>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Progress Bar */}
        <div className="flex h-2">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`flex-1 transition-all duration-500 ${
                i <= step ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>

        <div className="p-8 md:p-12">
          {renderStep()}

          <div className="mt-12 flex items-center justify-between gap-4">
            {step > 1 && step < totalSteps ? (
              <button
                onClick={prevStep}
                className="px-6 py-3 text-slate-500 hover:text-slate-700 font-bold transition-all flex items-center gap-2"
              >
                <ChevronLeft size={20} /> Voltar
              </button>
            ) : <div></div>}

            <button
              onClick={nextStep}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 ml-auto active:scale-95"
            >
              {step === totalSteps ? 'Começar Agora!' : 'Continuar'}
              {step < totalSteps && <ChevronRight size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
