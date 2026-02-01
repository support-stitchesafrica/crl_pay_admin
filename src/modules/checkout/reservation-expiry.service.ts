import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from '../../entities/transaction.entity';

@Injectable()
export class ReservationExpiryService {
  private readonly logger = new Logger(ReservationExpiryService.name);

  constructor(@Inject('FIRESTORE') private firestore: Firestore) {
    this.logger.log('🔄 ReservationExpiryService initialized - Cron job will run every 5 minutes');
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredReservations() {
    try {
      const now = new Date();
      this.logger.log(`[CRON] Starting expired reservations check at ${now.toISOString()}`);

      // Fetch all active reservations (to avoid composite index requirement)
      const activeReservationsSnapshot = await this.firestore
        .collection('crl_reservations')
        .where('status', '==', 'active')
        .get();

      this.logger.log(`[CRON] Found ${activeReservationsSnapshot.size} active reservations`);
      
      // Log each active reservation for debugging
      if (activeReservationsSnapshot.size > 0) {
        activeReservationsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          this.logger.log(
            `[CRON] Active reservation: ${data.reservationId}, ` +
            `status=${data.status}, expiresAt=${data.expiresAt}, ` +
            `amount=${data.amount}`
          );
        });
      }

      if (activeReservationsSnapshot.empty) {
        this.logger.log('[CRON] No active reservations found - nothing to process');
        return;
      }

      // Filter expired reservations in memory
      const expiredReservations = activeReservationsSnapshot.docs.filter((doc) => {
        const data = doc.data();
        const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        const isExpired = expiresAt < now;
        
        if (isExpired) {
          this.logger.log(
            `[CRON] Reservation ${data.reservationId} expired: ` +
            `expiresAt=${expiresAt.toISOString()}, now=${now.toISOString()}, ` +
            `amount=${data.amount}, customer=${data.customerId}`
          );
        }
        
        return isExpired;
      });

      if (expiredReservations.length === 0) {
        this.logger.log('[CRON] No expired reservations found among active ones');
        return;
      }

      this.logger.log(`[CRON] Processing ${expiredReservations.length} expired reservations`);

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
              type: 'CREDIT_RELEASED',
              status: 'success',
              idempotencyKey: `${reservation.idempotencyKey}:EXPIRED`,
              merchantId: reservation.merchantId,
              customerId: reservation.customerId,
              reference: reservation.reference,
              allocationId: reservation.allocationId,
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
            `[CRON] ✅ Expired reservation ${reservation.reservationId} processed successfully - ` +
            `released ₦${reservation.amount} back to allocation ${reservation.allocationId}`
          );
        } catch (error) {
          this.logger.error(
            `[CRON] ❌ Failed to process expired reservation ${reservation.reservationId}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(`[CRON] ✅ Expired reservations processing completed - processed ${expiredReservations.length} reservations`);
    } catch (error) {
      this.logger.error(
        `[CRON] ❌ Failed to handle expired reservations: ${error.message}`,
        error.stack,
      );
    }
  }
}
