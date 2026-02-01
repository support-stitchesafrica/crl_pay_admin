export interface CreditTierThresholds {
  bronze: { min: number; max: number };
  silver: { min: number; max: number };
  gold: { min: number; max: number };
  platinum: { min: number; max: number };
}

export interface ApprovalThresholds {
  instantApproval: { minScore: number; maxRiskFlags: number };
  conditionalApproval: { minScore: number; maxScore: number; maxRiskFlags: number };
  manualReview: { minScore: number; maxScore: number };
  autoDecline: { maxScore: number };
}

export interface InterestRates {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

export interface AutoDeclineRules {
  maxDefaultedLoans: number;
  maxActiveLoans: number;
  minCreditScore: number;
  blacklistedCustomer: boolean;
  suspendedCustomer: boolean;
}

export interface ScoringWeights {
  identity: number;
  behavioral: number;
  financial: number;
  merchant: number;
  history: number;
}

export interface CreditConfiguration {
  configId: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  
  // Configuration sections
  creditTiers: CreditTierThresholds;
  approvalThresholds: ApprovalThresholds;
  interestRates: InterestRates;
  autoDeclineRules: AutoDeclineRules;
  scoringWeights: ScoringWeights;
  
  // Optional financier-specific config
  financierId?: string;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export const DEFAULT_CREDIT_CONFIG: Omit<CreditConfiguration, 'configId' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
  name: 'Default Credit Configuration',
  description: 'Standard credit scoring and approval configuration',
  isActive: true,
  isDefault: true,
  version: 1,
  
  creditTiers: {
    bronze: { min: 0, max: 499 },
    silver: { min: 500, max: 649 },
    gold: { min: 650, max: 799 },
    platinum: { min: 800, max: 1000 },
  },
  
  approvalThresholds: {
    instantApproval: { minScore: 700, maxRiskFlags: 0 },
    conditionalApproval: { minScore: 500, maxScore: 699, maxRiskFlags: 2 },
    manualReview: { minScore: 400, maxScore: 499 },
    autoDecline: { maxScore: 399 },
  },
  
  interestRates: {
    bronze: 2.5,
    silver: 2.0,
    gold: 1.8,
    platinum: 1.5,
  },
  
  autoDeclineRules: {
    maxDefaultedLoans: 2,
    maxActiveLoans: 3,
    minCreditScore: 400,
    blacklistedCustomer: true,
    suspendedCustomer: true,
  },
  
  scoringWeights: {
    identity: 200,
    behavioral: 200,
    financial: 300,
    merchant: 100,
    history: 200,
  },
};
