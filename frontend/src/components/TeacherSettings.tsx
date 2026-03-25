import { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Link2, Copy, Check, Save, X,
  CreditCard, Bell, Shield, Key,
  ChevronRight, ExternalLink, Camera, Loader2, Mic, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import apiService from '../services/api.service';
import { formatPhoneBR } from '../utils/security';

interface TeacherData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  subjects?: string[];
  slug?: string;
  paymentMethod?: 'manual' | 'automatic' | 'pending';
  manualPaymentType?: 'pix_in_system' | 'external';
  pixKey?: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  gatewayProvider?: 'mercadopago' | 'asaas' | 'pagseguro' | 'efi';
  settings?: {
    notifications?: {
      email?: boolean;
      whatsapp?: boolean;
      sms?: boolean;
      push?: boolean;
    };
    theme?: 'light' | 'dark' | 'system';
  };
  subscription?: {
    plan?: string;
    status?: string;
  };
}

interface TeacherSettingsProps {
  onClose: () => void;
}

export const TeacherSettings = ({ onClose }: TeacherSettingsProps) => {
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'payment' | 'notifications' | 'security' | 'pronunciation'>('profile');

  const [_teacherData, setTeacherData] = useState<TeacherData | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    subjects: [] as string[],
    slug: ''
  });

  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'pending' as 'manual' | 'automatic' | 'pending',
    manualPaymentType: '' as 'pix_in_system' | 'external' | '',
    pixKey: '',
    pixKeyType: '' as 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    whatsapp: true,
    sms: false,
    push: true
  });

  const [phraseForm, setPhraseForm] = useState({
    phrase: '',
    difficulty: 'intermediate'
  });
  const [phraseList, setPhraseList] = useState<any[]>([]);
  const [phraseLoading, setPhraseLoading] = useState(false);
  const [phraseSaving, setPhraseSaving] = useState(false);
  const [phraseGenerating, setPhraseGenerating] = useState(false);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  useEffect(() => {
    if (activeTab === 'pronunciation') {
      fetchPronunciationPhrases();
    }
  }, [activeTab]);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<any>('/auth/me');
      const data = response.user || response;

      setTeacherData(data);
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        bio: data.bio || '',
        subjects: data.subjects || [],
        slug: data.slug || ''
      });
      setPaymentData({
        paymentMethod: data.paymentMethod || 'pending',
        manualPaymentType: data.manualPaymentType || '',
        pixKey: data.pixKey || '',
        pixKeyType: data.pixKeyType || ''
      });
      if (data.settings?.notifications) {
        setNotificationSettings(data.settings.notifications);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const fetchPronunciationPhrases = async () => {
    try {
      setPhraseLoading(true);
      const response = await apiService.get<any>('/pronunciation/phrases');
      setPhraseList(response.data || []);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar frases de pronúncia');
    } finally {
      setPhraseLoading(false);
    }
  };

  const handleGeneratePhrase = async () => {
    try {
      setPhraseGenerating(true);
      const response = await apiService.post<any>('/pronunciation/phrases/generate', {
        difficulty: phraseForm.difficulty
      });
      const phrase = response?.data?.phrase || response?.phrase;
      if (!phrase) {
        toast.error('Não foi possível gerar frase');
        return;
      }
      setPhraseForm({ ...phraseForm, phrase });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar frase');
    } finally {
      setPhraseGenerating(false);
    }
  };

  const handleSavePhrase = async () => {
    if (!phraseForm.phrase.trim()) {
      toast.error('Digite uma frase para salvar');
      return;
    }

    try {
      setPhraseSaving(true);
      const form = new FormData();
      form.append('phrase', phraseForm.phrase.trim());
      form.append('difficulty', phraseForm.difficulty);
      form.append('active', 'true');
      await apiService.upload('/pronunciation/phrases', form);
      toast.success('Frase salva e ativada');
      setPhraseForm({ phrase: '', difficulty: phraseForm.difficulty });
      fetchPronunciationPhrases();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar frase');
    } finally {
      setPhraseSaving(false);
    }
  };

  const handleActivatePhrase = async (phraseId: string) => {
    try {
      setPhraseSaving(true);
      await apiService.put(`/pronunciation/phrases/${phraseId}`, { active: true });
      toast.success('Frase ativada');
      fetchPronunciationPhrases();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao ativar frase');
    } finally {
      setPhraseSaving(false);
    }
  };

  const handleDeletePhrase = async (phraseId: string) => {
    try {
      setPhraseSaving(true);
      await apiService.delete(`/pronunciation/phrases/${phraseId}`);
      toast.success('Frase removida');
      fetchPronunciationPhrases();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover frase');
    } finally {
      setPhraseSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const response = await apiService.put<any>('/auth/profile', formData);
      const updatedUser = response.user || response;

      // Atualizar store
      const token = localStorage.getItem('token') || '';
      setAuth(updatedUser, token);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success('Perfil atualizado com sucesso!');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayment = async () => {
    try {
      setSaving(true);

      if (paymentData.paymentMethod === 'manual' && paymentData.manualPaymentType === 'pix_in_system') {
        if (!paymentData.pixKey || !paymentData.pixKeyType) {
          toast.error('Preencha a chave PIX e o tipo');
          setSaving(false);
          return;
        }
      }

      await apiService.put('/auth/payment-settings', paymentData);
      toast.success('Configurações de pagamento atualizadas!');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar configurações de pagamento');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      await apiService.put('/auth/notification-settings', { notifications: notificationSettings });
      toast.success('Preferências de notificação atualizadas!');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar preferências');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/professor/${formData.slug}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const publicLink = formData.slug ? `${window.location.origin}/professor/${formData.slug}` : '';

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-slate-900 rounded-2xl p-8 flex items-center gap-4">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-white">Carregando configurações...</span>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'payment', label: 'Pagamentos', icon: CreditCard },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'pronunciation', label: 'Pronúncia', icon: Mic },
    { id: 'security', label: 'Segurança', icon: Shield }
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Configurações da Conta</h2>
            <p className="text-slate-400 text-sm mt-1">Gerencie seu perfil, pagamentos e preferências</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar de Tabs */}
          <div className="w-56 border-r border-slate-700 p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Tab Perfil */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Informações Pessoais</h3>

                  {/* Avatar */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                      {formData.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-2">
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg border border-slate-700">
                        <Camera className="w-4 h-4" />
                        Upload de avatar em preparação
                      </span>
                      <p className="text-sm text-slate-400">
                        Nome, email, telefone e bio já podem ser atualizados nesta aba. O envio de foto será liberado quando a rota de upload estiver disponível.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Nome</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Telefone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: formatPhoneBR(e.target.value) })}
                          className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Slug (Link único)</label>
                      <div className="relative">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                          className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="seu-nome"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Biografia</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      placeholder="Conte um pouco sobre você..."
                    />
                  </div>
                </div>

                {/* Link de Convite */}
                {formData.slug && (
                  <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-xl p-6 border border-indigo-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Link2 className="w-5 h-5 text-indigo-400" />
                      <h4 className="font-semibold text-white">Seu Link de Convite</h4>
                    </div>
                    <p className="text-slate-400 text-sm mb-4">
                      Compartilhe este link com seus alunos para que eles possam se cadastrar diretamente na sua sala.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={publicLink}
                        readOnly
                        className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white text-sm"
                      />
                      <button
                        onClick={copyLink}
                        className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 transition-colors"
                      >
                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        {copied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Salvar Alterações
                  </button>
                </div>
              </div>
            )}

            {/* Tab Pagamentos */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Configurações de Recebimento</h3>
                  <p className="text-slate-400 text-sm mb-6">
                    Configure como você deseja receber os pagamentos dos seus alunos.
                  </p>

                  <div className="space-y-4">
                    {/* Método de Pagamento */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">Método de Recebimento</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPaymentData({ ...paymentData, paymentMethod: 'manual' })}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            paymentData.paymentMethod === 'manual'
                              ? 'border-indigo-500 bg-indigo-900/30'
                              : 'border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="font-medium text-white">PIX Manual</div>
                          <div className="text-sm text-slate-400">Receba diretamente na sua chave PIX</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentData({ ...paymentData, paymentMethod: 'automatic' })}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            paymentData.paymentMethod === 'automatic'
                              ? 'border-indigo-500 bg-indigo-900/30'
                              : 'border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="font-medium text-white">Gateway Automático</div>
                          <div className="text-sm text-slate-400">Mercado Pago, Asaas, etc.</div>
                        </button>
                      </div>
                    </div>

                    {/* Configuração PIX */}
                    {paymentData.paymentMethod === 'manual' && (
                      <div className="bg-slate-800/50 rounded-xl p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Chave PIX</label>
                          <select
                            value={paymentData.pixKeyType}
                            onChange={(e) => setPaymentData({ ...paymentData, pixKeyType: e.target.value as any })}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Selecione...</option>
                            <option value="cpf">CPF</option>
                            <option value="cnpj">CNPJ</option>
                            <option value="email">Email</option>
                            <option value="phone">Telefone</option>
                            <option value="random">Chave Aleatória</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Chave PIX</label>
                          <input
                            type="text"
                            value={paymentData.pixKey}
                            onChange={(e) => setPaymentData({ ...paymentData, pixKey: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                            placeholder="Digite sua chave PIX"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Recebimento</label>
                          <select
                            value={paymentData.manualPaymentType}
                            onChange={(e) => setPaymentData({ ...paymentData, manualPaymentType: e.target.value as any })}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="pix_in_system">PIX pelo Sistema (gerar QR Code)</option>
                            <option value="external">PIX Externo (fora do sistema)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Gateway automático */}
                    {paymentData.paymentMethod === 'automatic' && (
                      <div className="bg-slate-800/50 rounded-xl p-6">
                        <p className="text-slate-400 mb-4">
                          Para configurar um gateway automático, acesse os tutoriais de integração:
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {['mercadopago', 'asaas', 'pagseguro', 'efi'].map((gateway) => (
                            <button
                              key={gateway}
                              onClick={() => window.open(`/tutoriais/${gateway}`, '_blank')}
                              className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm flex items-center justify-between transition-colors"
                            >
                              <span className="capitalize">{gateway === 'efi' ? 'Efi Pay' : gateway.replace('pag', 'Pag')}</span>
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSavePayment}
                    disabled={saving}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Salvar Configurações
                  </button>
                </div>
              </div>
            )}

            {/* Tab Notificações */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Preferências de Notificação</h3>
                  <p className="text-slate-400 text-sm mb-6">
                    Escolha como deseja receber atualizações sobre seus alunos e aulas.
                  </p>

                  <div className="space-y-4">
                    {[
                      { key: 'email', label: 'Email', description: 'Receba notificações por email' },
                      { key: 'whatsapp', label: 'WhatsApp', description: 'Receba mensagens no WhatsApp' },
                      { key: 'push', label: 'Push', description: 'Notificações no navegador' },
                      { key: 'sms', label: 'SMS', description: 'Receba SMS (pode ter custo adicional)' }
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                        <div>
                          <div className="font-medium text-white">{item.label}</div>
                          <div className="text-sm text-slate-400">{item.description}</div>
                        </div>
                        <button
                          onClick={() => setNotificationSettings({
                            ...notificationSettings,
                            [item.key]: !notificationSettings[item.key as keyof typeof notificationSettings]
                          })}
                          className={`w-12 h-6 rounded-full transition-colors relative ${
                            notificationSettings[item.key as keyof typeof notificationSettings]
                              ? 'bg-indigo-600'
                              : 'bg-slate-600'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              notificationSettings[item.key as keyof typeof notificationSettings]
                                ? 'translate-x-7'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotifications}
                    disabled={saving}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Salvar Preferências
                  </button>
                </div>
              </div>
            )}

            
            {/* Tab Pronúncia */}
            {activeTab === 'pronunciation' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Teste de Pronúncia</h3>
                  <p className="text-slate-400 text-sm">
                    Defina frases por nível para os alunos treinarem. A frase ativa é usada no portal do aluno.
                  </p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Frase</label>
                    <textarea
                      value={phraseForm.phrase}
                      onChange={(e) => setPhraseForm({ ...phraseForm, phrase: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Ex: Practice makes perfect."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Nível</label>
                      <select
                        value={phraseForm.difficulty}
                        onChange={(e) => setPhraseForm({ ...phraseForm, difficulty: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="beginner">Iniciante</option>
                        <option value="elementary">Básico</option>
                        <option value="intermediate">Intermediário</option>
                        <option value="upper-intermediate">Intermediário+</option>
                        <option value="advanced">Avançado</option>
                        <option value="proficient">Proficiente</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleGeneratePhrase}
                      disabled={phraseGenerating}
                      className="mt-6 md:mt-0 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {phraseGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Gerar com IA
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePhrase}
                      disabled={phraseSaving}
                      className="mt-6 md:mt-0 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {phraseSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar e ativar
                    </button>
                  </div>

                  <p className="text-xs text-slate-400">
                    Você pode gerar com IA e ajustar manualmente antes de salvar.
                  </p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-semibold">Frases recentes</h4>
                    <button
                      type="button"
                      onClick={fetchPronunciationPhrases}
                      className="text-sm text-indigo-400 hover:text-indigo-300"
                    >
                      Atualizar
                    </button>
                  </div>

                  {phraseLoading ? (
                    <div className="text-slate-400">Carregando frases...</div>
                  ) : phraseList.length === 0 ? (
                    <div className="text-slate-400">Nenhuma frase cadastrada ainda.</div>
                  ) : (
                    <div className="space-y-2">
                      {phraseList.map((phrase: any) => (
                        <div key={phrase._id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-white font-medium">{phrase.phrase}</p>
                            <p className="text-xs text-slate-400">
                              {phrase.difficulty} - {phrase.source === 'teacher' ? 'Professor' : 'IA'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {phrase.active ? (
                              <span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-300 rounded-full">Ativa</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleActivatePhrase(phrase._id)}
                                className="px-2 py-1 text-xs bg-indigo-600/20 text-indigo-300 rounded-full hover:bg-indigo-600/30"
                              >
                                Ativar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeletePhrase(phrase._id)}
                              className="px-2 py-1 text-xs bg-red-600/20 text-red-300 rounded-full hover:bg-red-600/30"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
{/* Tab Segurança */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Segurança da Conta</h3>
                  <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <p className="font-medium text-amber-200">Fluxos sensíveis ainda não foram publicados nesta rodada.</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Para evitar promessas vazias, senha, 2FA e exclusão aparecem apenas como status operacional até que existam endpoints auditados para essas ações.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-800/50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Key className="w-5 h-5 text-slate-400" />
                          <div>
                            <div className="font-medium text-white">Alterar Senha</div>
                            <div className="text-sm text-slate-400">Atualize sua senha de acesso assim que a API segura de redefinição estiver disponível.</div>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full border border-slate-600 bg-slate-900/60 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                          Em preparação
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-800/50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Shield className="w-5 h-5 text-slate-400" />
                          <div>
                            <div className="font-medium text-white">Autenticação em Duas Etapas</div>
                            <div className="text-sm text-slate-400">Será ativada quando o fluxo completo de verificação estiver integrado ao login do professor.</div>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full border border-slate-600 bg-slate-900/60 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                          Planejado
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-red-400">Excluir Conta</div>
                          <div className="text-sm text-slate-400">A exclusão definitiva será exposta apenas com confirmação reforçada e trilha de auditoria.</div>
                        </div>
                        <span className="px-3 py-1 rounded-full border border-red-500/40 bg-red-950/50 text-xs font-semibold uppercase tracking-[0.16em] text-red-300">
                          Bloqueado por segurança
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherSettings;




