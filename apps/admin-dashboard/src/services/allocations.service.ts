import api from './api';

export interface AllocationTerms {
  interestRate: number;
  tenure: number;
  tenurePeriod: string;
  penalty: {
    type: string;
    amount: number;
    gracePeriodDays: number;
  };
  minLoanAmount?: number;
  maxLoanAmount?: number;
}

export interface MerchantAllocation {
  allocationId: string;
  merchantId: string;
  allocatedAmount: number;
  availableAmount: number;
  usedAmount: number;
  reservedAmount: number;
  totalDisbursed: number;
  totalRepaid: number;
  activeLoans: number;
  completedLoans: number;
  terms: AllocationTerms;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAllocationRequest {
  merchantId: string;
  allocatedAmount: number;
  terms: AllocationTerms;
  expiresAt: string;
  notes?: string;
}

export const allocationsService = {
  async getAllocations(): Promise<MerchantAllocation[]> {
    const response = await api.get('/allocations');
    return response.data;
  },

  async getAllocation(allocationId: string): Promise<MerchantAllocation> {
    const response = await api.get(`/allocations/${allocationId}`);
    return response.data;
  },

  async getMerchantAllocation(merchantId: string): Promise<MerchantAllocation> {
    const response = await api.get(`/allocations/merchant/${merchantId}`);
    return response.data;
  },

  async createAllocation(data: CreateAllocationRequest): Promise<MerchantAllocation> {
    const response = await api.post('/allocations', data);
    return response.data;
  },

  async suspendAllocation(allocationId: string, reason: string): Promise<MerchantAllocation> {
    const response = await api.post(`/allocations/${allocationId}/suspend`, { reason });
    return response.data;
  },

  async checkEligibility(allocationId: string, amount: number): Promise<any> {
    const response = await api.post(`/allocations/${allocationId}/check-eligibility`, { amount });
    return response.data;
  },
};
