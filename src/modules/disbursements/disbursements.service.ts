import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { v4 as uuidv4 } from 'uuid';
import { PaystackService } from '../payments/paystack.service';
import { Disbursement } from '../../entities/disbursement.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Reservation } from '../../entities/reservation.entity';
import { Loan } from '../../entities/loan.entity';
import { InitiateDisbursementDto, DisbursementResponseDto } from './dto/initiate-disbursement.dto';

@Injectable()
export class DisbursementsService {
  private readonly logger = new Logger(DisbursementsService.name);

  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private configService: ConfigService,
  ) {}

  async initiateDisbursement(
    merchantId: string,
    dto: InitiateDisbursementDto,
  ): Promise<DisbursementResponseDto> {
    try {
      this.logger.log(
        `Initiating disbursement for merchant: ${merchantId}, reference: ${dto.reference}`,
      );

      const idempotencyKey = `DISBURSE:${merchantId}:${dto.reference}`;

      const existingDisbursement = await this.firestore
        .collection('crl_disbursements')
        .where('idempotencyKey', '==', idempotencyKey)
        .limit(1)
        .get();

      if (!existingDisbursement.empty) {
        const existing = existingDisbursement.docs[0].data() as Disbursement;
        this.logger.log(`Returning existing disbursement: ${existing.disbursementId}`);
        
        // Find the associated loan
        const loanSnapshot = await this.firestore
          .collection('crl_loans')
          .where('disbursementId', '==', existing.disbursementId)
          .limit(1)
          .get();
        
        const loan = loanSnapshot.empty ? null : loanSnapshot.docs[0].data();
        
        return {
          disbursementId: existing.disbursementId,
          loanId: loan?.loanId || '',
          loanAccountNumber: loan?.loanAccountNumber || '',
          status: existing.status,
          providerReference: existing.providerReference,
          message: 'Disbursement already initiated',
        };
      }

      const reservationDoc = await this.firestore
        .collection('crl_reservations')
        .doc(dto.reservationId)
        .get();

      if (!reservationDoc.exists) {
        throw new NotFoundException('Reservation not found');
      }

      const reservation = reservationDoc.data() as Reservation;

      if (reservation.status !== 'active') {
        throw new BadRequestException(`Reservation status is ${reservation.status}, expected active`);
      }

      if (reservation.merchantId !== merchantId) {
        throw new BadRequestException('Reservation does not belong to this merchant');
      }

      const merchantDoc = await this.firestore
        .collection('crl_merchants')
        .doc(merchantId)
        .get();

      if (!merchantDoc.exists) {
        throw new NotFoundException('Merchant not found');
      }

      const merchant = merchantDoc.data();

      if (!merchant) {
        throw new NotFoundException('Merchant data not found');
      }

      this.logger.log(`Merchant found: ${merchant.businessName}`);
      this.logger.log(`Settlement account: ${JSON.stringify(merchant.settlementAccount || {})}`);

      if (!merchant?.settlementAccount?.accountNumber) {
        throw new BadRequestException('Merchant settlement account not configured');
      }

      const payoutSettingsDoc = await this.firestore
        .collection('crl_system_settings')
        .doc('payout')
        .get();

      if (!payoutSettingsDoc.exists) {
        throw new BadRequestException('Payout integration not configured');
      }

      const payoutSettings = payoutSettingsDoc.data();

      if (!payoutSettings?.activeIntegrationId) {
        throw new BadRequestException('No active payout integration');
      }

      const integrationDoc = await this.firestore
        .collection('crl_payout_integrations')
        .doc(payoutSettings.activeIntegrationId)
        .get();

      if (!integrationDoc.exists) {
        throw new BadRequestException('Active payout integration not found');
      }

      const integration = integrationDoc.data();

      if (integration?.status !== 'active') {
        throw new BadRequestException('Payout integration is not active');
      }

      const secretKey = this.configService.get<string>(integration.secretKeyEnvRef);

      if (!secretKey) {
        throw new BadRequestException(
          `Secret key not found in environment: ${integration.secretKeyEnvRef}`,
        );
      }

      const paystackService = PaystackService.createWithSecretKey(secretKey);

      let recipientCode = merchant.settlementAccount.paystackRecipientCode;

      if (!recipientCode) {
        this.logger.log('Creating Paystack transfer recipient for merchant');
        this.logger.log(`Creating transfer recipient: ${merchant.businessName} - ${merchant.settlementAccount.accountNumber}`);
        this.logger.log(`Bank code: ${merchant.settlementAccount.bankCode}, Account: ${merchant.settlementAccount.accountNumber}`);
        
        try {
          const recipientResponse = await paystackService.createTransferRecipient({
            type: 'nuban',
            name: merchant.businessName,
            account_number: merchant.settlementAccount.accountNumber,
            bank_code: merchant.settlementAccount.bankCode,
            currency: 'NGN',
          });
          
          this.logger.log(`Paystack recipient response: ${JSON.stringify(recipientResponse.data)}`);

          recipientCode = recipientResponse.data.recipient_code;

          await this.firestore
            .collection('crl_merchants')
            .doc(merchantId)
            .update({
              'settlementAccount.paystackRecipientCode': recipientCode,
              updatedAt: new Date(),
            });

          this.logger.log(`Recipient created: ${recipientCode}`);
        } catch (error) {
          this.logger.error(`Failed to create transfer recipient: ${error.message}`);
          this.logger.error(`Error details: ${JSON.stringify(error.response?.data || error)}`);
          throw new BadRequestException(error.response?.data?.message || error.message);
        }
      } else {
        this.logger.log(`Using existing recipient code: ${recipientCode}`);
      }

      this.logger.log(`Initiating transfer: ₦${reservation.amount / 100} to recipient ${recipientCode}`);
      
      const transferResponse = await paystackService.initiateTransfer({
        source: 'balance',
        amount: reservation.amount,
        recipient: recipientCode,
        reference: dto.reference,
        reason: `Disbursement for order ${dto.reference}`,
      });

      const disbursementId = uuidv4();
      const now = new Date();

      const disbursement: Disbursement = {
        disbursementId,
        idempotencyKey,
        merchantId,
        reference: dto.reference,
        reservationId: dto.reservationId,
        mappingId: reservation.mappingId,
        planId: reservation.planId,
        financierId: reservation.financierId,
        amount: reservation.amount,
        currency: 'NGN',
        provider: integration.provider,
        integrationId: integration.integrationId,
        mode: integration.mode,
        providerRecipientCode: recipientCode,
        providerReference: transferResponse.data.transfer_code,
        status: 'initiated',
        createdAt: now,
        updatedAt: now,
      };

      await this.firestore.collection('crl_disbursements').doc(disbursementId).set(disbursement);

      const transactionId = uuidv4();
      const ledgerEntry: Transaction = {
        transactionId,
        type: 'DISBURSEMENT_INITIATED',
        status: 'pending',
        idempotencyKey,
        merchantId,
        reference: dto.reference,
        mappingId: reservation.mappingId,
        planId: reservation.planId,
        financierId: reservation.financierId,
        reservationId: dto.reservationId,
        disbursementId,
        amount: reservation.amount,
        currency: 'NGN',
        provider: integration.provider,
        integrationId: integration.integrationId,
        providerReference: transferResponse.data.transfer_code,
        createdAt: now,
        updatedAt: now,
      };

      await this.firestore.collection('crl_transactions').doc(transactionId).set(ledgerEntry);

      // Create loan immediately after successful disbursement initiation
      const loanId = uuidv4();
      const loanAccountNumber = `LOAN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      
      // Create basic loan configuration (will be updated with actual plan details via webhook/background job)
      const loan: Loan = {
        loanId,
        loanAccountNumber,
        customerId: dto.customerId,
        merchantId,
        principalAmount: reservation.amount,
        configuration: {
          frequency: 'monthly',
          tenor: { value: 3, period: 'MONTHS' },
          numberOfInstallments: 3,
          interestRate: 0,
          penaltyRate: 5,
          installmentAmount: Math.ceil(reservation.amount / 3),
          totalInterest: 0,
          totalAmount: reservation.amount,
        },
        paymentSchedule: [], // Will be populated after plan details are fetched
        status: 'active',
        currentInstallment: 0,
        amountPaid: 0,
        amountRemaining: reservation.amount,
        metadata: {
          reservationId: dto.reservationId,
          disbursementId,
          disbursementReference: transferResponse.data.transfer_code,
          planId: reservation.planId,
          mappingId: reservation.mappingId,
          financierId: reservation.financierId,
        },
        orderId: dto.reference,
        createdAt: now,
        updatedAt: now,
        activatedAt: now,
      };

      await this.firestore.collection('crl_loans').doc(loanId).set(loan);

      // Create LOAN_CREATED transaction
      const loanTransactionId = uuidv4();
      const loanLedgerEntry: Transaction = {
        transactionId: loanTransactionId,
        type: 'LOAN_CREATED',
        status: 'success',
        idempotencyKey: `${idempotencyKey}:LOAN`,
        merchantId,
        loanId,
        reference: dto.reference,
        mappingId: reservation.mappingId,
        planId: reservation.planId,
        financierId: reservation.financierId,
        reservationId: dto.reservationId,
        disbursementId,
        amount: reservation.amount,
        currency: 'NGN',
        provider: integration.provider,
        integrationId: integration.integrationId,
        providerReference: transferResponse.data.transfer_code,
        createdAt: now,
        updatedAt: now,
      };

      await this.firestore.collection('crl_transactions').doc(loanTransactionId).set(loanLedgerEntry);

      this.logger.log(
        `Disbursement initiated successfully: ${disbursementId}, transfer: ${transferResponse.data.transfer_code}, loan: ${loanId}`,
      );

      return {
        disbursementId,
        loanId,
        loanAccountNumber,
        status: 'initiated',
        providerReference: transferResponse.data.transfer_code,
        message: 'Disbursement initiated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to initiate disbursement: ${error.message}`, error.stack);
      throw error;
    }
  }

  async finalizeDisbursementSuccess(
    disbursementId: string,
    providerData: any,
  ): Promise<void> {
    this.logger.log(`Finalizing disbursement success: ${disbursementId}`);

    await this.firestore.runTransaction(async (transaction) => {
      const disbursementRef = this.firestore
        .collection('crl_disbursements')
        .doc(disbursementId);

      const disbursementDoc = await transaction.get(disbursementRef);

      if (!disbursementDoc.exists) {
        throw new NotFoundException('Disbursement not found');
      }

      const disbursement = disbursementDoc.data() as Disbursement;

      if (disbursement.status === 'success') {
        this.logger.log('Disbursement already finalized as success');
        return;
      }

      transaction.update(disbursementRef, {
        status: 'success',
        updatedAt: new Date(),
      });

      const reservationRef = this.firestore
        .collection('crl_reservations')
        .doc(disbursement.reservationId);

      transaction.update(reservationRef, {
        status: 'consumed',
        updatedAt: new Date(),
      });

      const mappingRef = this.firestore
        .collection('crl_plan_merchant_mappings')
        .doc(disbursement.mappingId);

      transaction.update(mappingRef, {
        totalDisbursed: FieldValue.increment(disbursement.amount),
        totalLoans: FieldValue.increment(1),
        updatedAt: new Date(),
      });

      const transactionId = uuidv4();
      const now = new Date();
      const ledgerEntry: Transaction = {
        transactionId,
        type: 'DISBURSEMENT_SUCCESS',
        status: 'success',
        idempotencyKey: `${disbursement.idempotencyKey}:SUCCESS`,
        merchantId: disbursement.merchantId,
        reference: disbursement.reference,
        mappingId: disbursement.mappingId,
        planId: disbursement.planId,
        financierId: disbursement.financierId,
        reservationId: disbursement.reservationId,
        disbursementId,
        amount: disbursement.amount,
        currency: disbursement.currency,
        provider: disbursement.provider,
        integrationId: disbursement.integrationId,
        providerReference: disbursement.providerReference,
        metadata: providerData,
        createdAt: now,
        updatedAt: now,
      };

      const ledgerRef = this.firestore.collection('crl_transactions').doc(transactionId);
      transaction.set(ledgerRef, ledgerEntry);
    });

    this.logger.log(`Disbursement finalized successfully: ${disbursementId}`);
  }

  async finalizeDisbursementFailure(
    disbursementId: string,
    failureReason: string,
    providerData: any,
  ): Promise<void> {
    this.logger.log(`Finalizing disbursement failure: ${disbursementId}`);

    await this.firestore.runTransaction(async (transaction) => {
      const disbursementRef = this.firestore
        .collection('crl_disbursements')
        .doc(disbursementId);

      const disbursementDoc = await transaction.get(disbursementRef);

      if (!disbursementDoc.exists) {
        throw new NotFoundException('Disbursement not found');
      }

      const disbursement = disbursementDoc.data() as Disbursement;

      if (disbursement.status === 'failed') {
        this.logger.log('Disbursement already finalized as failed');
        return;
      }

      transaction.update(disbursementRef, {
        status: 'failed',
        failureReason,
        updatedAt: new Date(),
      });

      const reservationRef = this.firestore
        .collection('crl_reservations')
        .doc(disbursement.reservationId);

      transaction.update(reservationRef, {
        status: 'released',
        updatedAt: new Date(),
      });

      const mappingRef = this.firestore
        .collection('crl_plan_merchant_mappings')
        .doc(disbursement.mappingId);

      transaction.update(mappingRef, {
        currentAllocation: FieldValue.increment(-disbursement.amount),
        updatedAt: new Date(),
      });

      const transactionId = uuidv4();
      const now = new Date();
      const ledgerEntry: Transaction = {
        transactionId,
        type: 'DISBURSEMENT_FAILED',
        status: 'failed',
        idempotencyKey: `${disbursement.idempotencyKey}:FAILED`,
        merchantId: disbursement.merchantId,
        reference: disbursement.reference,
        mappingId: disbursement.mappingId,
        planId: disbursement.planId,
        financierId: disbursement.financierId,
        reservationId: disbursement.reservationId,
        disbursementId,
        amount: disbursement.amount,
        currency: disbursement.currency,
        provider: disbursement.provider,
        integrationId: disbursement.integrationId,
        providerReference: disbursement.providerReference,
        metadata: { ...providerData, failureReason },
        createdAt: now,
        updatedAt: now,
      };

      const ledgerRef = this.firestore.collection('crl_transactions').doc(transactionId);
      transaction.set(ledgerRef, ledgerEntry);

      const releaseTransactionId = uuidv4();
      const releaseLedgerEntry: Transaction = {
        transactionId: releaseTransactionId,
        type: 'ALLOCATION_RELEASED',
        status: 'success',
        idempotencyKey: `${disbursement.idempotencyKey}:RELEASE`,
        merchantId: disbursement.merchantId,
        reference: disbursement.reference,
        mappingId: disbursement.mappingId,
        planId: disbursement.planId,
        financierId: disbursement.financierId,
        reservationId: disbursement.reservationId,
        disbursementId,
        amount: disbursement.amount,
        currency: disbursement.currency,
        provider: 'internal',
        createdAt: now,
        updatedAt: now,
      };

      const releaseRef = this.firestore.collection('crl_transactions').doc(releaseTransactionId);
      transaction.set(releaseRef, releaseLedgerEntry);
    });

    this.logger.log(`Disbursement finalized as failed: ${disbursementId}`);
  }
}
