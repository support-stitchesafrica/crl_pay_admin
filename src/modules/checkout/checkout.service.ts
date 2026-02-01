import { Injectable, BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Reservation } from '../../entities/reservation.entity';
import { Transaction } from '../../entities/transaction.entity';
import { CheckEligibilityDto, EligibilityResponseDto } from './dto/eligibility.dto';
import { ReserveAllocationDto, ReservationResponseDto } from './dto/reserve.dto';
import { InitiateDisbursementDto, DisbursementResponseDto } from './dto/initiate-disbursement.dto';
import { AllocationsService } from '../allocations/allocations.service';
import { LoansService } from '../loans/loans.service';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private allocationsService: AllocationsService,
    private loansService: LoansService,
  ) {}

  async checkEligibility(
    merchantId: string,
    dto: CheckEligibilityDto,
  ): Promise<EligibilityResponseDto> {
    try {
      this.logger.log(`Checking eligibility for merchant: ${merchantId}, customer: ${dto.customerId}, amount: ${dto.amount}`);

      // 1. Get merchant's active allocation
      const allocation = await this.allocationsService.findByMerchant(merchantId);
      
      if (!allocation) {
        return {
          eligible: false,
          reason: 'Merchant has no active allocation',
        };
      }

      // 2. Check allocation eligibility
      const allocationCheck = await this.allocationsService.checkEligibility(
        allocation.allocationId,
        dto.amount
      );
      
      if (!allocationCheck.eligible) {
        return {
          eligible: false,
          reason: allocationCheck.reason,
        };
      }

      // 3. Verify customer exists (if customerId provided)
      if (!dto.customerId) {
        return {
          eligible: false,
          reason: 'Customer ID is required',
        };
      }

      const customerDoc = await this.firestore
        .collection('crl_customers')
        .doc(dto.customerId)
        .get();

      if (!customerDoc.exists) {
        return {
          eligible: false,
          reason: 'Customer not found',
        };
      }

      const customer = customerDoc.data();

      // 4. Check customer status
      if (customer?.status === 'blacklisted') {
        return {
          eligible: false,
          reason: 'Customer is blacklisted',
        };
      }

      if (customer?.status === 'suspended') {
        return {
          eligible: false,
          reason: 'Customer account is suspended',
        };
      }

      // 5. Check for active overdue loans
      const overdueLoansSnapshot = await this.firestore
        .collection('crl_loans')
        .where('customerId', '==', dto.customerId)
        .where('status', '==', 'overdue')
        .get();

      if (!overdueLoansSnapshot.empty) {
        return {
          eligible: false,
          reason: 'Customer has overdue loans',
        };
      }

      this.logger.log(`Eligibility check passed for customer ${dto.customerId}`);

      return {
        eligible: true,
        allocationId: allocation.allocationId,
      };
    } catch (error) {
      this.logger.error(`Eligibility check failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async reserveAllocation(
    merchantId: string,
    dto: ReserveAllocationDto,
  ): Promise<ReservationResponseDto> {
    try {
      this.logger.log(
        `Reserving credit for merchant: ${merchantId}, customer: ${dto.customerId}, amount: ${dto.amount}, reference: ${dto.reference}`,
      );

      const idempotencyKey = `RESERVE:${merchantId}:${dto.reference}`;
      this.logger.log(`Idempotency key: ${idempotencyKey}`);

      const existingReservation = await this.firestore
        .collection('crl_reservations')
        .where('idempotencyKey', '==', idempotencyKey)
        .limit(1)
        .get();

      if (!existingReservation.empty) {
        const existing = existingReservation.docs[0].data() as Reservation;
        this.logger.log(`Found existing reservation: ${existing.reservationId}, status: ${existing.status}, expires: ${existing.expiresAt}`);
        this.logger.log(`Returning existing reservation instead of creating new one`);
        return this.mapToReservationResponse(existing);
      }

      this.logger.log(`No existing reservation found, creating new one...`);

      const eligibility = await this.checkEligibility(merchantId, { 
        amount: dto.amount,
        customerId: dto.customerId 
      });

      if (!eligibility.eligible || !eligibility.allocationId) {
        throw new BadRequestException(
          eligibility.reason || 'Customer not eligible for credit',
        );
      }

      await this.allocationsService.reserveAmount(eligibility.allocationId, dto.amount);

      const reservationId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

      const reservation: Reservation = {
        reservationId,
        idempotencyKey,
        merchantId,
        customerId: dto.customerId,
        reference: dto.reference,
        allocationId: eligibility.allocationId,
        amount: dto.amount,
        currency: 'NGN',
        creditTier: dto.creditTier,
        status: 'active',
        expiresAt,
        createdAt: now,
        updatedAt: now,
      };

      await this.firestore
        .collection('crl_reservations')
        .doc(reservationId)
        .set(reservation);

      const transactionId = uuidv4();
      const ledgerEntry: Transaction = {
        transactionId,
        type: 'CREDIT_RESERVED',
        status: 'success',
        idempotencyKey,
        merchantId,
        customerId: dto.customerId,
        reference: dto.reference,
        allocationId: eligibility.allocationId,
        reservationId,
        amount: dto.amount,
        currency: 'NGN',
        provider: 'internal',
        createdAt: now,
        updatedAt: now,
      };

      await this.firestore.collection('crl_transactions').doc(transactionId).set(ledgerEntry);

      this.logger.log(`✅ New reservation created successfully: ${reservation.reservationId}, expires: ${reservation.expiresAt}`);

      return this.mapToReservationResponse(reservation);
    } catch (error) {
      this.logger.error(`Failed to reserve credit: ${error.message}`, error.stack);
      throw error;
    }
  }

  async initiateDisbursement(
    merchantId: string,
    dto: InitiateDisbursementDto,
  ): Promise<DisbursementResponseDto> {
    try {
      this.logger.log(
        `Initiating disbursement for merchant: ${merchantId}, reservation: ${dto.reservationId}, reference: ${dto.reference}`,
      );

      // 1. Get and validate reservation
      const reservationDoc = await this.firestore
        .collection('crl_reservations')
        .doc(dto.reservationId)
        .get();

      if (!reservationDoc.exists) {
        this.logger.error(`Reservation not found: ${dto.reservationId}`);
        throw new NotFoundException('Reservation not found');
      }

      const reservation = reservationDoc.data() as Reservation;
      const now = new Date();
      const expiresAt = (reservation.expiresAt as any)?.toDate ? (reservation.expiresAt as any).toDate() : new Date(reservation.expiresAt);
      
      this.logger.log(`Reservation details - ID: ${dto.reservationId}, Status: ${reservation.status}, Created: ${reservation.createdAt}, Expires: ${expiresAt}, Now: ${now}`);

      if (reservation.status !== 'active') {
        this.logger.error(`Reservation status is ${reservation.status}, expected active`);
        throw new BadRequestException(`Reservation is ${reservation.status}`);
      }

      if (now > expiresAt) {
        this.logger.error(`Reservation expired - Expires: ${expiresAt}, Now: ${now}, Diff: ${(now.getTime() - expiresAt.getTime()) / 1000}s`);
        throw new BadRequestException('Reservation has expired');
      }

      this.logger.log(`Reservation validation passed`);

      if (reservation.merchantId !== merchantId) {
        throw new BadRequestException('Reservation does not belong to this merchant');
      }

      // 2. Get allocation to retrieve terms
      const allocation = await this.allocationsService.findOne(reservation.allocationId);

      if (!allocation) {
        throw new NotFoundException('Allocation not found');
      }

      // 3. Create loan using LoansService
      const loan = await this.loansService.create({
        merchantId,
        customerId: dto.customerId,
        principalAmount: reservation.amount,
        creditTier: reservation.creditTier,
        frequency: 'monthly',
        tenor: {
          value: allocation.terms.tenure,
          period: allocation.terms.tenurePeriod.toUpperCase() as any,
        },
        orderId: dto.reference,
        productDescription: 'BNPL Purchase',
        metadata: {
          reservationId: dto.reservationId,
          checkoutReference: dto.reference,
        },
      });

      // 4. Mark reservation as completed
      await this.firestore
        .collection('crl_reservations')
        .doc(dto.reservationId)
        .update({
          status: 'completed',
          loanId: loan.loanId,
          updatedAt: new Date(),
        });

      this.logger.log(`Disbursement completed successfully: ${loan.loanId}`);

      return {
        loanId: loan.loanId,
        loanAccountNumber: loan.loanAccountNumber,
        status: loan.status,
        disbursementReference: dto.reference,
      };
    } catch (error) {
      this.logger.error(`Failed to initiate disbursement: ${error.message}`, error.stack);
      throw error;
    }
  }

  private mapToReservationResponse(reservation: Reservation): ReservationResponseDto {
    return {
      reservationId: reservation.reservationId,
      merchantId: reservation.merchantId,
      customerId: reservation.customerId,
      reference: reservation.reference,
      allocationId: reservation.allocationId || '',
      amount: reservation.amount,
      currency: reservation.currency,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
    };
  }
}
