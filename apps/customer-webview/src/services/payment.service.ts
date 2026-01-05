const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006/api/v1';

export interface PaymentInitializationResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaymentVerificationResult {
  status: string;
  reference: string;
  amount: number;
  authorization?: {
    authorization_code: string;
    card_type: string;
    last4: string;
    bank: string;
  };
}

export const paymentService = {
  async initializeAuthorization(params: {
    email: string;
    amount: number;
    apiKey: string;
  }): Promise<PaymentInitializationResult> {
    const response = await fetch(`${API_URL}/payments/initialize-authorization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': params.apiKey,
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amount,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to initialize payment');
    }

    const result = await response.json();
    return result.data;
  },

  async verifyPayment(reference: string, apiKey: string): Promise<PaymentVerificationResult> {
    const response = await fetch(`${API_URL}/payments/verify/${reference}`, {
      headers: {
        'X-API-Key': apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to verify payment');
    }

    const result = await response.json();
    return result.data;
  },
};
