import api from './api';

export interface LiquidationCalculation {
  loanId: string;
  totalDue: number;
  breakdown: {
    unpaidPrincipal: number;
    accruedInterest: number;
    lateFees: number;
    schedulesIncluded: Array<{
      scheduleId: string;
      installmentNumber: number;
      dueDate: string;
      status: string;
      principalAmount: number;
      interestAmount: number;
      proratedInterest?: number;
      lateFee: number;
    }>;
  };
  isFullLiquidation: boolean;
  remainingBalance?: number;
}

export interface LiquidationResult {
  success: boolean;
  liquidationId: string;
  calculation: LiquidationCalculation;
}

export const liquidationService = {
  async calculateLiquidation(loanId: string, amount?: number): Promise<LiquidationCalculation> {
    const response = await api.post('/loans/liquidation/calculate', {
      loanId,
      amount,
    });
    return response.data.data;
  },

  async processLiquidation(data: {
    loanId: string;
    amount?: number;
    reference: string;
    method?: string;
  }): Promise<LiquidationResult> {
    const response = await api.post('/loans/liquidation/process', data);
    return response.data.data;
  },
};
