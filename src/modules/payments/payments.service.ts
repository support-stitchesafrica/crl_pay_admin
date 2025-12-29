import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { Payment, PaymentStatus } from '../../entities/payment.entity';
import { Loan } from '../../entities/loan.entity';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { PaystackService } from './paystack.service';
import { LoansService } from '../loans/loans.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private paymentsCollection: FirebaseFirestore.CollectionReference;
  private loansCollection: FirebaseFirestore.CollectionReference;

  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private paystackService: PaystackService,
    private loansService: LoansService,
  ) {
    this.paymentsCollection = this.firestore.collection('crl_payments');
    this.loansCollection = this.firestore.collection('crl_loans');
  }

  /**
   * Create a payment record
   */
  async create(processPaymentDto: ProcessPaymentDto): Promise<Payment> {
    try {
      // Get the loan
      const loan = await this.loansService.findOne(processPaymentDto.loanId);

      if (loan.status !== 'active') {
        throw new BadRequestException('Loan is not active');
      }

      // Find the installment
      const installment = loan.paymentSchedule.find(
        (p) => p.installmentNumber === processPaymentDto.installmentNumber,
      );

      if (!installment) {
        throw new NotFoundException('Installment not found');
      }

      if (installment.status === 'paid') {
        throw new BadRequestException('Installment already paid');
      }

      const paymentId = uuidv4();
      const now = new Date();

      const payment: Payment = {
        paymentId,
        loanId: loan.loanId,
        merchantId: loan.merchantId,
        customerId: loan.customerId,
        installmentNumber: processPaymentDto.installmentNumber,
        amount: processPaymentDto.amount,
        principalAmount: installment.principalAmount,
        interestAmount: installment.interestAmount,
        method: processPaymentDto.method,
        status: 'pending',
        attemptCount: 0,
        maxAttempts: 3,
        scheduledFor: installment.dueDate,
        metadata: processPaymentDto.metadata,
        createdAt: now,
        updatedAt: now,
      };

      // If auto-debit, process immediately
      if (processPaymentDto.method === 'auto-debit') {
        if (!loan.cardAuthorization?.authorizationCode) {
          throw new BadRequestException('No card authorization found for auto-debit');
        }

        return await this.processAutoDebit(payment, loan);
      }

      // For manual payment, just create the record
      await this.paymentsCollection.doc(paymentId).set(payment);
      this.logger.log(`Payment created: ${paymentId} for loan: ${loan.loanId}`);

      return payment;
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process auto-debit payment via Paystack
   */
  async processAutoDebit(payment: Payment, loan: Loan): Promise<Payment> {
    try {
      payment.status = 'processing';
      payment.attemptCount += 1;
      payment.lastAttemptAt = new Date();

      const reference = `${payment.paymentId}-${payment.attemptCount}`;

      this.logger.log(`Processing auto-debit for payment: ${payment.paymentId}, attempt: ${payment.attemptCount}`);

      // Charge via Paystack
      const chargeResult = await this.paystackService.chargeAuthorization({
        email: loan.customerId, // Assuming customerId is email, adjust if needed
        amount: payment.amount * 100, // Convert to kobo
        authorizationCode: loan.cardAuthorization!.authorizationCode,
        reference,
        metadata: {
          paymentId: payment.paymentId,
          loanId: loan.loanId,
          installmentNumber: payment.installmentNumber,
          ...payment.metadata,
        },
      });

      // Update payment based on result
      if (chargeResult.data.status === 'success') {
        payment.status = 'success';
        payment.succeededAt = new Date();
        payment.paystackReference = reference;
        payment.updatedAt = new Date();

        // Update loan installment
        await this.loansService.recordPayment({
          loanId: loan.loanId,
          installmentNumber: payment.installmentNumber,
          amount: payment.amount,
          paymentId: payment.paymentId,
        });

        this.logger.log(`Auto-debit successful for payment: ${payment.paymentId}`);
      } else {
        payment.status = 'failed';
        payment.failedAt = new Date();
        payment.errorMessage = chargeResult.data.gateway_response || chargeResult.message;
        payment.updatedAt = new Date();

        // Schedule retry if attempts remain
        if (payment.attemptCount < payment.maxAttempts) {
          payment.nextRetryAt = this.calculateNextRetry(payment.attemptCount);
        }

        this.logger.warn(`Auto-debit failed for payment: ${payment.paymentId}, message: ${payment.errorMessage}`);
      }

      await this.paymentsCollection.doc(payment.paymentId).set(payment);
      return payment;
    } catch (error: any) {
      this.logger.error(`Auto-debit processing error: ${error.message}`);

      payment.status = 'failed';
      payment.failedAt = new Date();
      payment.errorMessage = error.message;
      payment.updatedAt = new Date();

      // Schedule retry
      if (payment.attemptCount < payment.maxAttempts) {
        payment.nextRetryAt = this.calculateNextRetry(payment.attemptCount);
      }

      await this.paymentsCollection.doc(payment.paymentId).set(payment);
      throw error;
    }
  }

  /**
   * Calculate next retry time based on attempt count
   * Attempt 1: 6 hours
   * Attempt 2: 24 hours
   * Attempt 3: 48 hours
   */
  private calculateNextRetry(attemptCount: number): Date {
    const hoursMap = {
      1: 6,
      2: 24,
      3: 48,
    };

    const hours = hoursMap[attemptCount as keyof typeof hoursMap] || 24;
    const nextRetry = new Date();
    nextRetry.setHours(nextRetry.getHours() + hours);

    return nextRetry;
  }

  /**
   * Retry a failed payment
   */
  async retry(paymentId: string): Promise<Payment> {
    const payment = await this.findOne(paymentId);

    if (payment.status === 'success') {
      throw new BadRequestException('Payment already successful');
    }

    if (payment.attemptCount >= payment.maxAttempts) {
      throw new BadRequestException('Maximum retry attempts reached');
    }

    if (payment.method !== 'auto-debit') {
      throw new BadRequestException('Only auto-debit payments can be retried');
    }

    const loan = await this.loansService.findOne(payment.loanId);
    return await this.processAutoDebit(payment, loan);
  }

  /**
   * Generate manual payment link
   */
  async generatePaymentLink(paymentId: string): Promise<string> {
    const payment = await this.findOne(paymentId);

    if (payment.status === 'success') {
      throw new BadRequestException('Payment already successful');
    }

    const loan = await this.loansService.findOne(payment.loanId);
    const reference = `${payment.paymentId}-manual`;

    const paymentUrl = await this.paystackService.generatePaymentLink({
      email: loan.customerId, // Assuming customerId is email
      amount: payment.amount * 100, // Convert to kobo
      reference,
      callbackUrl: `${process.env.APP_URL || 'http://localhost:3006'}/api/v1/payments/verify`,
      metadata: {
        paymentId: payment.paymentId,
        loanId: loan.loanId,
        installmentNumber: payment.installmentNumber,
      },
    });

    // Update payment with reference
    await this.paymentsCollection.doc(paymentId).update({
      paystackReference: reference,
      updatedAt: new Date(),
    });

    this.logger.log(`Payment link generated for payment: ${paymentId}`);
    return paymentUrl;
  }

  /**
   * Verify payment via Paystack
   */
  async verifyPayment(reference: string): Promise<Payment> {
    try {
      const verification = await this.paystackService.verifyTransaction(reference);

      // Find payment by reference
      const snapshot = await this.paymentsCollection
        .where('paystackReference', '==', reference)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new NotFoundException('Payment not found');
      }

      const paymentDoc = snapshot.docs[0];
      const payment = paymentDoc.data() as Payment;

      // Update payment status
      if (verification.data.status === 'success') {
        payment.status = 'success';
        payment.succeededAt = new Date();
        payment.updatedAt = new Date();

        // Update loan installment
        await this.loansService.recordPayment({
          loanId: payment.loanId,
          installmentNumber: payment.installmentNumber,
          amount: payment.amount,
          paymentId: payment.paymentId,
        });

        this.logger.log(`Payment verified successfully: ${payment.paymentId}`);
      } else {
        payment.status = 'failed';
        payment.failedAt = new Date();
        payment.errorMessage = verification.data.gateway_response;
        payment.updatedAt = new Date();

        this.logger.warn(`Payment verification failed: ${payment.paymentId}`);
      }

      await this.paymentsCollection.doc(payment.paymentId).update({
        status: payment.status,
        succeededAt: payment.succeededAt,
        failedAt: payment.failedAt,
        errorMessage: payment.errorMessage,
        updatedAt: payment.updatedAt,
      });
      return payment;
    } catch (error) {
      this.logger.error(`Payment verification error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find all payments
   */
  async findAll(filters?: {
    loanId?: string;
    merchantId?: string;
    customerId?: string;
    status?: PaymentStatus;
    limit?: number;
  }): Promise<Payment[]> {
    let query: FirebaseFirestore.Query = this.paymentsCollection;

    if (filters?.loanId) {
      query = query.where('loanId', '==', filters.loanId);
    }

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
        scheduledFor: data.scheduledFor?.toDate ? data.scheduledFor.toDate() : new Date(data.scheduledFor),
        processedAt: data.processedAt?.toDate ? data.processedAt.toDate() : data.processedAt,
        succeededAt: data.succeededAt?.toDate ? data.succeededAt.toDate() : data.succeededAt,
        failedAt: data.failedAt?.toDate ? data.failedAt.toDate() : data.failedAt,
        nextRetryAt: data.nextRetryAt?.toDate ? data.nextRetryAt.toDate() : data.nextRetryAt,
        lastAttemptAt: data.lastAttemptAt?.toDate ? data.lastAttemptAt.toDate() : data.lastAttemptAt,
      } as Payment;
    });
  }

  /**
   * Find one payment by ID
   */
  async findOne(paymentId: string): Promise<Payment> {
    const doc = await this.paymentsCollection.doc(paymentId).get();

    if (!doc.exists) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    const data = doc.data() as any;
    return {
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      scheduledFor: data.scheduledFor?.toDate ? data.scheduledFor.toDate() : new Date(data.scheduledFor),
      processedAt: data.processedAt?.toDate ? data.processedAt.toDate() : data.processedAt,
      succeededAt: data.succeededAt?.toDate ? data.succeededAt.toDate() : data.succeededAt,
      failedAt: data.failedAt?.toDate ? data.failedAt.toDate() : data.failedAt,
      nextRetryAt: data.nextRetryAt?.toDate ? data.nextRetryAt.toDate() : data.nextRetryAt,
      lastAttemptAt: data.lastAttemptAt?.toDate ? data.lastAttemptAt.toDate() : data.lastAttemptAt,
    } as Payment;
  }

  /**
   * Get pending retry payments
   */
  async getPendingRetries(): Promise<Payment[]> {
    const now = new Date();

    const snapshot = await this.paymentsCollection
      .where('status', '==', 'failed')
      .where('nextRetryAt', '<=', now)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        scheduledFor: data.scheduledFor?.toDate ? data.scheduledFor.toDate() : new Date(data.scheduledFor),
        nextRetryAt: data.nextRetryAt?.toDate ? data.nextRetryAt.toDate() : data.nextRetryAt,
        lastAttemptAt: data.lastAttemptAt?.toDate ? data.lastAttemptAt.toDate() : data.lastAttemptAt,
      } as Payment;
    });
  }

  /**
   * Get payment statistics
   */
  async getStats(filters?: {
    merchantId?: string;
    loanId?: string;
  }): Promise<{
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    pendingPayments: number;
    totalAmount: number;
    successfulAmount: number;
    failedAmount: number;
  }> {
    const payments = await this.findAll(filters);

    return {
      totalPayments: payments.length,
      successfulPayments: payments.filter((p) => p.status === 'success').length,
      failedPayments: payments.filter((p) => p.status === 'failed').length,
      pendingPayments: payments.filter((p) => p.status === 'pending').length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      successfulAmount: payments.filter((p) => p.status === 'success').reduce((sum, p) => sum + p.amount, 0),
      failedAmount: payments.filter((p) => p.status === 'failed').reduce((sum, p) => sum + p.amount, 0),
    };
  }
}
