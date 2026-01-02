import api from './api';

export interface PlanMerchantMapping {
  mappingId: string;
  planId: string;
  merchantId: string;
  financierId: string;
  fundsAllocated: number;
  expirationDate: string | { _seconds: number; _nanoseconds: number };
  currentAllocation: number;
  status: 'active' | 'inactive' | 'suspended';
  totalLoans: number;
  totalDisbursed: number;
  totalRepaid: number;
  defaultRate: number;
  mappedBy: string;
  mappedAt: string | { _seconds: number; _nanoseconds: number };
  lastTransactionAt?: string | { _seconds: number; _nanoseconds: number };
  createdAt: string | { _seconds: number; _nanoseconds: number };
  updatedAt: string | { _seconds: number; _nanoseconds: number };
}

export const getMappings = async (financierId?: string): Promise<PlanMerchantMapping[]> => {
  const params = financierId ? { financierId } : {};
  const response = await api.get('/plan-merchant-mappings', { params });
  return response.data.data || response.data;
};
