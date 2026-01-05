import api from './api';

export interface CustomerLoan {
  loanId: string;
  loanAccountNumber: string;
  merchantId: string;
  customerId: string;
  principalAmount: number;
  status: string;
  amountPaid: number;
  amountRemaining: number;
  configuration: {
    frequency: string;
    tenor: { value: number; period: string };
    totalAmount: number;
    interestRate: number;
    penaltyRate: number;
  };
  createdAt: string;
  activatedAt?: string;
}

export const customerLookupService = {
  async getCustomerLoansByEmail(email: string): Promise<CustomerLoan[]> {
    const response = await api.get(`/loans/customer/${email}`);
    return response.data.data || [];
  },
};
