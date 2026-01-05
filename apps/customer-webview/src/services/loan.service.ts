const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006/api/v1';

export interface Loan {
  loanId: string;
  loanAccountNumber: string;
  merchantId: string;
  customerId: string;
  status: string;
  principalAmount: number;
  configuration: any;
}

export interface CreateLoanDto {
  customerId: string;
  merchantId: string;
  amount: number;
  reference: string;
  planId: string;
  mappingId: string;
  frequency: string;
  tenor: { value: number; period: string };
}

export const loanService = {
  async create(data: CreateLoanDto, apiKey: string): Promise<Loan> {
    const response = await fetch(`${API_URL}/loans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create loan');
    }

    const result = await response.json();
    return result.data;
  },

  async authorizeCard(params: {
    loanId: string;
    authorizationCode: string;
    cardType: string;
    cardLast4: string;
    cardBank: string;
    apiKey: string;
  }): Promise<void> {
    const response = await fetch(`${API_URL}/loans/${params.loanId}/authorize-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': params.apiKey,
      },
      body: JSON.stringify({
        authorizationCode: params.authorizationCode,
        cardType: params.cardType,
        cardLast4: params.cardLast4,
        cardBank: params.cardBank,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to authorize card');
    }
  },
};
