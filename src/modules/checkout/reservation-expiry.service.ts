import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from '../../entities/transaction.entity';

@Injectable()
export class ReservationExpiryService {
  private readonly logger = new Logger(ReservationExpiryService.name);

  constructor(@Inject('FIRESTORE') private firestore: Firestore) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredReservations() {
    try {
      this.logger.log('Checking for expired reservations...');

      const now = new Date();
      
      // Fetch all active reservations (to avoid composite index requirement)
      const activeReservationsSnapshot = await this.firestore
        .collection('crl_reservations')
        .where('status', '==', 'active')
        .get();

      if (activeReservationsSnapshot.empty) {
        this.logger.log('No active reservations found');
        return;
      }

      // Filter expired reservations in memory
      const expiredReservations = activeReservationsSnapshot.docs.filter((doc) => {
        const data = doc.data();
        const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        return expiresAt < now;
      });

      if (expiredReservations.length === 0) {
        this.logger.log('No expired reservations found');
        return;
      }

      this.logger.log(`Found ${expiredReservations.length} expired reservations`);

      for (const reservationDoc of expiredReservations) {
        const reservation = reservationDoc.data();

        try {
          await this.firestore.runTransaction(async (transaction) => {
            const reservationRef = this.firestore
              .collection('crl_reservations')
              .doc(reservation.reservationId);

            const currentReservation = await transaction.get(reservationRef);

            if (!currentReservation.exists || currentReservation.data()?.status !== 'active') {
              this.logger.log(
                `Reservation ${reservation.reservationId} already processed, skipping`,
              );
              return;
            }

            const mappingRef = this.firestore
              .collection('crl_plan_merchant_mappings')
              .doc(reservation.mappingId);

            transaction.update(mappingRef, {
              currentAllocation: FieldValue.increment(-reservation.amount),
              updatedAt: new Date(),
            });

            transaction.update(reservationRef, {
              status: 'expired',
              updatedAt: new Date(),
            });

            const transactionId = uuidv4();
            const ledgerEntry: Transaction = {
              transactionId,
              type: 'ALLOCATION_RELEASED',
              status: 'success',
              idempotencyKey: `${reservation.idempotencyKey}:EXPIRED`,
              merchantId: reservation.merchantId,
              reference: reservation.reference,
              mappingId: reservation.mappingId,
              planId: reservation.planId,
              financierId: reservation.financierId,
              reservationId: reservation.reservationId,
              amount: reservation.amount,
              currency: reservation.currency,
              provider: 'internal',
              metadata: { reason: 'reservation_expired' },
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const ledgerRef = this.firestore.collection('crl_transactions').doc(transactionId);
            transaction.set(ledgerRef, ledgerEntry);
          });

          this.logger.log(
            `Expired reservation ${reservation.reservationId} processed successfully`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to process expired reservation ${reservation.reservationId}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log('Expired reservations processing completed');
    } catch (error) {
      this.logger.error(
        `Failed to handle expired reservations: ${error.message}`,
        error.stack,
      );
    }
  }
}
