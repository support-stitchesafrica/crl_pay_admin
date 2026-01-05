import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { Loan, PaymentScheduleItem, CardAuthorization } from '../../entities/loan.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto, AuthorizeCardDto, RecordPaymentDto } from './dto/update-loan.dto';
import { LoanCalculatorService } from './loan-calculator.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);
  private loansCollection: FirebaseFirestore.CollectionReference;

  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private loanCalculator: LoanCalculatorService,
  ) {
    this.loansCollection = this.firestore.collection('crl_loans');
  }

  /**
   * Create a new loan
   */
  async create(
    createLoanDto: CreateLoanDto,
    merchantInterestRate: number,
    merchantPenaltyRate: number,
  ): Promise<Loan> {
    try {
      // Ensure merchantId is present
      if (!createLoanDto.merchantId) {
        throw new BadRequestException('Merchant ID is required');
      }

      // Validate tenor and frequency combination
      const validation = this.loanCalculator.validateTenorFrequencyCombination(
        createLoanDto.tenor,
        createLoanDto.frequency,
      );

      if (!validation.valid) {
        throw new BadRequestException(validation.message);
      }

      // Generate loan configuration
      const configuration = this.loanCalculator.calculateLoanConfiguration(
        createLoanDto.principalAmount,
        createLoanDto.frequency,
        createLoanDto.tenor,
        merchantInterestRate,
        merchantPenaltyRate,
      );

      // Generate payment schedule (will start after card authorization)
      const paymentSchedule = this.loanCalculator.generatePaymentSchedule(configuration);

      const loanId = uuidv4();
      const loanAccountNumber = await this.generateLoanAccountNumber();
      const now = new Date();

      // Convert to plain objects for Firestore (avoid class instances)
      const plainConfiguration = JSON.parse(JSON.stringify(configuration));
      const plainPaymentSchedule = JSON.parse(JSON.stringify(paymentSchedule));

      const loan: Loan = {
        loanId,
        loanAccountNumber,
        merchantId: createLoanDto.merchantId,
        customerId: createLoanDto.customerId,
        principalAmount: createLoanDto.principalAmount,
        configuration: plainConfiguration,
        paymentSchedule: plainPaymentSchedule,
        status: 'pending', // Waiting for card authorization
        currentInstallment: 0,
        amountPaid: 0,
        amountRemaining: configuration.totalAmount,
        orderId: createLoanDto.orderId,
        productDescription: createLoanDto.productDescription,
        metadata: createLoanDto.metadata,
        createdAt: now,
        updatedAt: now,
      };

      await this.loansCollection.doc(loanId).set(loan);
      this.logger.log(`Loan created: ${loanId} for customer: ${createLoanDto.customerId}`);

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
    this.logger.log(`Card authorized for loan: ${loanId}`);

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

      const loans = loansSnapshot.docs.map((doc) => {
        const data = doc.data();
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
        } as Loan;
      });

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
    // Fetch all loans ordered by createdAt
    // We filter in-memory to avoid Firestore composite index requirement
    const snapshot = await this.loansCollection.orderBy('createdAt', 'desc').get();

    let loans = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        activatedAt: data.activatedAt?.toDate ? data.activatedAt.toDate() : data.activatedAt,
        firstPaymentDate: data.firstPaymentDate?.toDate ? data.firstPaymentDate.toDate() : data.firstPaymentDate,
        lastPaymentDate: data.lastPaymentDate?.toDate ? data.lastPaymentDate.toDate() : data.lastPaymentDate,
        completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : data.completedAt,
        defaultedAt: data.defaultedAt?.toDate ? data.defaultedAt.toDate() : data.defaultedAt,
        paymentSchedule: data.paymentSchedule?.map((p: any) => ({
          ...p,
          dueDate: p.dueDate?.toDate ? p.dueDate.toDate() : new Date(p.dueDate),
          paidAt: p.paidAt?.toDate ? p.paidAt.toDate() : p.paidAt,
          lastAttemptAt: p.lastAttemptAt?.toDate ? p.lastAttemptAt.toDate() : p.lastAttemptAt,
        })) || [],
      } as Loan;
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
    return {
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      activatedAt: data.activatedAt?.toDate ? data.activatedAt.toDate() : data.activatedAt,
      firstPaymentDate: data.firstPaymentDate?.toDate ? data.firstPaymentDate.toDate() : data.firstPaymentDate,
      lastPaymentDate: data.lastPaymentDate?.toDate ? data.lastPaymentDate.toDate() : data.lastPaymentDate,
      completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : data.completedAt,
      defaultedAt: data.defaultedAt?.toDate ? data.defaultedAt.toDate() : data.defaultedAt,
      paymentSchedule: data.paymentSchedule?.map((p: any) => ({
        ...p,
        dueDate: p.dueDate?.toDate ? p.dueDate.toDate() : new Date(p.dueDate),
        paidAt: p.paidAt?.toDate ? p.paidAt.toDate() : p.paidAt,
        lastAttemptAt: p.lastAttemptAt?.toDate ? p.lastAttemptAt.toDate() : p.lastAttemptAt,
      })) || [],
    } as Loan;
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

    return {
      totalLoans: loans.length,
      activeLoans: loans.filter((l) => l.status === 'active').length,
      completedLoans: loans.filter((l) => l.status === 'completed').length,
      defaultedLoans: loans.filter((l) => l.status === 'defaulted').length,
      totalDisbursed: loans.reduce((sum, l) => sum + l.principalAmount, 0),
      totalCollected: loans.reduce((sum, l) => sum + l.amountPaid, 0),
      totalOutstanding: loans.reduce((sum, l) => sum + l.amountRemaining, 0),
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
