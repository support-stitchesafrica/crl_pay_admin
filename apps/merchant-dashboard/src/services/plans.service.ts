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

export interface FinancingPlan {
  planId: string;
  financierId: string;
  name: string;
  description?: string;
  tenor: {
    value: number;
    period: string;
  };
  interestRate: number;
  minimumAmount: number;
  maximumAmount: number;
  gracePeriod: {
    value: number;
    period: string;
  };
  lateFee: {
    type: 'fixed' | 'percentage';
    amount: number;
  };
  allowEarlyRepayment: boolean;
  status: 'pending' | 'approved' | 'inactive';
  isActive: boolean;
  totalFundsAllocated: number;
  fundsAllocatedToMerchants?: number;
  totalLoansCreated: number;
}

export const getMappedPlans = async (): Promise<PlanMerchantMapping[]> => {
  const response = await api.get('/plan-merchant-mappings');
  return response.data;
};

export const getPlanDetails = async (planId: string): Promise<FinancingPlan> => {
  const response = await api.get(`/financing-plans/${planId}`);
  return response.data;
};

export const getMultiplePlanDetails = async (planIds: string[]): Promise<FinancingPlan[]> => {
  const responses = await Promise.all(
    planIds.map((id) => api.get(`/financing-plans/${id}`).catch(() => null))
  );
  return responses.filter((r) => r !== null).map((r) => r!.data);
};
