export type LoanStatus = 'pending' | 'active' | 'completed' | 'defaulted' | 'cancelled' | 'expired';

export type RepaymentFrequency =
  | 'daily'
  | 'weekly'
  | 'bi-weekly'
  | 'monthly'
  | 'quarterly'
  | 'bi-annually'
  | 'annually';

export type TenorPeriod = 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';

export interface Tenor {
  value: number;
  period: TenorPeriod;
}

export interface PaymentScheduleItem {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  status: 'pending' | 'paid' | 'overdue' | 'failed';
  paidAt?: string;
  paidAmount?: number;
  paymentId?: string;
  attemptCount?: number;
  lastAttemptAt?: string;
  // Accrual tracking fields
  accruedInterest?: number;
  remainingPrincipal?: number;
  originalPrincipal?: number;
  lastAccrualDate?: string;
  lateFee?: number;
}

export interface LateFee {
  type: 'fixed' | 'percentage';
  amount: number;
}

export interface LoanConfiguration {
  frequency: RepaymentFrequency;
  tenor: Tenor;
  numberOfInstallments: number;
  interestRate: number;
  penaltyRate: number; // DEPRECATED: Use lateFee instead
  lateFee?: LateFee; // Late payment penalty (can be fixed amount or percentage)
  installmentAmount: number;
  totalInterest: number;
  totalAmount: number;
}

export interface CardAuthorization {
  authorizationCode: string;
  cardType: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  bank: string;
  paystackCustomerCode?: string;
}

export interface Loan {
  loanId: string;
  loanAccountNumber?: string;
  merchantId: string;
  customerId: string;
  principalAmount: number;
  configuration: LoanConfiguration;
  paymentSchedule: PaymentScheduleItem[];
  status: LoanStatus;
  currentInstallment: number;
  amountPaid: number;
  amountRemaining: number;
  cardAuthorization?: CardAuthorization;
  orderId?: string;
  productDescription?: string;
  metadata?: Record<string, any>;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  bookingDate?: Date;
  activatedAt?: Date;
  firstPaymentDate?: Date;
  lastPaymentDate?: Date;
  completedAt?: Date;
  defaultedAt?: Date;
  daysOverdue?: number;
  overdueAmount?: number;
  lateFees?: number;
  escalationLevel?: 'low' | 'medium' | 'high' | 'critical' | 'terminal';
  notes?: string;
}

export interface LoanStats {
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  defaultedLoans: number;
  totalDisbursed: number;
  totalCollected: number;
  totalOutstanding: number;
}
