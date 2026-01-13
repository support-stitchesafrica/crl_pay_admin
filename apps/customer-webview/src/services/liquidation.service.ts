const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006/api/v1';

export interface LiquidationBreakdown {
  unpaidPrincipal: number;
  accruedInterest: number;
  lateFees: number;
  schedulesIncluded: {
    scheduleId: string;
    installmentNumber: number;
    dueDate: Date;
    status: string;
    principalAmount: number;
    interestAmount: number;
    proratedInterest?: number;
    lateFee: number;
  }[];
}

export interface LiquidationCalculation {
  loanId: string;
  totalDue: number;
  breakdown: LiquidationBreakdown;
  isFullLiquidation: boolean;
  remainingBalance?: number;
}

export interface LiquidationResult {
  success: boolean;
  liquidationId: string;
  calculation: LiquidationCalculation;
}

class LiquidationService {
  async calculateLiquidation(
    loanId: string,
    amount?: number,
    apiKey?: string,
  ): Promise<LiquidationCalculation> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(`${API_URL}/loans/liquidation/calculate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ loanId, amount }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to calculate liquidation');
    }

    const result = await response.json();
    return result.data;
  }

  async processLiquidation(
    loanId: string,
    reference: string,
    amount?: number,
    method: string = 'manual',
    apiKey?: string,
  ): Promise<LiquidationResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(`${API_URL}/loans/liquidation/process`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ loanId, amount, reference, method }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to process liquidation');
    }

    const result = await response.json();
    return result.data;
  }
}

export const liquidationService = new LiquidationService();
