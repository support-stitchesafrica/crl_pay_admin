import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { CreditScoringService } from './credit-scoring.service';
import { CustomersService } from '../customers/customers.service';
import { AssessCreditDto } from './dto/assess-credit.dto';
import { CreditAssessment } from '../../entities/credit-assessment.entity';

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);
  private assessmentsCollection: FirebaseFirestore.CollectionReference;

  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private creditScoringService: CreditScoringService,
    private customersService: CustomersService,
  ) {
    this.assessmentsCollection = this.firestore.collection('crl_credit_assessments');
  }

  /**
   * Perform comprehensive credit assessment
   */
  async assessCredit(assessCreditDto: AssessCreditDto): Promise<CreditAssessment> {
    this.logger.log(`Starting credit assessment for customer: ${assessCreditDto.customerId}`);

    try {
      // Ensure merchantId is present
      if (!assessCreditDto.merchantId) {
        throw new BadRequestException('Merchant ID is required');
      }

      // 1. Fetch customer data
      const customer = await this.customersService.findOne(assessCreditDto.customerId);
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      this.logger.log(`Customer found: ${customer.firstName} ${customer.lastName}`);

      // 2. Run credit scoring algorithm
      const scoringResult = await this.creditScoringService.calculateCreditScore(
        customer,
        assessCreditDto.merchantId,
        assessCreditDto.requestedAmount,
        assessCreditDto.requestedTenure,
        assessCreditDto.deviceFingerprint,
        assessCreditDto.ipAddress,
      );

      // 3. Create assessment record
      const assessmentRef = this.assessmentsCollection.doc();
      const assessmentId = assessmentRef.id;

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      const assessment: CreditAssessment = {
        assessmentId,
        customerId: assessCreditDto.customerId,
        merchantId: assessCreditDto.merchantId,

        // Request details
        requestedAmount: assessCreditDto.requestedAmount,
        ...(assessCreditDto.requestedTenure !== undefined && { requestedTenure: assessCreditDto.requestedTenure }),
        ...(assessCreditDto.purpose && { purpose: assessCreditDto.purpose }),

        // Identity verification
        bvnVerified: scoringResult.scores.bvnScore === 100,
        bvnScore: scoringResult.scores.bvnScore,
        duplicateCheckPassed: true, // Simplified for now
        identityScore: scoringResult.scores.identityScore,

        // Behavioral intelligence
        deviceTrusted: scoringResult.scores.deviceScore >= 80,
        deviceScore: scoringResult.scores.deviceScore,
        locationScore: scoringResult.scores.locationScore,
        behavioralScore: scoringResult.scores.behavioralScore,

        // Financial capacity
        financialScore: scoringResult.scores.financialScore,

        // Merchant relationship
        merchantTenure: this.calculateMerchantTenure(customer, assessCreditDto.merchantId),
        merchantScore: scoringResult.scores.merchantScore,

        // Credit history
        previousLoans: customer.totalLoans,
        completedLoans: customer.completedLoans,
        defaultedLoans: customer.defaultedLoans,
        onTimePaymentRate: customer.onTimePaymentRate,
        historyScore: scoringResult.scores.historyScore,

        // Final assessment
        totalScore: scoringResult.scores.totalScore,
        creditTier: scoringResult.creditTier,
        decision: scoringResult.decision,
        ...(scoringResult.approvedAmount !== undefined && { approvedAmount: scoringResult.approvedAmount }),
        ...(scoringResult.approvedTenure !== undefined && { approvedTenure: scoringResult.approvedTenure }),
        ...(scoringResult.interestRate !== undefined && { interestRate: scoringResult.interestRate }),

        // Reasons & explanations
        decisionReasons: scoringResult.decisionReasons,
        riskFlags: scoringResult.riskFlags,
        recommendations: scoringResult.recommendations,

        // Metadata
        assessedBy: 'system',
        assessedAt: now,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      };

      // 4. Save to Firestore
      await assessmentRef.set(assessment);

      this.logger.log(`Credit assessment completed: ${assessment.decision.toUpperCase()}`);
      this.logger.log(`Score: ${assessment.totalScore}/1000 | Tier: ${assessment.creditTier.toUpperCase()}`);
      this.logger.log(`Approved: ₦${assessment.approvedAmount} for ${assessment.approvedTenure} weeks`);

      // 5. Update customer credit profile
      if (assessment.decision !== 'declined') {
        await this.updateCustomerCreditProfile(customer.customerId, assessment);
      }

      return assessment;
    } catch (error) {
      this.logger.error('Error during credit assessment:', error);
      throw error;
    }
  }

  /**
   * Get assessment by ID
   */
  async findOne(assessmentId: string): Promise<CreditAssessment> {
    try {
      this.logger.log(`Fetching assessment ID: ${assessmentId}`);

      const doc = await this.assessmentsCollection.doc(assessmentId).get();

      if (!doc.exists) {
        this.logger.warn(`Assessment not found: ${assessmentId}`);
        throw new NotFoundException('Credit assessment not found');
      }

      const assessment = doc.data() as CreditAssessment;
      this.logger.log(`Assessment found for customer: ${assessment.customerId}`);
      return assessment;
    } catch (error) {
      this.logger.error('Error fetching assessment:', error);
      throw error;
    }
  }

  /**
   * Get all assessments for a customer
   */
  async findByCustomer(customerId: string): Promise<CreditAssessment[]> {
    try {
      this.logger.log(`Fetching assessments for customer: ${customerId}`);

      const snapshot = await this.assessmentsCollection
        .where('customerId', '==', customerId)
        .orderBy('createdAt', 'desc')
        .get();

      const assessments: CreditAssessment[] = [];
      snapshot.forEach((doc) => {
        assessments.push(doc.data() as CreditAssessment);
      });

      this.logger.log(`Found ${assessments.length} assessments for customer ${customerId}`);
      return assessments;
    } catch (error) {
      this.logger.error('Error fetching customer assessments:', error);
      throw error;
    }
  }

  /**
   * Get all assessments for a merchant
   */
  async findByMerchant(merchantId: string): Promise<CreditAssessment[]> {
    try {
      this.logger.log(`Fetching assessments for merchant: ${merchantId}`);

      const snapshot = await this.assessmentsCollection
        .where('merchantId', '==', merchantId)
        .orderBy('createdAt', 'desc')
        .get();

      const assessments: CreditAssessment[] = [];
      snapshot.forEach((doc) => {
        assessments.push(doc.data() as CreditAssessment);
      });

      this.logger.log(`Found ${assessments.length} assessments for merchant ${merchantId}`);
      return assessments;
    } catch (error) {
      this.logger.error('Error fetching merchant assessments:', error);
      throw error;
    }
  }

  /**
   * Get assessment statistics
   */
  async getStats(): Promise<{
    total: number;
    instantApprovals: number;
    conditionalApprovals: number;
    manualReviews: number;
    declined: number;
    averageScore: number;
  }> {
    try {
      this.logger.log('Calculating assessment statistics...');

      const snapshot = await this.assessmentsCollection.get();

      const stats = {
        total: 0,
        instantApprovals: 0,
        conditionalApprovals: 0,
        manualReviews: 0,
        declined: 0,
        averageScore: 0,
      };

      let totalScore = 0;

      snapshot.forEach((doc) => {
        const assessment = doc.data() as CreditAssessment;
        stats.total++;
        totalScore += assessment.totalScore;

        switch (assessment.decision) {
          case 'instant_approval':
            stats.instantApprovals++;
            break;
          case 'conditional_approval':
            stats.conditionalApprovals++;
            break;
          case 'manual_review':
            stats.manualReviews++;
            break;
          case 'declined':
            stats.declined++;
            break;
        }
      });

      stats.averageScore = stats.total > 0 ? Math.round(totalScore / stats.total) : 0;

      this.logger.log(`Stats: Total=${stats.total}, Approved=${stats.instantApprovals + stats.conditionalApprovals}, Declined=${stats.declined}`);
      return stats;
    } catch (error) {
      this.logger.error('Error calculating stats:', error);
      throw error;
    }
  }

  /**
   * Helper: Calculate merchant tenure in days
   */
  private calculateMerchantTenure(customer: any, merchantId: string): number {
    if (customer.registeredVia !== merchantId) {
      return 0;
    }

    const now = new Date();
    const registered = new Date(customer.createdAt);
    const diffTime = Math.abs(now.getTime() - registered.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Helper: Update customer's credit profile after assessment
   */
  private async updateCustomerCreditProfile(
    customerId: string,
    assessment: CreditAssessment,
  ): Promise<void> {
    try {
      await this.customersService.updateCreditProfile(customerId, {
        creditScore: assessment.totalScore,
        creditTier: assessment.creditTier,
      });

      this.logger.log(`Updated customer credit profile: Score=${assessment.totalScore}, Tier=${assessment.creditTier}`);
    } catch (error) {
      this.logger.error('Failed to update customer credit profile:', error);
      // Don't throw - this is not critical
    }
  }
}
