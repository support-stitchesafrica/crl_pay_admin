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
  status: 'pending' | 'active' | 'suspended' | 'rejected';
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
