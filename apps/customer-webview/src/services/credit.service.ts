const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006/api/v1';

export interface CreditAssessmentResult {
  customerId: string;
  merchantId: string;
  decision: 'instant_approval' | 'conditional_approval' | 'manual_review' | 'rejected';
  totalScore: number;
  approvedAmount: number;
  reason?: string;
}

export const creditService = {
  async assessCredit(params: {
    customerId: string;
    merchantId: string;
    requestedAmount: number;
    apiKey: string;
  }): Promise<CreditAssessmentResult> {
    const response = await fetch(`${API_URL}/credit/assess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': params.apiKey,
      },
      body: JSON.stringify({
        customerId: params.customerId,
        merchantId: params.merchantId,
        requestedAmount: params.requestedAmount,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Credit assessment failed');
    }

    const result = await response.json();
    return result.data;
  },
};
