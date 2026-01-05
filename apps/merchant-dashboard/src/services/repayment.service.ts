import api from './api';

export interface RepaymentScheduleItem {
  scheduleId: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'overdue';
  paidAmount: number;
  paidAt?: string;
  lateFee: number;
  totalDue: number;
  repaymentId?: string;
  providerReference?: string;
}

export interface Repayment {
  repaymentId: string;
  loanId: string;
  scheduleId: string;
  amount: number;
  method: string;
  status: string;
  provider: string;
  providerReference?: string;
  createdAt: string;
}

export const repaymentService = {
  async getRepaymentSchedule(loanId: string): Promise<RepaymentScheduleItem[]> {
    const response = await api.get(`/repayments/schedule/${loanId}`);
    return response.data.data || [];
  },

  async getRepayments(loanId: string): Promise<Repayment[]> {
    const response = await api.get(`/repayments/loan/${loanId}`);
    return response.data.data || [];
  },

  async recordManualRepayment(data: {
    loanId: string;
    scheduleId: string;
    amount: number;
    reference: string;
    method?: string;
  }): Promise<Repayment> {
    const response = await api.post('/repayments/manual', data);
    return response.data.data;
  },
};
