export type RepaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'overdue';

export type RepaymentMethod = 'auto_debit' | 'manual' | 'bank_transfer';

export interface RepaymentScheduleItem {
  scheduleId: string;
  loanId: string;
  merchantId: string;
  customerId: string;
  financierId: string;

  installmentNumber: number;
  dueDate: Date;
  amount: number;
  principalAmount: number;
  interestAmount: number;

  status: RepaymentStatus;
  paidAmount: number;
  paidAt?: Date;

  lateFee: number;
  totalDue: number;

  repaymentId?: string;
  providerReference?: string;

  retryCount: number;
  lastRetryAt?: Date;
  nextRetryAt?: Date;

  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

export interface Repayment {
  repaymentId: string;
  loanId: string;
  scheduleId: string;
  merchantId: string;
  customerId: string;
  financierId: string;

  amount: number;
  method: RepaymentMethod;
  status: RepaymentStatus;

  provider: string;
  integrationId?: string;
  providerReference?: string;
  authorizationCode?: string;

  failureReason?: string;
  feePaidByCustomer?: number;

  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}
