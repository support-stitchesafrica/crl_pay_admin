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
      const now = new Date();

      const loan: Loan = {
        loanId,
        merchantId: createLoanDto.merchantId,
        customerId: createLoanDto.customerId,
        principalAmount: createLoanDto.principalAmount,
        configuration,
        paymentSchedule,
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

    const updatedLoan: Partial<Loan> = {
      cardAuthorization,
      status: 'active',
      activatedAt: new Date(),
      firstPaymentDate,
      paymentSchedule: updatedSchedule,
      updatedAt: new Date(),
    };

    await this.loansCollection.doc(loanId).update(updatedLoan);
    this.logger.log(`Card authorized for loan: ${loanId}`);

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
  async findAll(filters?: {
    merchantId?: string;
    customerId?: string;
    status?: string;
    limit?: number;
  }): Promise<Loan[]> {
    let query: FirebaseFirestore.Query = this.loansCollection;

    if (filters?.merchantId) {
      query = query.where('merchantId', '==', filters.merchantId);
    }

    if (filters?.customerId) {
      query = query.where('customerId', '==', filters.customerId);
    }

    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }

    query = query.orderBy('createdAt', 'desc');

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => {
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
}
