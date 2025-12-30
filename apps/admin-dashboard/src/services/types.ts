// Merchant Types
export interface Merchant {
  merchantId: string;
  businessName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  businessAddress?: string;
  businessCategory?: string;
  cacNumber?: string;
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  apiKey?: string;
  webhookUrl?: string;
  totalTransactions?: number;
  totalRevenue?: number;
  activeCustomers?: number;
  defaultRate?: number;
  createdAt: string | { _seconds: number; _nanoseconds: number };
  updatedAt: string | { _seconds: number; _nanoseconds: number };
  rejectionReason?: string;
}

export interface MerchantStats {
  total: number;
  pending: number;
  active: number;
  suspended: number;
  rejected: number;
}

// Customer Types
export interface Customer {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bvn: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  creditScore?: number;
  creditTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  defaultedLoans: number;
  totalBorrowed: number;
  totalRepaid: number;
  onTimePaymentRate: number;
  status: 'active' | 'suspended' | 'blacklisted';
  blacklistReason?: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  registeredVia: string;
  createdAt: string;
  updatedAt: string;
  lastLoanAt?: string;
}

export interface CustomerStats {
  total: number;
  active: number;
  suspended: number;
  blacklisted: number;
  withActiveLoans: number;
}

// Credit Assessment Types
export interface CreditAssessment {
  assessmentId: string;
  customerId: string;
  merchantId: string;
  requestedAmount: number;
  requestedTenure: number;
  purpose?: string;
  bvnVerified: boolean;
  bvnScore: number;
  duplicateCheckPassed: boolean;
  identityScore: number;
  deviceTrusted: boolean;
  deviceScore: number;
  locationScore: number;
  behavioralScore: number;
  estimatedIncome?: number;
  debtToIncomeRatio?: number;
  financialScore: number;
  merchantTenure: number;
  merchantScore: number;
  previousLoans: number;
  completedLoans: number;
  defaultedLoans: number;
  onTimePaymentRate: number;
  historyScore: number;
  totalScore: number;
  creditTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  decision: 'instant_approval' | 'conditional_approval' | 'manual_review' | 'declined';
  approvedAmount?: number;
  approvedTenure?: number;
  interestRate?: number;
  decisionReasons: string[];
  riskFlags: string[];
  recommendations: string[];
  assessedBy: 'system' | 'admin';
  assessedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditStats {
  total: number;
  instantApprovals: number;
  conditionalApprovals: number;
  manualReviews: number;
  declined: number;
  averageScore: number;
}

// Dashboard Types
export interface DashboardStats {
  totalMerchants: number;
  activeMerchants: number;
  pendingApprovals: number;
  totalCustomers: number;
  activeLoans: number;
  totalLoansValue: number;
  defaultRate: number;
  collectionRate: number;
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
  approvedBy?: string;
  approvedAt?: string | { _seconds: number; _nanoseconds: number };
  adminNotes?: string;
  createdAt: string | { _seconds: number; _nanoseconds: number };
  updatedAt: string | { _seconds: number; _nanoseconds: number };
  lastLoginAt?: string | { _seconds: number; _nanoseconds: number };
}

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
  financierName?: string;
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

export interface PlanMerchantMapping {
  mappingId: string;
  planId: string;
  merchantId: string;
  financierId: string;
  fundsAllocated: number;
  expirationDate: string | { _seconds: number; _nanoseconds: number };
  currentAllocation: number;
  status: 'active' | 'inactive' | 'suspended';
  totalLoans: number;
  totalDisbursed: number;
  totalRepaid: number;
  defaultRate: number;
  mappedBy: string;
  mappedAt: string | { _seconds: number; _nanoseconds: number };
  lastTransactionAt?: string | { _seconds: number; _nanoseconds: number };
  createdAt: string | { _seconds: number; _nanoseconds: number };
  updatedAt: string | { _seconds: number; _nanoseconds: number };
}

export interface FinancierStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  totalFunds: number;
  totalDisbursed: number;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    admin: {
      adminId: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    token: string;
  };
}
