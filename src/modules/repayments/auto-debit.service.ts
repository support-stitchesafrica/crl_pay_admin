import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PaystackService } from '../payments/paystack.service';
import { WebhookDeliveryService } from '../webhooks/webhook-delivery.service';
import { RepaymentScheduleItem, Repayment } from '../../entities/repayment.entity';
import { Transaction } from '../../entities/transaction.entity';

@Injectable()
export class AutoDebitService {
  private readonly logger = new Logger(AutoDebitService.name);

  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private configService: ConfigService,
    private webhookDeliveryService: WebhookDeliveryService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async processAutoDebits() {
    try {
      this.logger.log('Starting auto-debit processing...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fetch all pending schedules due today
      const dueSchedulesSnapshot = await this.firestore
        .collection('crl_repayment_schedules')
        .where('status', '==', 'pending')
        .get();

      const dueSchedules = dueSchedulesSnapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            ...data,
            dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate),
          } as RepaymentScheduleItem;
        })
        .filter((schedule) => {
          const dueDate = new Date(schedule.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate <= today;
        });

      if (dueSchedules.length === 0) {
        this.logger.log('No due payments found for auto-debit');
        return;
      }

      this.logger.log(`Found ${dueSchedules.length} due payments for auto-debit`);

      for (const schedule of dueSchedules) {
        try {
          await this.processSchedulePayment(schedule);
        } catch (error) {
          this.logger.error(
            `Failed to process payment for schedule ${schedule.scheduleId}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log('Auto-debit processing completed');
    } catch (error) {
      this.logger.error(`Auto-debit processing failed: ${error.message}`, error.stack);
    }
  }

  private async processSchedulePayment(schedule: RepaymentScheduleItem): Promise<void> {
    try {
      this.logger.log(`Processing payment for schedule: ${schedule.scheduleId}`);

      // Get loan details
      const loanDoc = await this.firestore.collection('crl_loans').doc(schedule.loanId).get();

      if (!loanDoc.exists) {
        this.logger.error(`Loan not found: ${schedule.loanId}`);
        return;
      }

      const loan = loanDoc.data();

      if (!loan?.paystackAuthorizationCode) {
        this.logger.warn(
          `No authorization code for loan ${schedule.loanId}, skipping auto-debit`,
        );
        await this.markScheduleAsFailed(
          schedule,
          'No saved card authorization',
        );
        return;
      }

      // Get customer details
      const customerDoc = await this.firestore
        .collection('crl_customers')
        .doc(schedule.customerId)
        .get();

      if (!customerDoc.exists) {
        this.logger.error(`Customer not found: ${schedule.customerId}`);
        return;
      }

      const customer = customerDoc.data();

      // Get active repayment integration
      const repaymentSettingsDoc = await this.firestore
        .collection('crl_system_settings')
        .doc('repayments')
        .get();

      if (!repaymentSettingsDoc.exists) {
        this.logger.error('Repayment integration not configured');
        return;
      }

      const repaymentSettings = repaymentSettingsDoc.data();
      const integrationDoc = await this.firestore
        .collection('crl_repayment_integrations')
        .doc(repaymentSettings?.activeIntegrationId)
        .get();

      if (!integrationDoc.exists) {
        this.logger.error('Active repayment integration not found');
        return;
      }

      const integration = integrationDoc.data();
      const secretKey = this.configService.get<string>(integration?.secretKeyEnvRef || '');

      if (!secretKey) {
        this.logger.error('Repayment integration secret key not configured');
        return;
      }

      // Calculate amount with late fee if overdue
      const today = new Date();
      const dueDate = new Date(schedule.dueDate);
      let amountToCharge = schedule.totalDue;
      let lateFee = 0;

      if (today > dueDate && schedule.lateFee === 0) {
        // Calculate late fee from loan
        lateFee = this.calculateLateFee(loan, schedule.amount);
        amountToCharge += lateFee;
      }

      // Create Paystack service with integration secret
      const paystackService = PaystackService.createWithSecretKey(secretKey);

      // Charge the card
      const reference = `REPAY_${schedule.scheduleId}_${Date.now()}`;
      const chargeResponse = await paystackService.chargeAuthorization({
        email: customer?.email || '',
        amount: amountToCharge * 100, // Convert to kobo
        authorizationCode: loan.paystackAuthorizationCode,
        reference,
        metadata: {
          loanId: schedule.loanId,
          scheduleId: schedule.scheduleId,
          installmentNumber: schedule.installmentNumber,
          type: 'auto_debit_repayment',
        },
      });

      // Record repayment
      await this.recordSuccessfulRepayment(
        schedule,
        chargeResponse,
        integration,
        lateFee,
      );

      this.logger.log(`Auto-debit successful for schedule: ${schedule.scheduleId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process schedule payment: ${error.message}`,
        error.stack,
      );

      await this.handlePaymentFailure(schedule, error.message);
    }
  }

  private calculateLateFee(loan: any, installmentAmount: number): number {
    const penaltyRate = loan.penaltyRate || 5;
    return Math.ceil((installmentAmount * penaltyRate) / 100);
  }

  private async recordSuccessfulRepayment(
    schedule: RepaymentScheduleItem,
    chargeResponse: any,
    integration: any,
    lateFee: number,
  ): Promise<void> {
    await this.firestore.runTransaction(async (transaction) => {
      const repaymentId = uuidv4();
      const now = new Date();

      // Create repayment record
      const repayment: Repayment = {
        repaymentId,
        loanId: schedule.loanId,
        scheduleId: schedule.scheduleId,
        merchantId: schedule.merchantId,
        customerId: schedule.customerId,
        financierId: schedule.financierId,
        amount: chargeResponse.data.amount / 100,
        method: 'auto_debit',
        status: 'success',
        provider: integration.provider,
        integrationId: integration.integrationId,
        providerReference: chargeResponse.data.reference,
        authorizationCode: chargeResponse.data.authorization.authorization_code,
        feePaidByCustomer: chargeResponse.data.fees / 100,
        metadata: chargeResponse.data,
        createdAt: now,
        updatedAt: now,
      };

      const repaymentRef = this.firestore.collection('crl_repayments').doc(repaymentId);
      transaction.set(repaymentRef, repayment);

      // Update schedule
      const scheduleRef = this.firestore
        .collection('crl_repayment_schedules')
        .doc(schedule.scheduleId);

      transaction.update(scheduleRef, {
        status: 'success',
        paidAmount: repayment.amount,
        paidAt: now,
        repaymentId,
        providerReference: chargeResponse.data.reference,
        lateFee,
        totalDue: schedule.amount + lateFee,
        updatedAt: now,
      });

      // Update loan
      const loanRef = this.firestore.collection('crl_loans').doc(schedule.loanId);
      transaction.update(loanRef, {
        amountPaid: FieldValue.increment(repayment.amount),
        updatedAt: now,
      });

      // Write ledger entry
      const transactionId = uuidv4();
      const ledgerEntry: Transaction = {
        transactionId,
        type: 'REPAYMENT_SUCCESS',
        status: 'success',
        idempotencyKey: `REPAY:${schedule.loanId}:${schedule.scheduleId}`,
        merchantId: schedule.merchantId,
        reference: chargeResponse.data.reference,
        loanId: schedule.loanId,
        financierId: schedule.financierId,
        amount: repayment.amount,
        currency: 'NGN',
        provider: integration.provider,
        integrationId: integration.integrationId,
        providerReference: chargeResponse.data.reference,
        metadata: {
          scheduleId: schedule.scheduleId,
          installmentNumber: schedule.installmentNumber,
          lateFee,
        },
        createdAt: now,
        updatedAt: now,
      };

      const ledgerRef = this.firestore.collection('crl_transactions').doc(transactionId);
      transaction.set(ledgerRef, ledgerEntry);
    });

    // Send webhook notification to merchant
    await this.webhookDeliveryService.publishEvent(
      schedule.merchantId,
      'payment.success',
      {
        loanId: schedule.loanId,
        scheduleId: schedule.scheduleId,
        installmentNumber: schedule.installmentNumber,
        amount: chargeResponse.data.amount / 100,
        reference: chargeResponse.data.reference,
        paidAt: new Date().toISOString(),
      },
    );
  }

  private async handlePaymentFailure(schedule: RepaymentScheduleItem, reason: string): Promise<void> {
    const retryCount = schedule.retryCount + 1;
    const maxRetries = 3;

    if (retryCount >= maxRetries) {
      await this.markScheduleAsFailed(schedule, reason);
    } else {
      // Schedule retry
      const nextRetryAt = new Date();
      nextRetryAt.setHours(nextRetryAt.getHours() + 6); // Retry after 6 hours

      await this.firestore
        .collection('crl_repayment_schedules')
        .doc(schedule.scheduleId)
        .update({
          retryCount,
          lastRetryAt: new Date(),
          nextRetryAt,
          updatedAt: new Date(),
        });

      this.logger.log(
        `Scheduled retry ${retryCount}/${maxRetries} for schedule ${schedule.scheduleId}`,
      );
    }
  }

  private async markScheduleAsFailed(
    schedule: RepaymentScheduleItem,
    reason: string,
  ): Promise<void> {
    await this.firestore
      .collection('crl_repayment_schedules')
      .doc(schedule.scheduleId)
      .update({
        status: 'failed',
        updatedAt: new Date(),
        metadata: {
          ...schedule.metadata,
          failureReason: reason,
        },
      });

    // Send webhook notification
    await this.webhookDeliveryService.publishEvent(
      schedule.merchantId,
      'payment.failed',
      {
        loanId: schedule.loanId,
        scheduleId: schedule.scheduleId,
        installmentNumber: schedule.installmentNumber,
        amount: schedule.totalDue,
        reason,
      },
    );

    this.logger.warn(`Marked schedule ${schedule.scheduleId} as failed: ${reason}`);
  }
}
