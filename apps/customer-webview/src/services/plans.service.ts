const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006/api/v1';

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
  status: string;
  isActive: boolean;
}

export interface PlanMerchantMapping {
  mappingId: string;
  planId: string;
  merchantId: string;
  financierId: string;
  fundsAllocated: number;
  currentAllocation: number;
  status: string;
}

export const plansService = {
  async getMerchantMappings(merchantId: string, apiKey: string): Promise<PlanMerchantMapping[]> {
    const response = await fetch(
      `${API_URL}/plan-merchant-mappings?merchantId=${merchantId}`,
      {
        headers: {
          'X-API-Key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch plan mappings');
    }

    const result = await response.json();
    return result.data || [];
  },

  async getPlanById(planId: string, apiKey: string): Promise<FinancingPlan> {
    const response = await fetch(`${API_URL}/financing-plans/${planId}`, {
      headers: {
        'X-API-Key': apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch plan');
    }

    const result = await response.json();
    return result.data;
  },
};
