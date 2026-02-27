import React, { useState } from 'react';
import { FileText, Send, CheckCircle, Clock, XCircle, Edit, Eye, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Contract, Aluno } from '../types';

interface ContractManagerProps {
  students?: Aluno[];
}

export const ContractManager: React.FC<ContractManagerProps> = ({ students = [] }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [formData, setFormData] = useState({
    parentCPF: '',
    parentRG: '',
    serviceDescription: 'Aulas particulares',
    monthlyFee: 0,
    hoursPerMonth: 4,
    paymentDay: 5,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    additionalTerms: ''
  });
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);

  const handleGenerate = () => {
    if (!selectedStudent) {
      toast.error('Selecione um aluno');
      return;
    }

    const student = students.find(s => s._id === selectedStudent);
    if (!student) return;

    const newContract: Contract = {
      _id: `contract_${Date.now()}`,
      student: selectedStudent,
      teacher: 'teacher_demo',
      templateId: 'default',
      status: 'draft',
      contractData: {
        studentName: student.name,
        studentAge: student.age,
        studentGrade: student.grade,
        parentName: student.parentName,
        parentEmail: student.parentEmail,
        parentPhone: student.parentPhone,
        parentCPF: formData.parentCPF,
        parentRG: formData.parentRG,
        teacherName: 'Professor(a) Responsável',
        serviceDescription: formData.serviceDescription,
        monthlyFee: formData.monthlyFee || student.monthlyFee,
        hoursPerMonth: formData.hoursPerMonth,
        paymentDay: formData.paymentDay,
        startDate: formData.startDate,
        endDate: formData.endDate,
        additionalTerms: formData.additionalTerms
      },
      generatedContent: generateContractContent(student, formData),
      signatures: {
        parent: { signed: false },
        teacher: { signed: false }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setContracts([newContract, ...contracts]);
    toast.success(`Contrato gerado para ${student.name}!`);
    setSelectedStudent('');
    setFormData({
      parentCPF: '',
      parentRG: '',
      serviceDescription: 'Aulas particulares',
      monthlyFee: 0,
      hoursPerMonth: 4,
      paymentDay: 5,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      additionalTerms: ''
    });
  };

  const generateContractContent = (student: Aluno, form: typeof formData) => {
    return `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS

CONTRATANTE: ${student.parentName}, CPF: ${form.parentCPF || '___________'}, RG: ${form.parentRG || '___________'},
responsável legal pelo(a) aluno(a) ${student.name},
E-mail: ${student.parentEmail}, Telefone: ${student.parentPhone}

CONTRATADO: Professor(a) Responsável

DO OBJETO:
O presente contrato tem por objeto a prestação de ${form.serviceDescription || 'serviços educacionais'}
para o(a) aluno(a) ${student.name}, cursando ${student.grade}.

DAS CONDIÇÕES:
1. O PROFESSOR ministrará aproximadamente ${form.hoursPerMonth} horas de aula por mês.
2. As aulas serão realizadas em datas e horários acordados entre as partes.
3. As aulas poderão ser realizadas de forma presencial ou online, conforme acordado.

DO VALOR E FORMA DE PAGAMENTO:
1. O CONTRATANTE pagará ao PROFESSOR o valor mensal de R$ ${(form.monthlyFee || student.monthlyFee).toFixed(2)}.
2. O pagamento deverá ser efetuado até o dia ${form.paymentDay} de cada mês.
3. Formas de pagamento: PIX, transferência bancária, cartão ou outras formas combinadas.

DA VIGÊNCIA:
1. Este contrato terá início em ${new Date(form.startDate).toLocaleDateString('pt-BR')} ${
      form.endDate ? `e término em ${new Date(form.endDate).toLocaleDateString('pt-BR')}` : 'com prazo indeterminado'
    }.
2. Qualquer das partes poderá rescindir o contrato com aviso prévio de 30 dias.

DAS RESPONSABILIDADES:
1. O PROFESSOR se compromete a preparar e ministrar as aulas com qualidade e profissionalismo.
2. O CONTRATANTE se compromete a garantir a presença e pontualidade do aluno nas aulas agendadas.
3. Faltas do aluno não justificadas com antecedência mínima de 24h não geram direito a reembolso ou reposição.
4. O PROFESSOR poderá remarcar aulas mediante comunicação prévia com antecedência mínima de 24h.

TERMOS ADICIONAIS:
${form.additionalTerms || 'Não há termos adicionais específicos para este contrato.'}

DISPOSIÇÕES GERAIS:
1. Este contrato poderá ser assinado de forma eletrônica, com validade legal.
2. Eventuais alterações deverão ser acordadas por escrito entre as partes.
3. Fica eleito o foro da comarca da residência do CONTRATANTE para dirimir quaisquer questões decorrentes deste contrato.

Por estarem de acordo com todos os termos e condições aqui estabelecidos, as partes assinam eletronicamente o presente contrato.

Data: ${new Date().toLocaleDateString('pt-BR')}

_____________________________          _____________________________
CONTRATANTE                            CONTRATADO
${student.parentName}                   Professor(a) Responsável
    `.trim();
  };

  const sendContract = (contract: Contract) => {
    const updatedContract = {
      ...contract,
      status: 'sent' as const,
      sentAt: new Date().toISOString(),
      signatureLink: `https://nexus.academy/sign/${contract._id}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    setContracts(contracts.map(c => c._id === contract._id ? updatedContract : c));
    toast.success(`Contrato enviado para ${contract.contractData.parentEmail}! Link de assinatura gerado.`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'bg-green-900/30 border-green-700 text-green-400';
      case 'sent':
        return 'bg-blue-900/30 border-blue-700 text-blue-400';
      case 'draft':
        return 'bg-yellow-900/30 border-yellow-700 text-yellow-400';
      case 'cancelled':
      case 'expired':
        return 'bg-red-900/30 border-red-700 text-red-400';
      default:
        return 'bg-gray-900/30 border-gray-700 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <CheckCircle size={20} />;
      case 'sent':
        return <Clock size={20} />;
      case 'draft':
        return <Edit size={20} />;
      default:
        return <XCircle size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 text-white p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-teal-400 mb-2 flex items-center gap-3">
          <FileText size={36} />
          Gerenciador de Contratos
        </h1>
        <p className="text-gray-400">Gere contratos personalizados com template automático + assinatura eletrônica</p>
      </div>

      {/* Formulário */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
        <h3 className="text-xl font-bold mb-4">Gerar Novo Contrato</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Aluno</label>
              <select
                value={selectedStudent}
                onChange={(e) => {
                  const studentId = e.target.value;
                  setSelectedStudent(studentId);
                  const student = students.find(s => s._id === studentId);
                  if (student) {
                    setFormData(prev => ({
                      ...prev,
                      monthlyFee: student.monthlyFee
                    }));
                  }
                }}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Selecione um aluno...</option>
                {students.map(student => (
                  <option key={student._id} value={student._id}>
                    {student.name} - {student.parentName} ({student.grade})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Descrição do Serviço</label>
              <input
                type="text"
                value={formData.serviceDescription}
                onChange={(e) => setFormData({ ...formData, serviceDescription: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">CPF Responsável</label>
              <input
                type="text"
                value={formData.parentCPF}
                onChange={(e) => setFormData({ ...formData, parentCPF: e.target.value })}
                placeholder="000.000.000-00"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">RG Responsável</label>
              <input
                type="text"
                value={formData.parentRG}
                onChange={(e) => setFormData({ ...formData, parentRG: e.target.value })}
                placeholder="00.000.000-0"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Valor Mensal (R$)</label>
              <input
                type="number"
                value={formData.monthlyFee || ''}
                onChange={(e) => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                min="0"
                step="10"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Horas/Mês</label>
              <select
                value={formData.hoursPerMonth}
                onChange={(e) => setFormData({ ...formData, hoursPerMonth: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
              >
                <option value={4}>4 horas</option>
                <option value={8}>8 horas</option>
                <option value={12}>12 horas</option>
                <option value={16}>16 horas</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Dia do Pagamento</label>
              <input
                type="number"
                value={formData.paymentDay}
                onChange={(e) => setFormData({ ...formData, paymentDay: Number(e.target.value) })}
                min="1"
                max="31"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Data de Início</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Data de Término (opcional)</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Termos Adicionais (opcional)</label>
            <textarea
              value={formData.additionalTerms}
              onChange={(e) => setFormData({ ...formData, additionalTerms: e.target.value })}
              rows={3}
              placeholder="Ex: Aulas de reposição mediante disponibilidade..."
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!selectedStudent}
            className="w-full px-6 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={24} />
            Gerar Contrato Personalizado
          </button>
        </div>

        <div className="mt-6 bg-teal-900/20 border border-teal-700 rounded-lg p-4">
          <p className="font-semibold text-teal-300 mb-2">📋 Como Funciona:</p>
          <ul className="space-y-1 text-sm text-gray-300">
            <li>✓ Template pré-definido com cláusulas padrão</li>
            <li>✓ Dados do aluno e responsável preenchidos automaticamente</li>
            <li>✓ Você pode adicionar termos personalizados</li>
            <li>✓ Envio automático por email com link de assinatura eletrônica</li>
            <li>✓ Rastreamento de status em tempo real</li>
          </ul>
        </div>
      </div>

      {/* Lista de Contratos */}
      <div>
        <h3 className="text-2xl font-bold mb-4">Contratos ({contracts.length})</h3>

        {contracts.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
            <FileText size={64} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">Nenhum contrato gerado ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map(contract => (
              <div key={contract._id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-teal-500 transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold">{contract.contractData.studentName}</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Responsável: {contract.contractData.parentName} • {contract.contractData.parentEmail}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                      <span>💰 R$ {contract.contractData.monthlyFee.toFixed(2)}/mês</span>
                      <span>•</span>
                      <span>⏱️ {contract.contractData.hoursPerMonth}h/mês</span>
                      <span>•</span>
                      <span>Início: {new Date(contract.contractData.startDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${getStatusColor(contract.status)}`}>
                      {getStatusIcon(contract.status)}
                      <span className="font-semibold">
                        {contract.status === 'draft' && 'Rascunho'}
                        {contract.status === 'sent' && 'Enviado'}
                        {contract.status === 'signed' && 'Assinado'}
                        {contract.status === 'cancelled' && 'Cancelado'}
                        {contract.status === 'expired' && 'Expirado'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setViewingContract(contract)}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <Eye size={18} />
                    Visualizar
                  </button>

                  {contract.status === 'draft' && (
                    <button
                      onClick={() => sendContract(contract)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                    >
                      <Send size={18} />
                      Enviar para Assinatura
                    </button>
                  )}

                  {contract.status === 'sent' && (
                    <button
                      onClick={() => toast.success('Link copiado: ' + contract.signatureLink)}
                      className="flex-1 px-4 py-2 bg-blue-900/50 hover:bg-blue-800 border border-blue-700 rounded-lg font-medium transition"
                    >
                      🔗 Copiar Link
                    </button>
                  )}

                  {contract.status === 'signed' && (
                    <button
                      onClick={() => toast.success('Download iniciado (funcionalidade futura)')}
                      className="flex-1 px-4 py-2 bg-green-900/50 hover:bg-green-800 border border-green-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                    >
                      <Download size={18} />
                      Baixar PDF
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Visualização */}
      {viewingContract && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Pré-visualização do Contrato</h3>
              <button
                onClick={() => setViewingContract(null)}
                className="p-2 hover:bg-slate-700 rounded-lg transition"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="bg-white text-black p-8 rounded-lg font-mono text-sm leading-relaxed whitespace-pre-line">
              {viewingContract.generatedContent}
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => setViewingContract(null)}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractManager;
