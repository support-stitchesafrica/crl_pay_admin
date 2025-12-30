// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    financierId: string;
    companyName: string;
    email: string;
    status: string;
  };
}

// Financier Types
export interface Financier {
  financierId: string;
  companyName: string;
  email: string;
  phone: string;
  businessAddress: string;
  businessCategory: string;
  registrationNumber: string;
  taxId: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  availableFunds: number;
  allocatedFunds: number;
  totalDisbursed: number;
  totalRepaid: number;
  settlementAccount?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  businessDocuments?: Record<string, any>;
  createdAt: string | { _seconds: number; _nanoseconds: number };
  updatedAt: string | { _seconds: number; _nanoseconds: number };
  lastLoginAt?: string | { _seconds: number; _nanoseconds: number };
}

// Financing Plan Types
export type TenorPeriod = 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';

export interface Tenor {
  value: number;
  period: TenorPeriod;
}

export interface GracePeriod {
  value: number;
  period: TenorPeriod;
}

export interface FinancingPlan {
  planId: string;
  financierId: string;
  name: string;
  description?: string;
  tenor: Tenor;
  interestRate: number;
  minimumAmount: number;
  maximumAmount: number;
  gracePeriod: GracePeriod;
  lateFee: {
    type: 'fixed' | 'percentage';
    amount: number;
  };
  allowEarlyRepayment: boolean;
  eligibilityCriteria?: {
    minCreditScore?: number;
    minMonthlyIncome?: number;
    maxDebtToIncome?: number;
    minEmploymentMonths?: number;
    allowedEmailDomains?: string[];
    allowedCategories?: string[];
  };
  status: 'pending' | 'approved' | 'inactive';
  isActive: boolean;
  expiresAt?: string | { _seconds: number; _nanoseconds: number };
  totalFundsAllocated: number;
  fundsAllocatedToMerchants?: number;
  totalLoansCreated: number;
  createdAt: string | { _seconds: number; _nanoseconds: number };
  updatedAt: string | { _seconds: number; _nanoseconds: number };
  approvedAt?: string | { _seconds: number; _nanoseconds: number };
  activatedAt?: string | { _seconds: number; _nanoseconds: number };
  deactivatedAt?: string | { _seconds: number; _nanoseconds: number };
}

export interface CreatePlanData {
  name: string;
  description?: string;
  tenor: Tenor;
  interestRate: number;
  minimumAmount: number;
  maximumAmount: number;
  gracePeriod: GracePeriod;
  lateFee: {
    type: 'fixed' | 'percentage';
    amount: number;
  };
  allowEarlyRepayment: boolean;
  eligibilityCriteria?: {
    minCreditScore?: number;
    minMonthlyIncome?: number;
    maxDebtToIncome?: number;
    minEmploymentMonths?: number;
    allowedEmailDomains?: string[];
    allowedCategories?: string[];
  };
}

export interface UpdatePlanData {
  name?: string;
  description?: string;
  tenor?: Tenor;
  interestRate?: number;
  minimumAmount?: number;
  maximumAmount?: number;
  gracePeriod?: GracePeriod;
  lateFee?: {
    type: 'fixed' | 'percentage';
    amount: number;
  };
  allowEarlyRepayment?: boolean;
  eligibilityCriteria?: {
    minCreditScore?: number;
    minMonthlyIncome?: number;
    maxDebtToIncome?: number;
    minEmploymentMonths?: number;
    allowedEmailDomains?: string[];
    allowedCategories?: string[];
  };
}

// Loan Types
export interface Loan {
  loanId: string;
  customerId: string;
  merchantId: string;
  financierId: string;
  planId: string;
  principalAmount: number;
  interestRate: number;
  tenure: number;
  installmentAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountRemaining: number;
  status: 'pending' | 'active' | 'completed' | 'defaulted' | 'cancelled';
  fundingSource: 'internal' | 'financier';
  createdAt: string | { _seconds: number; _nanoseconds: number };
  updatedAt: string | { _seconds: number; _nanoseconds: number };
  disbursedAt?: string | { _seconds: number; _nanoseconds: number };
  completedAt?: string | { _seconds: number; _nanoseconds: number };
}

// Analytics Types
export interface FinancierAnalytics {
  overview: {
    totalLoans: number;
    activeLoans: number;
    completedLoans: number;
    defaultedLoans: number;
    defaultRate: number;
    repaymentRate: number;
  };
  financials: {
    availableFunds: number;
    allocatedFunds: number;
    totalDisbursed: number;
    totalRepaid: number;
    outstandingAmount: number;
    totalRevenue: number;
  };
}
