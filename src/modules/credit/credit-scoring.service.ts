import { Injectable, Logger } from '@nestjs/common';
import { Customer } from '../../entities/customer.entity';
import { YouverifyService } from '../verification/youverify.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { CreditConfigService } from './credit-config.service';
import { CreditConfiguration } from '../../entities/credit-config.entity';

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
  verificationData?: any;
}

@Injectable()
export class CreditScoringService {
  private readonly logger = new Logger(CreditScoringService.name);

  constructor(
    private readonly youverifyService: YouverifyService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
    private readonly creditConfigService: CreditConfigService,
  ) {}

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
    requestedTenure?: number,
    deviceFingerprint?: string,
    ipAddress?: string,
    financierId?: string,
  ): Promise<ScoringResult> {
    this.logger.log(`Calculating credit score for customer: ${customer.customerId}`);

    // Get active configuration
    const config = await this.creditConfigService.getActiveConfig(financierId);
    this.logger.log(`Using config: ${config.name} (v${config.version})`);

    const decisionReasons: string[] = [];
    const riskFlags: string[] = [];
    const recommendations: string[] = [];

    // 1. Identity Verification Score (0-200)
    const { identityScore, bvnScore, verificationData } = await this.assessIdentity(
      customer,
      merchantId,
      decisionReasons,
      riskFlags,
    );

    // 2. Behavioral Intelligence Score (0-200)
    const { behavioralScore, deviceScore, locationScore } = this.assessBehavior(
      customer,
      decisionReasons,
      riskFlags,
      deviceFingerprint,
      ipAddress,
    );

    // 3. Financial Capacity Score (0-300)
    // Use default tenure of 4 weeks if not provided (will be refined after plan selection)
    const financialScore = this.assessFinancialCapacity(
      customer,
      requestedAmount,
      requestedTenure || 4,
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
    this.logger.log(`Identity: ${identityScore}/${config.scoringWeights.identity}`);
    this.logger.log(`Behavioral: ${behavioralScore}/${config.scoringWeights.behavioral}`);
    this.logger.log(`Financial: ${financialScore}/${config.scoringWeights.financial}`);
    this.logger.log(`Merchant: ${merchantScore}/${config.scoringWeights.merchant}`);
    this.logger.log(`History: ${historyScore}/${config.scoringWeights.history}`);
    this.logger.log(`TOTAL: ${totalScore}/1000`);

    // Determine credit tier
    const creditTier = this.determineCreditTier(totalScore, config);

    // Make lending decision
    const decision = this.makeLendingDecision(
      totalScore,
      customer,
      requestedAmount,
      riskFlags,
      decisionReasons,
      config,
    );

    // Determine approved terms
    const { approvedAmount, approvedTenure, interestRate } = this.calculateApprovedTerms(
      decision,
      creditTier,
      requestedAmount,
      requestedTenure || 4,
      totalScore,
      config,
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
      verificationData, // Include verification data for storage
    };
  }

  /**
   * 1. Identity Verification (0-200)
   */
  private async assessIdentity(
    customer: Customer,
    merchantId: string,
    decisionReasons: string[],
    riskFlags: string[],
  ): Promise<{ identityScore: number; bvnScore: number; verificationData?: any }> {
    let identityScore = 0;
    let bvnScore = 0;
    let verificationData: any = null;

    // BVN Verification (0-100)
    if (customer.bvn && customer.bvn.length === 11) {
      try {
        // Perform real BVN verification with Youverify
        const verification = await this.youverifyService.verifyBvn(
          customer.bvn,
          customer.customerId,
          merchantId,
        );

        if (verification.verified) {
          // Check if names match
          const nameMatch = this.youverifyService.compareNames(
            customer.firstName,
            customer.lastName,
            verification.data.firstName,
            verification.data.lastName,
          );

          if (nameMatch.score >= 70) {
            bvnScore = 100;
            identityScore += 100;
            decisionReasons.push(`BVN verified successfully - ${nameMatch.reason}`);
            
            // Check watchlist status
            if (verification.data.watchListed) {
              riskFlags.push('Customer is on watchlist');
              identityScore -= 50; // Penalty for watchlisted individuals
            }
          } else {
            bvnScore = 50;
            identityScore += 50;
            riskFlags.push(`BVN name mismatch - ${nameMatch.reason}`);
            decisionReasons.push('BVN verified but name does not match');
          }

          verificationData = verification;
        } else {
          riskFlags.push('BVN verification failed');
          decisionReasons.push('BVN verification failed with provider');
        }
      } catch (error) {
        this.logger.error('BVN verification error:', error);
        riskFlags.push('BVN verification error');
        decisionReasons.push('BVN verification encountered an error');
      }
    } else {
      riskFlags.push('BVN not provided or invalid');
      decisionReasons.push('BVN not provided or invalid format');
    }

    // Duplicate Check (0-100)
    try {
      const duplicateCheck = await this.duplicateDetectionService.checkForDuplicates(customer);
      
      identityScore += duplicateCheck.duplicateScore;
      
      if (duplicateCheck.hasDuplicates) {
        duplicateCheck.duplicateReasons.forEach((reason) => decisionReasons.push(reason));
        duplicateCheck.riskFlags.forEach((flag) => riskFlags.push(flag));
        
        this.logger.warn(
          `Duplicates detected for customer ${customer.customerId}: ${duplicateCheck.duplicateCount} matches`,
        );
      } else {
        decisionReasons.push('No duplicate accounts detected');
      }
    } catch (error) {
      this.logger.error('Duplicate detection error:', error);
      // Give partial score if duplicate check fails
      identityScore += 50;
      decisionReasons.push('Duplicate check completed with warnings');
    }

    return { identityScore, bvnScore, verificationData };
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
  private determineCreditTier(totalScore: number, config: CreditConfiguration): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (totalScore >= config.creditTiers.platinum.min) return 'platinum';
    if (totalScore >= config.creditTiers.gold.min) return 'gold';
    if (totalScore >= config.creditTiers.silver.min) return 'silver';
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
    config: CreditConfiguration,
  ): 'instant_approval' | 'conditional_approval' | 'manual_review' | 'declined' {
    const rules = config.autoDeclineRules;

    // Auto-decline conditions
    if (rules.blacklistedCustomer && customer.status === 'blacklisted') {
      decisionReasons.push('Customer is blacklisted');
      return 'declined';
    }

    if (rules.suspendedCustomer && customer.status === 'suspended') {
      decisionReasons.push('Customer is suspended');
      return 'declined';
    }

    if (customer.defaultedLoans > rules.maxDefaultedLoans) {
      decisionReasons.push(`Too many defaulted loans (${customer.defaultedLoans} > ${rules.maxDefaultedLoans})`);
      return 'declined';
    }

    if (customer.activeLoans >= rules.maxActiveLoans) {
      decisionReasons.push(`Too many active loans (${customer.activeLoans} >= ${rules.maxActiveLoans})`);
      return 'declined';
    }

    if (totalScore < rules.minCreditScore) {
      decisionReasons.push(`Credit score below minimum (${totalScore} < ${rules.minCreditScore})`);
      return 'declined';
    }

    // Score-based decision using config thresholds
    const approvalThresholds = config.approvalThresholds;

    if (totalScore >= approvalThresholds.instantApproval.minScore && riskFlags.length <= approvalThresholds.instantApproval.maxRiskFlags) {
      decisionReasons.push('High credit score with no risk flags');
      return 'instant_approval';
    }

    if (totalScore >= approvalThresholds.conditionalApproval.minScore && 
        totalScore <= approvalThresholds.conditionalApproval.maxScore && 
        riskFlags.length <= approvalThresholds.conditionalApproval.maxRiskFlags) {
      decisionReasons.push('Moderate credit score - conditional approval');
      return 'conditional_approval';
    }

    if (totalScore >= approvalThresholds.manualReview.minScore && totalScore <= approvalThresholds.manualReview.maxScore) {
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
    config: CreditConfiguration,
  ): { approvedAmount: number; approvedTenure: number; interestRate: number } {
    if (decision === 'declined') {
      return { approvedAmount: 0, approvedTenure: 0, interestRate: 0 };
    }

    // Get interest rate from config
    const interestRate = config.interestRates[creditTier as keyof typeof config.interestRates];

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
