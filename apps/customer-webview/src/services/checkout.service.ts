const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006/api/v1';

export interface EligibilityResult {
  eligible: boolean;
  eligibleMappings?: Array<{
    mappingId: string;
    planId: string;
    financierId: string;
    remainingAllocation: number;
    expirationDate: string;
  }>;
  reason?: string;
}

export interface ReservationResult {
  reservationId: string;
  expiresAt: string;
  planId: string;
  mappingId: string;
  amount: number;
  reserved: boolean;
}

export interface DisbursementResult {
  loanId: string;
  loanAccountNumber: string;
  status: string;
  disbursementReference: string;
}

export const checkoutService = {
  /**
   * Step 1: Check eligibility and get available plans
   */
  async checkEligibility(params: {
    merchantId: string;
    amount: number;
    apiKey: string;
    customerId?: string;
  }): Promise<EligibilityResult> {
    const queryParams = new URLSearchParams({
      amount: params.amount.toString(),
    });

    if (params.customerId) {
      queryParams.append('customerId', params.customerId);
    }

    const response = await fetch(
      `${API_URL}/checkout/eligibility?${queryParams}`,
      {
        headers: {
          'X-API-Key': params.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Eligibility check failed');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Step 2: Reserve allocation (race-safe, idempotent)
   */
  async reserveAllocation(params: {
    reference: string;
    amount: number;
    customerId: string;
    apiKey: string;
  }): Promise<ReservationResult> {
    const response = await fetch(`${API_URL}/checkout/reserve`, {
      method: 'POST',
      headers: {
        'X-API-Key': params.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference: params.reference,
        amount: params.amount,
        customerId: params.customerId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Reservation failed');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Step 3: Initiate disbursement after card authorization
   */
  async initiateDisbursement(params: {
    reference: string;
    reservationId: string;
    customerId: string;
    apiKey: string;
  }): Promise<DisbursementResult> {
    const response = await fetch(`${API_URL}/disbursements/initiate`, {
      method: 'POST',
      headers: {
        'X-API-Key': params.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference: params.reference,
        reservationId: params.reservationId,
        customerId: params.customerId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Disbursement failed');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Generate idempotency key for reservation
   */
  generateIdempotencyKey(merchantId: string, customerEmail: string, amount: number): string {
    const timestamp = Date.now();
    const data = `${merchantId}-${customerEmail}-${amount}-${timestamp}`;
    return btoa(data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  },
};
