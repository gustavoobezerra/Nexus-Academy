import { paymentsAPI } from '../lib/api';
import type { Pagamento } from '../types';

type PaymentsPayload = {
  payments?: Pagamento[];
  data?: { payments?: Pagamento[] };
};

function normalizePayments(payload: unknown): Pagamento[] {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload as Pagamento[];
  }

  const typed = payload as PaymentsPayload;
  if (Array.isArray(typed.payments)) {
    return typed.payments;
  }

  if (typed.data && Array.isArray(typed.data.payments)) {
    return typed.data.payments;
  }

  return [];
}

export default function usePayments() {
  const getAll = async (): Promise<Pagamento[]> => {
    try {
      const response = await paymentsAPI.getAll();
      return normalizePayments(response);
    } catch {
      return [];
    }
  };

  const markPaid = async (id: string): Promise<Pagamento | undefined> => {
    try {
      const response = await paymentsAPI.update(id, { status: 'paid' as const });
      if (response && typeof response === 'object' && 'payment' in response) {
        return (response as { payment?: Pagamento }).payment;
      }
      return response as Pagamento;
    } catch {
      return undefined;
    }
  };

  return { getAll, markPaid };
}
