export type EscalationLevel = 'low' | 'medium' | 'high' | 'critical' | 'terminal';

export type ResolutionStatus = 'pending' | 'payment_plan' | 'partial_payment' | 'legal' | 'written_off' | 'resolved';

export type ContactMethod = 'sms' | 'email' | 'phone_call' | 'whatsapp' | 'letter';

export interface ContactAttempt {
  method: ContactMethod;
  attemptedAt: Date;
  successful: boolean;
  notes?: string;
  agentId?: string;
}

export interface PaymentPlan {
  planId: string;
  originalAmount: number;
  restructuredAmount: number;
  numberOfInstallments: number;
  installmentAmount: number;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'completed' | 'defaulted';
  createdAt: Date;
}

export interface Default {
  defaultId: string;
  loanId: string;
  customerId: string;
  merchantId: string;

  // Default Details
  daysOverdue: number;
  amountOverdue: number;
  totalOutstanding: number; // Principal + Interest + Late Fees
  lateFees: number;

  // Escalation
  escalationLevel: EscalationLevel;
  escalatedAt?: Date;
  previousEscalationLevel?: EscalationLevel;

  // Collection Efforts
  contactAttempts: ContactAttempt[];
  totalContactAttempts: number;
  lastContactDate?: Date;
  lastContactMethod?: ContactMethod;
  nextContactDate?: Date;

  // Resolution
  resolutionStatus: ResolutionStatus;
  resolutionDetails?: string;
  resolvedAt?: Date;
  resolvedBy?: string;

  // Payment Plan (if restructured)
  paymentPlan?: PaymentPlan;

  // Credit Bureau
  reportedToCreditBureau: boolean;
  creditBureauReportDate?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface DefaultStats {
  totalDefaults: number;
  activeDefaults: number;
  resolvedDefaults: number;
  writtenOffDefaults: number;
  totalAmountOverdue: number;
  totalLateFees: number;
  byEscalationLevel: {
    low: number;
    medium: number;
    high: number;
    critical: number;
    terminal: number;
  };
  averageDaysOverdue: number;
  recoveryRate: number;
}

// Escalation thresholds (in days overdue)
export const ESCALATION_THRESHOLDS = {
  low: 1,        // 1-7 days
  medium: 8,     // 8-14 days
  high: 15,      // 15-30 days
  critical: 31,  // 31-60 days
  terminal: 61,  // 61+ days
};

// Late fee configuration
export const LATE_FEE_CONFIG = {
  gracePeriodDays: 3,           // No late fee for first 3 days
  dailyPenaltyRate: 0.1,        // 0.1% per day after grace period
  maxPenaltyPercentage: 10,     // Cap at 10% of overdue amount
};
