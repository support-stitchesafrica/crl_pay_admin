import api from './api';

export interface Transaction {
  transactionId: string;
  type: string;
  status: 'pending' | 'success' | 'failed';
  idempotencyKey: string;
  merchantId: string;
  reference: string;
  mappingId?: string;
  planId?: string;
  financierId?: string;
  loanId?: string;
  reservationId?: string;
  disbursementId?: string;
  amount: number;
  currency: string;
  provider: string;
  integrationId?: string;
  providerReference?: string;
  metadata?: Record<string, any>;
  createdAt: string | { _seconds: number; _nanoseconds: number };
  updatedAt: string | { _seconds: number; _nanoseconds: number };
}

export const getAllTransactions = async (filters?: {
  type?: string;
  status?: string;
  merchantId?: string;
  loanId?: string;
  limit?: number;
}): Promise<Transaction[]> => {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.merchantId) params.append('merchantId', filters.merchantId);
  if (filters?.loanId) params.append('loanId', filters.loanId);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const response = await api.get(`/transactions?${params.toString()}`);
  return response.data.data || response.data;
};

export const getTransactionById = async (transactionId: string): Promise<Transaction> => {
  const response = await api.get(`/transactions/${transactionId}`);
  return response.data.data || response.data;
};

export const requeryTransaction = async (
  transactionId: string,
  provider?: string
): Promise<{ transaction: Transaction; providerStatus?: any; updated: boolean }> => {
  const response = await api.post(`/transactions/${transactionId}/requery`, { provider });
  return response.data.data || response.data;
};

export const getTransactionsByMerchant = async (
  merchantId: string,
  limit?: number
): Promise<Transaction[]> => {
  const response = await api.get(`/transactions/merchant/${merchantId}${limit ? `?limit=${limit}` : ''}`);
  return response.data.data || response.data;
};

export const getTransactionsByLoan = async (loanId: string): Promise<Transaction[]> => {
  const response = await api.get(`/transactions/loan/${loanId}`);
  return response.data.data || response.data;
};
