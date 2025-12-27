import { Timestamp } from 'firebase-admin/firestore';

// Enums for various statuses
export enum CreditDecisionStatus {
  INSTANT_APPROVAL = 'instant_approval',
  CONDITIONAL_APPROVAL = 'conditional_approval',
  MANUAL_REVIEW = 'manual_review',
  DECLINED = 'declined',
}

export enum LoanStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DEFAULTED = 'defaulted',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentPlanType {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

export enum TransactionType {
  LOAN_DISBURSEMENT = 'loan_disbursement',
  INSTALLMENT_PAYMENT = 'installment_payment',
  LATE_FEE = 'late_fee',
  EARLY_PAYMENT = 'early_payment',
  REFUND = 'refund',
}

// Merchant Interfaces
export interface CrlMerchant {
  merchantId: string;
  businessName: string;
  email: string;
  phone: string;
  kycStatus: 'pending' | 'approved' | 'rejected';
  apiKeys: {
    publicKey: string;
    secretKey: string;
  };
  webhookUrl?: string;
  settlementAccount: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Customer Interfaces
export interface CrlCustomer {
  customerId: string;
  merchantId: string;
  bvn: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  deviceInfo: {
    phoneType: string;
    deviceFingerprint: string;
    operatingSystem: string;
  };
  locationData: {
    gps: {
      latitude: number;
      longitude: number;
    };
    ipAddress: string;
  };
  creditScore: number;
  creditLimit: number;
  totalLoans: number;
  activeLoans: number;
  defaultedLoans: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Credit Assessment Interfaces
export interface CrlCreditAssessment {
  assessmentId: string;
  customerId: string;
  merchantId: string;
  identityVerification: {
    bvnVerified: boolean;
    biometricMatched: boolean;
    duplicateCheck: boolean;
  };
  behavioralIntelligence: {
    deviceFingerprint: string;
    locationConsistency: boolean;
    transactionVelocity: number;
    timeOfDayPattern: string;
  };
  merchantRelationship: {
    accountAge: number; // in days
    purchaseHistory: number;
    averageOrderValue: number;
    returnRate: number;
  };
  financialCapacity: {
    cardValid: boolean;
    estimatedCreditworthiness: number;
    debtToIncomeRatio?: number;
  };
  creditScore: number;
  decision: CreditDecisionStatus;
  creditLimit: number;
  assessedAt: Timestamp;
}

// Loan/Transaction Interfaces
export interface CrlLoan {
  loanId: string;
  customerId: string;
  merchantId: string;
  transactionReference: string;
  principalAmount: number;
  interestRate: number;
  totalAmount: number;
  installmentAmount: number;
  numberOfInstallments: number;
  paidInstallments: number;
  remainingBalance: number;
  paymentPlan: PaymentPlanType;
  status: LoanStatus;
  cardToken: string;
  nextPaymentDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

// Payment/Installment Interfaces
export interface CrlPayment {
  paymentId: string;
  loanId: string;
  customerId: string;
  amount: number;
  installmentNumber: number;
  status: PaymentStatus;
  paymentMethod: 'card' | 'bank_transfer' | 'ussd' | 'mobile_money';
  paystackReference?: string;
  retryCount: number;
  scheduledDate: Timestamp;
  paidDate?: Timestamp;
  failureReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Transaction Log Interfaces
export interface CrlTransaction {
  transactionId: string;
  customerId: string;
  merchantId: string;
  loanId?: string;
  type: TransactionType;
  amount: number;
  status: PaymentStatus;
  reference: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
}

// Notification Log Interfaces
export interface CrlNotification {
  notificationId: string;
  customerId: string;
  type: 'sms' | 'email' | 'push';
  channel: string;
  subject?: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  sentAt?: Timestamp;
  createdAt: Timestamp;
}

// Merchant Settlement Interfaces
export interface CrlMerchantSettlement {
  settlementId: string;
  merchantId: string;
  loanId: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: 'pending' | 'completed' | 'failed';
  settledAt?: Timestamp;
  createdAt: Timestamp;
}

// Default Management Interfaces
export interface CrlDefaultManagement {
  defaultId: string;
  loanId: string;
  customerId: string;
  daysOverdue: number;
  amountOverdue: number;
  escalationLevel: 'low' | 'medium' | 'high' | 'critical' | 'terminal';
  lastContactDate?: Timestamp;
  resolutionStatus: 'pending' | 'payment_plan' | 'legal' | 'written_off';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Analytics/Metrics Interfaces
export interface CrlMerchantAnalytics {
  merchantId: string;
  period: 'daily' | 'weekly' | 'monthly';
  periodDate: Timestamp;
  metrics: {
    totalTransactions: number;
    totalAmount: number;
    approvalRate: number;
    averageOrderValue: number;
    defaultRate: number;
    collectionRate: number;
  };
  createdAt: Timestamp;
}
