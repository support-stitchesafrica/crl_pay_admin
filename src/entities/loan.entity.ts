export type LoanStatus =
  | 'pending'      // Awaiting card authorization
  | 'active'       // Currently being repaid
  | 'completed'    // Fully paid off
  | 'defaulted'    // Missed payments, in collections
  | 'cancelled';   // Cancelled before activation

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
  value: number;       // e.g., 6, 12, 90
  period: TenorPeriod; // e.g., MONTHS, WEEKS, DAYS
}

export interface PaymentScheduleItem {
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  status: 'pending' | 'paid' | 'overdue' | 'failed';
  paidAt?: Date;
  paidAmount?: number;
  paymentId?: string;
  attemptCount?: number;
  lastAttemptAt?: Date;
}

export interface LoanConfiguration {
  frequency: RepaymentFrequency;
  tenor: Tenor;
  numberOfInstallments: number;  // Calculated based on tenor and frequency
  interestRate: number;           // Annual percentage rate (e.g., 15 for 15%)
  penaltyRate: number;            // Late payment penalty percentage
  installmentAmount: number;
  totalInterest: number;
  totalAmount: number;            // Principal + Interest
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
  merchantId: string;
  customerId: string;

  // Loan Details
  principalAmount: number;
  configuration: LoanConfiguration;
  paymentSchedule: PaymentScheduleItem[];

  // Status
  status: LoanStatus;
  currentInstallment: number; // Which installment are we on
  amountPaid: number;
  amountRemaining: number;

  // Card Authorization
  cardAuthorization?: CardAuthorization;

  // Metadata
  orderId?: string; // Merchant's order reference
  productDescription?: string;
  metadata?: Record<string, any>;

  // Timestamps
  createdAt: Date;
  activatedAt?: Date; // When card was authorized
  firstPaymentDate?: Date;
  lastPaymentDate?: Date;
  completedAt?: Date;
  defaultedAt?: Date;

  // Default Management
  daysOverdue?: number;
  overdueAmount?: number;
  lateFees?: number;
  escalationLevel?: 'low' | 'medium' | 'high' | 'critical' | 'terminal';

  // Notes
  notes?: string;

  updatedAt: Date;
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

// Merchant Loan Configuration (stored per merchant)
export interface MerchantLoanConfiguration {
  configId: string;
  merchantId: string;
  name: string; // e.g., "Standard Plan", "Flexible Plan", "Quick Cash"
  description?: string;

  // Rate Configuration
  interestRate: number; // Annual interest rate percentage (e.g., 15 for 15%)
  penaltyRate: number;  // Late payment penalty percentage (e.g., 5 for 5%)

  // Loan Limits
  minLoanAmount: number;
  maxLoanAmount: number;

  // Allowed Frequencies
  allowedFrequencies: RepaymentFrequency[];

  // Allowed Tenors
  allowedTenors: {
    minValue: number;
    maxValue: number;
    period: TenorPeriod;
  }[];

  // Status
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
