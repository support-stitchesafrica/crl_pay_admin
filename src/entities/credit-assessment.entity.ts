export interface CreditAssessment {
  assessmentId: string;
  customerId: string;
  merchantId: string;

  // Request Details
  requestedAmount: number;
  requestedTenure: number; // in weeks
  purpose?: string;

  // Identity Verification
  bvnVerified: boolean;
  bvnScore: number; // 0-100
  duplicateCheckPassed: boolean;
  identityScore: number; // 0-200

  // Behavioral Intelligence
  deviceTrusted: boolean;
  deviceScore: number; // 0-100
  locationScore: number; // 0-100
  behavioralScore: number; // 0-200

  // Financial Capacity
  estimatedIncome?: number;
  debtToIncomeRatio?: number;
  financialScore: number; // 0-300

  // Merchant Relationship
  merchantTenure: number; // days since registration via this merchant
  merchantScore: number; // 0-100

  // Credit History (if exists)
  previousLoans: number;
  completedLoans: number;
  defaultedLoans: number;
  onTimePaymentRate: number;
  historyScore: number; // 0-200

  // Final Assessment
  totalScore: number; // 0-1000
  creditTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  decision: 'instant_approval' | 'conditional_approval' | 'manual_review' | 'declined';
  approvedAmount?: number;
  approvedTenure?: number;
  interestRate?: number;

  // Reasons & Explanations
  decisionReasons: string[];
  riskFlags: string[];
  recommendations: string[];

  // Metadata
  assessedBy: 'system' | 'admin';
  assessedAt: Date;
  expiresAt: Date; // Assessment valid for 24 hours

  createdAt: Date;
  updatedAt: Date;
}
