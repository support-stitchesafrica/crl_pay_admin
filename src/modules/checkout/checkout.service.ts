import { Injectable, BadRequestException, Inject, Logger } from '@nestjs/common';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Reservation } from '../../entities/reservation.entity';
import { Transaction } from '../../entities/transaction.entity';
import { CheckEligibilityDto, EligibilityResponseDto } from './dto/eligibility.dto';
import { ReserveAllocationDto, ReservationResponseDto } from './dto/reserve.dto';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(@Inject('FIRESTORE') private firestore: Firestore) {}

  async checkEligibility(
    merchantId: string,
    dto: CheckEligibilityDto,
  ): Promise<EligibilityResponseDto> {
    try {
      this.logger.log(`Checking eligibility for merchant: ${merchantId}, amount: ${dto.amount}`);

      const merchantDoc = await this.firestore
        .collection('crl_merchants')
        .doc(merchantId)
        .get();

      if (!merchantDoc.exists) {
        return {
          eligible: false,
          reason: 'Merchant not found',
        };
      }

      const merchant = merchantDoc.data();

      if (!merchant?.settlementAccount?.accountNumber) {
        return {
          eligible: false,
          reason: 'Merchant settlement account not configured',
        };
      }

      const mappingsSnapshot = await this.firestore
        .collection('crl_plan_merchant_mappings')
        .where('merchantId', '==', merchantId)
        .where('status', '==', 'active')
        .get();

      if (mappingsSnapshot.empty) {
        return {
          eligible: false,
          reason: 'No active financing plans available',
        };
      }

      const now = new Date();
      const eligibleMappings: Array<{
        mappingId: string;
        planId: string;
        financierId: string;
        remainingAllocation: number;
        expirationDate: Date;
      }> = [];

      for (const doc of mappingsSnapshot.docs) {
        const mapping = doc.data();
        const expirationDate = mapping.expirationDate?.toDate
          ? mapping.expirationDate.toDate()
          : new Date(mapping.expirationDate);

        if (expirationDate > now) {
          const remainingAllocation =
            (mapping.fundsAllocated || 0) - (mapping.currentAllocation || 0);

          if (remainingAllocation >= dto.amount) {
            eligibleMappings.push({
              mappingId: doc.id,
              planId: mapping.planId,
              financierId: mapping.financierId,
              remainingAllocation,
              expirationDate,
            });
          }
        }
      }

      if (eligibleMappings.length === 0) {
        return {
          eligible: false,
          reason: 'Insufficient allocation available',
        };
      }

      eligibleMappings.sort((a, b) => b.remainingAllocation - a.remainingAllocation);

      this.logger.log(
        `Eligibility check passed: ${eligibleMappings.length} eligible mappings found`,
      );

      return {
        eligible: true,
        eligibleMappings,
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
        `Reserving allocation for merchant: ${merchantId}, reference: ${dto.reference}, amount: ${dto.amount}`,
      );

      const idempotencyKey = `RESERVE:${merchantId}:${dto.reference}`;

      const existingReservation = await this.firestore
        .collection('crl_reservations')
        .where('idempotencyKey', '==', idempotencyKey)
        .limit(1)
        .get();

      if (!existingReservation.empty) {
        const existing = existingReservation.docs[0].data() as Reservation;
        this.logger.log(`Returning existing reservation: ${existing.reservationId}`);
        return this.mapToReservationResponse(existing);
      }

      const eligibility = await this.checkEligibility(merchantId, { amount: dto.amount });

      if (!eligibility.eligible || !eligibility.eligibleMappings?.length) {
        throw new BadRequestException(
          eligibility.reason || 'No eligible financing plans available',
        );
      }

      const selectedMapping = eligibility.eligibleMappings[0];

      const reservation = await this.firestore.runTransaction(async (transaction) => {
        const mappingRef = this.firestore
          .collection('crl_plan_merchant_mappings')
          .doc(selectedMapping.mappingId);

        const mappingDoc = await transaction.get(mappingRef);

        if (!mappingDoc.exists) {
          throw new BadRequestException('Selected mapping not found');
        }

        const mapping = mappingDoc.data();
        
        if (!mapping) {
          throw new BadRequestException('Mapping data not found');
        }

        const remainingAllocation =
          (mapping.fundsAllocated || 0) - (mapping.currentAllocation || 0);

        if (remainingAllocation < dto.amount) {
          throw new BadRequestException('Insufficient allocation available');
        }

        transaction.update(mappingRef, {
          currentAllocation: FieldValue.increment(dto.amount),
          updatedAt: new Date(),
        });

        const reservationId = uuidv4();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

        const reservation: Reservation = {
          reservationId,
          idempotencyKey,
          merchantId,
          reference: dto.reference,
          mappingId: selectedMapping.mappingId,
          planId: selectedMapping.planId,
          financierId: selectedMapping.financierId,
          amount: dto.amount,
          currency: 'NGN',
          status: 'active',
          expiresAt,
          createdAt: now,
          updatedAt: now,
        };

        const reservationRef = this.firestore
          .collection('crl_reservations')
          .doc(reservationId);
        transaction.set(reservationRef, reservation);

        const transactionId = uuidv4();
        const ledgerEntry: Transaction = {
          transactionId,
          type: 'ALLOCATION_RESERVED',
          status: 'success',
          idempotencyKey,
          merchantId,
          reference: dto.reference,
          mappingId: selectedMapping.mappingId,
          planId: selectedMapping.planId,
          financierId: selectedMapping.financierId,
          reservationId,
          amount: dto.amount,
          currency: 'NGN',
          provider: 'internal',
          createdAt: now,
          updatedAt: now,
        };

        const ledgerRef = this.firestore.collection('crl_transactions').doc(transactionId);
        transaction.set(ledgerRef, ledgerEntry);

        return reservation;
      });

      this.logger.log(`Reservation created successfully: ${reservation.reservationId}`);

      return this.mapToReservationResponse(reservation);
    } catch (error) {
      this.logger.error(`Failed to reserve allocation: ${error.message}`, error.stack);
      throw error;
    }
  }

  private mapToReservationResponse(reservation: Reservation): ReservationResponseDto {
    return {
      reservationId: reservation.reservationId,
      merchantId: reservation.merchantId,
      reference: reservation.reference,
      mappingId: reservation.mappingId,
      planId: reservation.planId || '',
      financierId: reservation.financierId || '',
      amount: reservation.amount,
      currency: reservation.currency,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
    };
  }
}
