import { Injectable, BadRequestException, Logger, Inject } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { ConfigService } from '@nestjs/config';
import { PaystackService } from '../payments/paystack.service';
import { DisbursementsService } from '../disbursements/disbursements.service';
import { LoansService } from '../loans/loans.service';
import { WebhookDeliveryService } from '../webhooks/webhook-delivery.service';
import { RepaymentScheduleService } from '../repayments/repayment-schedule.service';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from '../../entities/transaction.entity';

@Injectable()
export class ProviderWebhooksService {
  private readonly logger = new Logger(ProviderWebhooksService.name);

  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private configService: ConfigService,
    private disbursementsService: DisbursementsService,
    private loansService: LoansService,
    private webhookDeliveryService: WebhookDeliveryService,
    private repaymentScheduleService: RepaymentScheduleService,
  ) {}

  async handlePaystackWebhook(rawBody: string, signature: string, payload: any): Promise<void> {
    try {
      this.logger.log(`Received Paystack webhook: ${payload.event}`);

      const payoutSettingsDoc = await this.firestore
        .collection('crl_system_settings')
        .doc('payout')
        .get();

      if (!payoutSettingsDoc.exists) {
        throw new BadRequestException('Payout settings not configured');
      }

      const payoutSettings = payoutSettingsDoc.data();
      const integrationDoc = await this.firestore
        .collection('crl_payout_integrations')
        .doc(payoutSettings?.activeIntegrationId)
        .get();

      if (!integrationDoc.exists) {
        throw new BadRequestException('Active payout integration not found');
      }

      const integration = integrationDoc.data();
      const secretKey = this.configService.get<string>(integration?.secretKeyEnvRef || '');

      if (!secretKey) {
        throw new BadRequestException('Secret key not configured');
      }

      const paystackService = PaystackService.createWithSecretKey(secretKey);
      const isValid = paystackService.verifyWebhookSignature(rawBody, signature);

      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }

      if (payload.event === 'transfer.success') {
        await this.handleTransferSuccess(payload.data);
      } else if (payload.event === 'transfer.failed') {
        await this.handleTransferFailed(payload.data);
      } else if (payload.event === 'transfer.reversed') {
        await this.handleTransferFailed(payload.data);
      } else {
        this.logger.log(`Unhandled Paystack event: ${payload.event}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle Paystack webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleTransferSuccess(transferData: any): Promise<void> {
    try {
      this.logger.log(`Handling transfer success: ${transferData.reference}`);

      const disbursementSnapshot = await this.firestore
        .collection('crl_disbursements')
        .where('reference', '==', transferData.reference)
        .limit(1)
        .get();

      if (disbursementSnapshot.empty) {
        this.logger.warn(`Disbursement not found for reference: ${transferData.reference}`);
        return;
      }

      const disbursementDoc = disbursementSnapshot.docs[0];
      const disbursement = disbursementDoc.data();

      if (disbursement.status === 'success') {
        this.logger.log('Disbursement already marked as success');
        return;
      }

      await this.disbursementsService.finalizeDisbursementSuccess(
        disbursement.disbursementId,
        transferData,
      );

      const reservationDoc = await this.firestore
        .collection('crl_reservations')
        .doc(disbursement.reservationId)
        .get();

      if (!reservationDoc.exists) {
        this.logger.error('Reservation not found for disbursement');
        return;
      }

      const reservation = reservationDoc.data();

      const customerDoc = await this.firestore
        .collection('crl_customers')
        .where('merchantId', '==', disbursement.merchantId)
        .where('reference', '==', disbursement.reference)
        .limit(1)
        .get();

      let customerId = '';
      if (!customerDoc.empty) {
        customerId = customerDoc.docs[0].id;
      }

      const mappingDoc = await this.firestore
        .collection('crl_plan_merchant_mappings')
        .doc(disbursement.mappingId)
        .get();

      if (!mappingDoc.exists) {
        this.logger.error('Mapping not found for disbursement');
        return;
      }

      const mapping = mappingDoc.data();

      const planDoc = await this.firestore
        .collection('crl_financing_plans')
        .doc(disbursement.planId || '')
        .get();

      const plan = planDoc.exists ? planDoc.data() : null;

      const loan = await this.loansService.create(
        {
          merchantId: disbursement.merchantId,
          customerId,
          principalAmount: disbursement.amount,
          frequency: plan?.repaymentFrequency || 'monthly',
          tenor: plan?.tenor || { value: 6, period: 'MONTHS' },
          orderId: disbursement.reference,
          productDescription: `Order ${disbursement.reference}`,
          metadata: {
            mappingId: disbursement.mappingId,
            planId: disbursement.planId,
            financierId: disbursement.financierId,
            disbursementId: disbursement.disbursementId,
            reservationId: disbursement.reservationId,
          },
        },
        mapping?.interestRate || plan?.interestRate || 15,
        mapping?.penaltyRate || plan?.penaltyRate || 5,
      );

      const transactionId = uuidv4();
      const now = new Date();
      const ledgerEntry: Transaction = {
        transactionId,
        type: 'LOAN_CREATED',
        status: 'success',
        idempotencyKey: `LOAN:${disbursement.merchantId}:${disbursement.reference}`,
        merchantId: disbursement.merchantId,
        reference: disbursement.reference,
        mappingId: disbursement.mappingId,
        planId: disbursement.planId,
        financierId: disbursement.financierId,
        reservationId: disbursement.reservationId,
        disbursementId: disbursement.disbursementId,
        loanId: loan.loanId,
        amount: disbursement.amount,
        currency: disbursement.currency,
        provider: 'internal',
        createdAt: now,
        updatedAt: now,
      };

      await this.firestore.collection('crl_transactions').doc(transactionId).set(ledgerEntry);

      // Generate repayment schedule for the loan
      try {
        await this.repaymentScheduleService.generateScheduleForLoan(loan);
        this.logger.log(`Repayment schedule generated for loan ${loan.loanId}`);
      } catch (scheduleError) {
        this.logger.error(
          `Failed to generate repayment schedule for loan ${loan.loanId}: ${scheduleError.message}`,
          scheduleError.stack,
        );
      }

      await this.webhookDeliveryService.publishEvent(
        disbursement.merchantId,
        'CRLPAY_DISBURSEMENT_SUCCESS',
        {
          reference: disbursement.reference,
          loanId: loan.loanId,
          amount: disbursement.amount,
          currency: disbursement.currency,
          mappingId: disbursement.mappingId,
          planId: disbursement.planId,
          financierId: disbursement.financierId,
          providerReference: disbursement.providerReference,
          transferredAt: transferData.transferred_at,
        },
      );

      this.logger.log(
        `Transfer success handled: loan ${loan.loanId} created, schedule generated, webhook published`,
      );
    } catch (error) {
      this.logger.error(`Failed to handle transfer success: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleTransferFailed(transferData: any): Promise<void> {
    try {
      this.logger.log(`Handling transfer failure: ${transferData.reference}`);

      const disbursementSnapshot = await this.firestore
        .collection('crl_disbursements')
        .where('reference', '==', transferData.reference)
        .limit(1)
        .get();

      if (disbursementSnapshot.empty) {
        this.logger.warn(`Disbursement not found for reference: ${transferData.reference}`);
        return;
      }

      const disbursementDoc = disbursementSnapshot.docs[0];
      const disbursement = disbursementDoc.data();

      if (disbursement.status === 'failed') {
        this.logger.log('Disbursement already marked as failed');
        return;
      }

      const failureReason = transferData.status || 'Transfer failed';

      await this.disbursementsService.finalizeDisbursementFailure(
        disbursement.disbursementId,
        failureReason,
        transferData,
      );

      await this.webhookDeliveryService.publishEvent(
        disbursement.merchantId,
        'CRLPAY_DISBURSEMENT_FAILED',
        {
          reference: disbursement.reference,
          amount: disbursement.amount,
          currency: disbursement.currency,
          mappingId: disbursement.mappingId,
          planId: disbursement.planId,
          financierId: disbursement.financierId,
          providerReference: disbursement.providerReference,
          failureReason,
        },
      );

      this.logger.log(`Transfer failure handled: allocation released, webhook published`);
    } catch (error) {
      this.logger.error(`Failed to handle transfer failure: ${error.message}`, error.stack);
      throw error;
    }
  }
}
