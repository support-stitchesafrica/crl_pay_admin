import { Injectable, Logger } from '@nestjs/common';
import { Customer } from '../../entities/customer.entity';

interface ScoringComponents {
  identityScore: number;
  bvnScore: number;
  behavioralScore: number;
  deviceScore: number;
  locationScore: number;
  financialScore: number;
  merchantScore: number;
  historyScore: number;
  totalScore: number;
}

interface ScoringResult {
  scores: ScoringComponents;
  creditTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  decision: 'instant_approval' | 'conditional_approval' | 'manual_review' | 'declined';
  approvedAmount: number;
  approvedTenure: number;
  interestRate: number;
  decisionReasons: string[];
  riskFlags: string[];
  recommendations: string[];
}

@Injectable()
export class CreditScoringService {
  private readonly logger = new Logger(CreditScoringService.name);

  /**
   * Main credit scoring algorithm
   * Total Score: 0-1000
   * - Identity Verification: 0-200 (BVN + Duplicate Check)
   * - Behavioral Intelligence: 0-200 (Device + Location)
   * - Financial Capacity: 0-300 (Income, DTI, Affordability)
   * - Merchant Relationship: 0-100
   * - Credit History: 0-200 (if exists)
   */
  async calculateCreditScore(
    customer: Customer,
    merchantId: string,
    requestedAmount: number,
    requestedTenure: number,
    deviceFingerprint?: string,
    ipAddress?: string,
  ): Promise<ScoringResult> {
    this.logger.log(`Calculating credit score for customer: ${customer.customerId}`);

    const decisionReasons: string[] = [];
    const riskFlags: string[] = [];
    const recommendations: string[] = [];

    // 1. Identity Verification Score (0-200)
    const { identityScore, bvnScore } = this.assessIdentity(customer, decisionReasons, riskFlags);

    // 2. Behavioral Intelligence Score (0-200)
    const { behavioralScore, deviceScore, locationScore } = this.assessBehavior(
      customer,
      decisionReasons,
      riskFlags,
      deviceFingerprint,
      ipAddress,
    );

    // 3. Financial Capacity Score (0-300)
    const financialScore = this.assessFinancialCapacity(
      customer,
      requestedAmount,
      requestedTenure,
      decisionReasons,
      riskFlags,
      recommendations,
    );

    // 4. Merchant Relationship Score (0-100)
    const merchantScore = this.assessMerchantRelationship(
      customer,
      merchantId,
      decisionReasons,
    );

    // 5. Credit History Score (0-200)
    const historyScore = this.assessCreditHistory(customer, decisionReasons, riskFlags);

    // Calculate total score
    const totalScore = identityScore + behavioralScore + financialScore + merchantScore + historyScore;

    this.logger.log(`Credit Score Breakdown:`);
    this.logger.log(`Identity: ${identityScore}/200`);
    this.logger.log(`Behavioral: ${behavioralScore}/200`);
    this.logger.log(`Financial: ${financialScore}/300`);
    this.logger.log(`Merchant: ${merchantScore}/100`);
    this.logger.log(`History: ${historyScore}/200`);
    this.logger.log(`TOTAL: ${totalScore}/1000`);

    // Determine credit tier
    const creditTier = this.determineCreditTier(totalScore);

    // Make lending decision
    const decision = this.makeLendingDecision(
      totalScore,
      customer,
      requestedAmount,
      riskFlags,
      decisionReasons,
    );

    // Calculate approved amount and terms
    const { approvedAmount, approvedTenure, interestRate } = this.calculateApprovedTerms(
      decision,
      creditTier,
      requestedAmount,
      requestedTenure,
      totalScore,
    );

    this.logger.log(`Final Decision: ${decision.toUpperCase()}`);
    this.logger.log(`Approved Amount: ₦${approvedAmount} for ${approvedTenure} weeks at ${interestRate}% monthly`);

    return {
      scores: {
        identityScore,
        bvnScore,
        behavioralScore,
        deviceScore,
        locationScore,
        financialScore,
        merchantScore,
        historyScore,
        totalScore,
      },
      creditTier,
      decision,
      approvedAmount,
      approvedTenure,
      interestRate,
      decisionReasons,
      riskFlags,
      recommendations,
    };
  }

  /**
   * 1. Identity Verification (0-200)
   */
  private assessIdentity(
    customer: Customer,
    decisionReasons: string[],
    riskFlags: string[],
  ): { identityScore: number; bvnScore: number } {
    let identityScore = 0;
    let bvnScore = 0;

    // BVN Verification (0-100)
    if (customer.bvn && customer.bvn.length === 11) {
      bvnScore = 100;
      identityScore += 100;
      decisionReasons.push('BVN verified successfully');
    } else {
      riskFlags.push('BVN not verified');
      decisionReasons.push('BVN verification failed');
    }

    // Duplicate Check (0-100)
    // In production, this would check for duplicate customers across email, phone, BVN, device
    // For now, assume pass
    identityScore += 100;
    decisionReasons.push('No duplicate accounts detected');

    return { identityScore, bvnScore };
  }

  /**
   * 2. Behavioral Intelligence (0-200)
   */
  private assessBehavior(
    customer: Customer,
    decisionReasons: string[],
    riskFlags: string[],
    deviceFingerprint?: string,
    ipAddress?: string,
  ): { behavioralScore: number; deviceScore: number; locationScore: number } {
    let behavioralScore = 0;
    let deviceScore = 0;
    let locationScore = 0;

    // Device Trust (0-100)
    if (deviceFingerprint && customer.deviceFingerprint === deviceFingerprint) {
      deviceScore = 100;
      behavioralScore += 100;
      decisionReasons.push('Device recognized and trusted');
    } else if (deviceFingerprint) {
      deviceScore = 50;
      behavioralScore += 50;
      riskFlags.push('New or unrecognized device');
    } else {
      deviceScore = 30;
      behavioralScore += 30;
      riskFlags.push('No device fingerprint provided');
    }

    // Location Analysis (0-100)
    if (ipAddress && customer.ipAddress === ipAddress) {
      locationScore = 100;
      behavioralScore += 100;
      decisionReasons.push('Location consistent with registration');
    } else if (ipAddress) {
      locationScore = 60;
      behavioralScore += 60;
      decisionReasons.push('Location within expected range');
    } else {
      locationScore = 40;
      behavioralScore += 40;
    }

    return { behavioralScore, deviceScore, locationScore };
  }

  /**
   * 3. Financial Capacity (0-300)
   */
  private assessFinancialCapacity(
    customer: Customer,
    requestedAmount: number,
    requestedTenure: number,
    decisionReasons: string[],
    riskFlags: string[],
    recommendations: string[],
  ): number {
    let financialScore = 0;

    // Calculate monthly repayment (simplified - will be refined in loan module)
    const monthlyRepayment = (requestedAmount * 1.02 * requestedTenure) / 4; // Rough estimate

    // Income Estimation (0-150)
    // In production, this would use bank statement analysis, salary verification, etc.
    // For now, use heuristics based on loan request
    const estimatedIncome = requestedAmount * 3; // Assume they earn 3x what they request

    if (monthlyRepayment / estimatedIncome < 0.3) {
      financialScore += 150;
      decisionReasons.push('Strong repayment capacity');
    } else if (monthlyRepayment / estimatedIncome < 0.5) {
      financialScore += 100;
      decisionReasons.push('Moderate repayment capacity');
    } else {
      financialScore += 50;
      riskFlags.push('Tight repayment capacity');
      recommendations.push('Consider reducing loan amount');
    }

    // Affordability Check (0-150)
    if (requestedAmount <= 50000) {
      financialScore += 150;
      decisionReasons.push('Loan amount within safe limits');
    } else if (requestedAmount <= 200000) {
      financialScore += 100;
      decisionReasons.push('Moderate loan amount');
    } else if (requestedAmount <= 500000) {
      financialScore += 50;
      riskFlags.push('High loan amount requested');
    } else {
      financialScore += 25;
      riskFlags.push('Very high loan amount');
      recommendations.push('Consider installment plan');
    }

    return financialScore;
  }

  /**
   * 4. Merchant Relationship (0-100)
   */
  private assessMerchantRelationship(
    customer: Customer,
    merchantId: string,
    decisionReasons: string[],
  ): number {
    let merchantScore = 0;

    // Check if customer registered via this merchant
    if (customer.registeredVia === merchantId) {
      const daysSinceRegistration = Math.floor(
        (new Date().getTime() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceRegistration >= 30) {
        merchantScore = 100;
        decisionReasons.push('Long-standing merchant relationship (30+ days)');
      } else if (daysSinceRegistration >= 7) {
        merchantScore = 70;
        decisionReasons.push('Established merchant relationship (7+ days)');
      } else if (daysSinceRegistration >= 1) {
        merchantScore = 40;
        decisionReasons.push('Recent merchant relationship');
      } else {
        merchantScore = 20;
        decisionReasons.push('New customer to merchant');
      }
    } else {
      merchantScore = 50;
      decisionReasons.push('Customer registered via different merchant');
    }

    return merchantScore;
  }

  /**
   * 5. Credit History (0-200)
   */
  private assessCreditHistory(
    customer: Customer,
    decisionReasons: string[],
    riskFlags: string[],
  ): number {
    let historyScore = 0;

    if (customer.totalLoans === 0) {
      // First-time borrower
      historyScore = 100;
      decisionReasons.push('First-time borrower - neutral credit history');
      return historyScore;
    }

    // Repayment Track Record (0-100)
    if (customer.onTimePaymentRate >= 95) {
      historyScore += 100;
      decisionReasons.push('Excellent repayment history (95%+ on-time)');
    } else if (customer.onTimePaymentRate >= 80) {
      historyScore += 70;
      decisionReasons.push('Good repayment history (80%+ on-time)');
    } else if (customer.onTimePaymentRate >= 60) {
      historyScore += 40;
      riskFlags.push('Fair repayment history');
    } else {
      historyScore += 10;
      riskFlags.push('Poor repayment history');
    }

    // Default History (0-100)
    if (customer.defaultedLoans === 0) {
      historyScore += 100;
      decisionReasons.push('No loan defaults');
    } else if (customer.defaultedLoans === 1 && customer.completedLoans >= 5) {
      historyScore += 50;
      riskFlags.push('One previous default');
    } else {
      historyScore += 0;
      riskFlags.push('Multiple loan defaults');
    }

    return historyScore;
  }

  /**
   * Determine Credit Tier based on score
   */
  private determineCreditTier(totalScore: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (totalScore >= 800) return 'platinum';
    if (totalScore >= 650) return 'gold';
    if (totalScore >= 500) return 'silver';
    return 'bronze';
  }

  /**
   * Make lending decision based on score and risk factors
   */
  private makeLendingDecision(
    totalScore: number,
    customer: Customer,
    requestedAmount: number,
    riskFlags: string[],
    decisionReasons: string[],
  ): 'instant_approval' | 'conditional_approval' | 'manual_review' | 'declined' {
    // Auto-decline conditions
    if (customer.status === 'blacklisted') {
      decisionReasons.push('Customer is blacklisted');
      return 'declined';
    }

    if (customer.defaultedLoans > 2) {
      decisionReasons.push('Too many defaulted loans');
      return 'declined';
    }

    if (customer.activeLoans >= 3) {
      decisionReasons.push('Too many active loans');
      return 'declined';
    }

    // Score-based decision
    if (totalScore >= 700 && riskFlags.length === 0) {
      decisionReasons.push('High credit score with no risk flags');
      return 'instant_approval';
    }

    if (totalScore >= 500 && riskFlags.length <= 2) {
      decisionReasons.push('Moderate credit score - conditional approval');
      return 'conditional_approval';
    }

    if (totalScore >= 400 && totalScore < 500) {
      decisionReasons.push('Below threshold - requires manual review');
      return 'manual_review';
    }

    decisionReasons.push('Credit score below minimum threshold');
    return 'declined';
  }

  /**
   * Calculate approved loan terms based on decision and tier
   */
  private calculateApprovedTerms(
    decision: string,
    creditTier: string,
    requestedAmount: number,
    requestedTenure: number,
    totalScore: number,
  ): { approvedAmount: number; approvedTenure: number; interestRate: number } {
    if (decision === 'declined') {
      return { approvedAmount: 0, approvedTenure: 0, interestRate: 0 };
    }

    // Interest rates by tier (monthly %)
    const interestRates = {
      bronze: 2.5,
      silver: 2.0,
      gold: 1.8,
      platinum: 1.5,
    };

    const interestRate = interestRates[creditTier as keyof typeof interestRates];

    // For instant approval, approve full amount
    if (decision === 'instant_approval') {
      return {
        approvedAmount: requestedAmount,
        approvedTenure: requestedTenure,
        interestRate,
      };
    }

    // For conditional/manual, reduce amount based on score
    const approvalPercentage = totalScore >= 600 ? 1.0 : totalScore >= 500 ? 0.8 : 0.6;

    return {
      approvedAmount: Math.floor(requestedAmount * approvalPercentage),
      approvedTenure: requestedTenure,
      interestRate,
    };
  }
}
