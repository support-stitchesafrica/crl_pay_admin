import api from './api';

export interface Financier {
  financierId: string;
  companyName: string;
  email: string;
  phone: string;
  businessAddress: string;
  businessCategory: string;
  registrationNumber: string;
  taxId: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  availableFunds: number;
  allocatedFunds: number;
  totalDisbursed: number;
  totalRepaid: number;
  createdAt: string | { _seconds: number; _nanoseconds: number };
  updatedAt: string | { _seconds: number; _nanoseconds: number };
}

export const getFinanciers = async (status?: string): Promise<Financier[]> => {
  const params = status ? { status } : {};
  const response = await api.get('/financiers/all', { params });
  return response.data;
};
