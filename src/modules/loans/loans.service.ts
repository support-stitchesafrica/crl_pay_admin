import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { Loan, PaymentScheduleItem, CardAuthorization } from '../../entities/loan.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto, AuthorizeCardDto, RecordPaymentDto } from './dto/update-loan.dto';
import { LoanCalculatorService } from './loan-calculator.service';
import { AllocationsService } from '../allocations/allocations.service';
import { CapitalService } from '../capital/capital.service';
import { CreditConfigService } from '../credit/credit-config.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);
  private loansCollection: FirebaseFirestore.CollectionReference;

  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private loanCalculator: LoanCalculatorService,
    private allocationsService: AllocationsService,
    private capitalService: CapitalService,
    private creditConfigService: CreditConfigService,
  ) {
    this.loansCollection = this.firestore.collection('crl_loans');
  }

  /**
   * Create a new loan
   */
  async create(
    createLoanDto: CreateLoanDto,
    merchantInterestRate?: number,
    merchantPenaltyRate?: number,
  ): Promise<Loan> {
    try {
      if (!createLoanDto.merchantId) {
        throw new BadRequestException('Merchant ID is required');
      }

      // Get merchant's active allocation
      const allocation = await this.allocationsService.findByMerchant(createLoanDto.merchantId);
      
      if (!allocation) {
        throw new NotFoundException('Merchant has no active allocation');
      }

      // Reserve amount from allocation
      await this.allocationsService.reserveAmount(allocation.allocationId, createLoanDto.principalAmount);

      // Get credit configuration to determine interest rate based on tier
      const creditConfig = await this.creditConfigService.getActiveConfig();
      const interestRatePerPeriod = creditConfig.interestRates[createLoanDto.creditTier];

      // Use allocation terms for loan configuration
      const terms = allocation.terms;
      const numberOfInstallments = terms.tenure;
      
      // Calculate interest based on credit tier
      const totalInterest = Math.ceil(
        (createLoanDto.principalAmount * interestRatePerPeriod * numberOfInstallments) / 100
      );
      const totalAmount = createLoanDto.principalAmount + totalInterest;
      const installmentAmount = Math.ceil(totalAmount / numberOfInstallments);

      const configuration = {
        frequency: terms.tenurePeriod.slice(0, -1) as any,
        tenor: { value: terms.tenure, period: terms.tenurePeriod.toUpperCase() as any },
        numberOfInstallments,
        interestRate: interestRatePerPeriod,
        penaltyRate: terms.penalty.amount,
        lateFee: terms.penalty,
        installmentAmount,
        totalInterest,
        totalAmount,
      };

      // Generate payment schedule
      const paymentSchedule = this.loanCalculator.generatePaymentSchedule(configuration);

      const loanId = uuidv4();
      const loanAccountNumber = await this.generateLoanAccountNumber();
      const now = new Date();

      // Convert to plain objects for Firestore
      const plainConfiguration = JSON.parse(JSON.stringify(configuration));
      const plainPaymentSchedule = JSON.parse(JSON.stringify(paymentSchedule));

      const loan: Loan = {
        loanId,
        loanAccountNumber,
        merchantId: createLoanDto.merchantId,
        customerId: createLoanDto.customerId,
        allocationId: allocation.allocationId,
        principalAmount: createLoanDto.principalAmount,
        configuration: plainConfiguration,
        paymentSchedule: plainPaymentSchedule,
        status: 'pending',
        currentInstallment: 0,
        amountPaid: 0,
        amountRemaining: configuration.totalAmount,
        settled: false,
        orderId: createLoanDto.orderId,
        productDescription: createLoanDto.productDescription,
        metadata: createLoanDto.metadata,
        createdAt: now,
        updatedAt: now,
      };

      await this.loansCollection.doc(loanId).set(loan);
      
      // Create payment schedule records in separate collection
      const schedulePromises = paymentSchedule.map((scheduleItem, index) => {
        const scheduleId = `${loanId}_${index + 1}`;
        return this.firestore.collection('crl_repayment_schedules').doc(scheduleId).set({
          scheduleId,
          loanId,
          ...scheduleItem,
          createdAt: now,
          updatedAt: now,
        });
      });
      await Promise.all(schedulePromises);
      
      // Record loan creation in allocation
      await this.allocationsService.recordLoanCreation(
        allocation.allocationId,
        createLoanDto.principalAmount
      );
      
      // Record loan disbursement in capital pool
      await this.capitalService.recordLoanDisbursement(createLoanDto.principalAmount);
      
      this.logger.log(`Loan created: ${loanId} with ${paymentSchedule.length} payment schedules from allocation: ${allocation.allocationId}`);

      return loan;
    } catch (error) {
      this.logger.error(`Failed to create loan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Authorize card for loan and activate it
   */
  async authorizeCard(loanId: string, cardAuth: AuthorizeCardDto): Promise<Loan> {
    const loan = await this.findOne(loanId);

    if (loan.status !== 'pending') {
      throw new BadRequestException('Loan is not in pending status');
    }

    const cardAuthorization: CardAuthorization = {
      authorizationCode: cardAuth.authorizationCode,
      cardType: cardAuth.cardType,
      last4: cardAuth.last4,
      expiryMonth: cardAuth.expiryMonth,
      expiryYear: cardAuth.expiryYear,
      bank: cardAuth.bank,
      paystackCustomerCode: cardAuth.paystackCustomerCode,
    };

    // Update payment schedule with actual start date
    const firstPaymentDate = new Date();
    firstPaymentDate.setDate(firstPaymentDate.getDate() + 7); // First payment in 7 days

    const updatedSchedule = this.loanCalculator.generatePaymentSchedule(
      loan.configuration,
      firstPaymentDate,
    );

    const plainUpdatedSchedule = JSON.parse(JSON.stringify(updatedSchedule));

    const updatedLoan: Partial<Loan> = {
      cardAuthorization,
      status: 'active',
      activatedAt: new Date(),
      firstPaymentDate,
      paymentSchedule: plainUpdatedSchedule,
      updatedAt: new Date(),
    };

    await this.loansCollection.doc(loanId).update(updatedLoan);
    
    // Update payment schedule records in separate collection with actual dates
    const now = new Date();
    const scheduleUpdatePromises = updatedSchedule.map((scheduleItem, index) => {
      const scheduleId = `${loanId}_${index + 1}`;
      return this.firestore.collection('crl_repayment_schedules').doc(scheduleId).update({
        ...scheduleItem,
        updatedAt: now,
      });
    });
    await Promise.all(scheduleUpdatePromises);
    
    this.logger.log(`Card authorized for loan: ${loanId} and payment schedules updated`);

    // Also save card info to customer record for future use
    try {
      const customersCollection = this.firestore.collection('crl_customers');
      await customersCollection.doc(loan.customerId).update({
        paystackAuthorizationCode: cardAuth.authorizationCode,
        paystackCustomerCode: cardAuth.paystackCustomerCode,
        cardType: cardAuth.cardType,
        cardLast4: cardAuth.last4,
        cardExpiryMonth: cardAuth.expiryMonth,
        cardExpiryYear: cardAuth.expiryYear,
        cardBank: cardAuth.bank,
        cardAuthorizedAt: new Date(),
        updatedAt: new Date(),
      });
      this.logger.log(`Card info saved to customer: ${loan.customerId}`);
    } catch (error) {
      this.logger.error(`Failed to save card info to customer: ${error.message}`);
    }

    return { ...loan, ...updatedLoan } as Loan;
  }

  /**
   * Record a payment for a loan
   */
  async recordPayment(recordPaymentDto: RecordPaymentDto): Promise<Loan> {
    const loan = await this.findOne(recordPaymentDto.loanId);

    if (loan.status !== 'active') {
      throw new BadRequestException('Cannot record payment for inactive loan');
    }

    const installment = loan.paymentSchedule.find(
      (p) => p.installmentNumber === recordPaymentDto.installmentNumber
    );

    if (!installment) {
      throw new NotFoundException('Installment not found');
    }

    if (installment.status === 'paid') {
      throw new BadRequestException('Installment already paid');
    }

    // Update installment
    installment.status = 'paid';
    installment.paidAt = new Date();
    installment.paidAmount = recordPaymentDto.amount;
    installment.paymentId = recordPaymentDto.paymentId;

    // Update loan totals
    const amountPaid = loan.amountPaid + recordPaymentDto.amount;
    const amountRemaining = loan.configuration.totalAmount - amountPaid;
    const currentInstallment = recordPaymentDto.installmentNumber;

    // Check if loan is completed
    const isCompleted = amountRemaining <= 0 || currentInstallment === loan.configuration.numberOfInstallments;

    const updatedLoan: Partial<Loan> = {
      paymentSchedule: loan.paymentSchedule,
      currentInstallment,
      amountPaid,
      amountRemaining: Math.max(0, amountRemaining),
      lastPaymentDate: new Date(),
      status: isCompleted ? 'completed' : 'active',
      completedAt: isCompleted ? new Date() : undefined,
      updatedAt: new Date(),
    };

    await this.loansCollection.doc(loan.loanId).update(updatedLoan);
    this.logger.log(`Payment recorded for loan: ${loan.loanId}, installment: ${currentInstallment}`);

    return { ...loan, ...updatedLoan } as Loan;
  }

  /**
   * Find all loans
   */
  async getCustomerLoansByEmail(merchantId: string, email: string): Promise<Loan[]> {
    try {
      this.logger.log(`Getting loans for customer email: ${email}, merchant: ${merchantId}`);

      // First, find the customer by email and merchantId
      const customersSnapshot = await this.firestore
        .collection('crl_customers')
        .where('email', '==', email)
        .where('merchantId', '==', merchantId)
        .limit(1)
        .get();

      if (customersSnapshot.empty) {
        this.logger.log(`No customer found with email ${email} for merchant ${merchantId}`);
        return [];
      }

      const customerId = customersSnapshot.docs[0].id;

      // Get all loans for this customer and merchant
      const loansSnapshot = await this.firestore
        .collection('crl_loans')
        .where('customerId', '==', customerId)
        .where('merchantId', '==', merchantId)
        .orderBy('createdAt', 'desc')
        .get();

      const loans = await Promise.all(loansSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Fetch fresh payment schedules from crl_repayment_schedules collection, excluding deleted ones
        const schedulesSnapshot = await this.firestore
          .collection('crl_repayment_schedules')
          .where('loanId', '==', data.loanId)
          .orderBy('dueDate', 'asc')
          .get();

        const paymentSchedule = schedulesSnapshot.docs
          .filter(doc => doc.data().status !== 'deleted')
          .map((scheduleDoc) => {
          const schedule = scheduleDoc.data();
          return {
            ...schedule,
            dueDate: schedule.dueDate?.toDate ? schedule.dueDate.toDate() : new Date(schedule.dueDate),
            paidAt: schedule.paidAt?.toDate ? schedule.paidAt.toDate() : schedule.paidAt,
            lastAttemptAt: schedule.lastAttemptAt?.toDate ? schedule.lastAttemptAt.toDate() : schedule.lastAttemptAt,
            lastAccrualDate: schedule.lastAccrualDate?.toDate ? schedule.lastAccrualDate.toDate() : schedule.lastAccrualDate,
          };
        });
        
        return {
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
          activatedAt: data.activatedAt?.toDate ? data.activatedAt.toDate() : data.activatedAt,
          firstPaymentDate: data.firstPaymentDate?.toDate
            ? data.firstPaymentDate.toDate()
            : data.firstPaymentDate,
          lastPaymentDate: data.lastPaymentDate?.toDate
            ? data.lastPaymentDate.toDate()
            : data.lastPaymentDate,
          completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : data.completedAt,
          defaultedAt: data.defaultedAt?.toDate ? data.defaultedAt.toDate() : data.defaultedAt,
          paymentSchedule,
        } as unknown as Loan;
      }));

      this.logger.log(`Found ${loans.length} loans for customer ${email}`);
      return loans;
    } catch (error) {
      this.logger.error(`Failed to get customer loans: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(filters?: {
    merchantId?: string;
    customerId?: string;
    status?: string;
    limit?: number;
  }): Promise<Loan[]> {
    // Fetch all loans ordered by bookingDate (or createdAt as fallback)
    // We filter in-memory to avoid Firestore composite index requirement
    const snapshot = await this.loansCollection.orderBy('createdAt', 'desc').get();

    let loans = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      
      // Fetch fresh payment schedules from crl_repayment_schedules collection, excluding deleted ones
      const schedulesSnapshot = await this.firestore
        .collection('crl_repayment_schedules')
        .where('loanId', '==', data.loanId)
        .orderBy('dueDate', 'asc')
        .get();

      const paymentSchedule = schedulesSnapshot.docs
        .filter(doc => doc.data().status !== 'deleted')
        .map((scheduleDoc) => {
        const schedule = scheduleDoc.data();
        return {
          ...schedule,
          dueDate: schedule.dueDate?.toDate ? schedule.dueDate.toDate() : new Date(schedule.dueDate),
          paidAt: schedule.paidAt?.toDate ? schedule.paidAt.toDate() : schedule.paidAt,
          lastAttemptAt: schedule.lastAttemptAt?.toDate ? schedule.lastAttemptAt.toDate() : schedule.lastAttemptAt,
          lastAccrualDate: schedule.lastAccrualDate?.toDate ? schedule.lastAccrualDate.toDate() : schedule.lastAccrualDate,
        };
      });

      return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        bookingDate: data.bookingDate?.toDate ? data.bookingDate.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)),
        activatedAt: data.activatedAt?.toDate ? data.activatedAt.toDate() : data.activatedAt,
        firstPaymentDate: data.firstPaymentDate?.toDate ? data.firstPaymentDate.toDate() : data.firstPaymentDate,
        lastPaymentDate: data.lastPaymentDate?.toDate ? data.lastPaymentDate.toDate() : data.lastPaymentDate,
        completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : data.completedAt,
        defaultedAt: data.defaultedAt?.toDate ? data.defaultedAt.toDate() : data.defaultedAt,
        paymentSchedule,
      } as unknown as Loan;
    }));

    // Sort by bookingDate DESC (newest first)
    loans.sort((a, b) => {
      const dateA = a.bookingDate || a.createdAt;
      const dateB = b.bookingDate || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });

    // Apply filters in-memory
    if (filters?.merchantId) {
      loans = loans.filter((loan) => loan.merchantId === filters.merchantId);
    }

    if (filters?.customerId) {
      loans = loans.filter((loan) => loan.customerId === filters.customerId);
    }

    if (filters?.status) {
      loans = loans.filter((loan) => loan.status === filters.status);
    }

    // Apply limit if specified
    if (filters?.limit) {
      loans = loans.slice(0, filters.limit);
    }

    return loans;
  }

  /**
   * Find one loan by ID
   */
  async findOne(loanId: string): Promise<Loan> {
    const doc = await this.loansCollection.doc(loanId).get();

    if (!doc.exists) {
      throw new NotFoundException(`Loan with ID ${loanId} not found`);
    }

    const data = doc.data() as any;

    // Fetch fresh payment schedules from crl_repayment_schedules collection
    const schedulesSnapshot = await this.firestore
      .collection('crl_repayment_schedules')
      .where('loanId', '==', loanId)
      .orderBy('dueDate', 'asc')
      .get();

    const paymentSchedule = schedulesSnapshot.docs
      .filter(doc => doc.data().status !== 'deleted')
      .map((scheduleDoc) => {
      const schedule = scheduleDoc.data();
      return {
        ...schedule,
        dueDate: schedule.dueDate?.toDate ? schedule.dueDate.toDate() : new Date(schedule.dueDate),
        paidAt: schedule.paidAt?.toDate ? schedule.paidAt.toDate() : schedule.paidAt,
        lastAttemptAt: schedule.lastAttemptAt?.toDate ? schedule.lastAttemptAt.toDate() : schedule.lastAttemptAt,
        lastAccrualDate: schedule.lastAccrualDate?.toDate ? schedule.lastAccrualDate.toDate() : schedule.lastAccrualDate,
      };
    });

    return {
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      bookingDate: data.bookingDate?.toDate ? data.bookingDate.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)),
      activatedAt: data.activatedAt?.toDate ? data.activatedAt.toDate() : data.activatedAt,
      firstPaymentDate: data.firstPaymentDate?.toDate ? data.firstPaymentDate.toDate() : data.firstPaymentDate,
      lastPaymentDate: data.lastPaymentDate?.toDate ? data.lastPaymentDate.toDate() : data.lastPaymentDate,
      completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : data.completedAt,
      defaultedAt: data.defaultedAt?.toDate ? data.defaultedAt.toDate() : data.defaultedAt,
      paymentSchedule,
    } as unknown as Loan;
  }

  /**
   * Update loan
   */
  async update(loanId: string, updateLoanDto: UpdateLoanDto): Promise<Loan> {
    const loan = await this.findOne(loanId);

    const updatedData: Partial<Loan> = {
      ...updateLoanDto,
      updatedAt: new Date(),
    };

    await this.loansCollection.doc(loanId).update(updatedData);
    this.logger.log(`Loan updated: ${loanId}`);

    return { ...loan, ...updatedData } as Loan;
  }

  /**
   * Cancel a loan (only if pending)
   */
  async cancel(loanId: string): Promise<Loan> {
    const loan = await this.findOne(loanId);

    if (loan.status !== 'pending') {
      throw new BadRequestException('Can only cancel pending loans');
    }

    const updatedLoan: Partial<Loan> = {
      status: 'cancelled',
      updatedAt: new Date(),
    };

    await this.loansCollection.doc(loanId).update(updatedLoan);
    this.logger.log(`Loan cancelled: ${loanId}`);

    return { ...loan, ...updatedLoan } as Loan;
  }

  /**
   * Get global loan statistics (for admin dashboard)
   */
  async getGlobalStats(): Promise<{
    totalLoans: number;
    activeLoans: number;
    completedLoans: number;
    defaultedLoans: number;
    totalValue: number;
  }> {
    try {
      const loansSnapshot = await this.firestore.collection('crl_loans').get();

      const stats = {
        totalLoans: 0,
        activeLoans: 0,
        completedLoans: 0,
        defaultedLoans: 0,
        totalValue: 0,
      };

      loansSnapshot.forEach((doc) => {
        const loan = doc.data();
        stats.totalLoans++;
        stats.totalValue += loan.principalAmount || 0;

        if (loan.status === 'active') stats.activeLoans++;
        else if (loan.status === 'completed') stats.completedLoans++;
        else if (loan.status === 'defaulted') stats.defaultedLoans++;
      });

      return stats;
    } catch (error) {
      this.logger.error('Error calculating global loan stats:', error);
      throw error;
    }
  }

  /**
   * Get loan statistics for a merchant
   */
  async getMerchantStats(merchantId: string): Promise<{
    totalLoans: number;
    activeLoans: number;
    completedLoans: number;
    defaultedLoans: number;
    totalDisbursed: number;
    totalCollected: number;
    totalOutstanding: number;
  }> {
    const loans = await this.findAll({ merchantId });
    const activeLoans = loans.filter((l) => l.status === 'active');

    return {
      totalLoans: loans.length,
      activeLoans: activeLoans.length,
      completedLoans: loans.filter((l) => l.status === 'completed').length,
      defaultedLoans: loans.filter((l) => l.status === 'defaulted').length,
      // Only count active loans for disbursed and outstanding
      totalDisbursed: activeLoans.reduce((sum, l) => sum + l.principalAmount, 0),
      totalCollected: loans.reduce((sum, l) => sum + l.amountPaid, 0),
      totalOutstanding: activeLoans.reduce((sum, l) => sum + l.amountRemaining, 0),
    };
  }

  /**
   * Generate a unique human-readable 10-digit alphanumeric loan account number
   */
  private async generateLoanAccountNumber(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters (0, O, 1, I)
    let accountNumber = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      accountNumber = '';
      
      // Generate 10 random characters
      for (let i = 0; i < 10; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        accountNumber += chars[randomIndex];
      }
      
      // Check if this account number already exists
      const existingLoan = await this.loansCollection
        .where('loanAccountNumber', '==', accountNumber)
        .limit(1)
        .get();
      
      if (existingLoan.empty) {
        isUnique = true;
      } else {
        attempts++;
        this.logger.warn(`Duplicate loan account number generated: ${accountNumber}, retrying... (attempt ${attempts})`);
      }
    }
    
    if (!isUnique) {
      throw new Error('Failed to generate unique loan account number after multiple attempts');
    }
    
    return accountNumber;
  }
}
