import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Firestore, FieldValue } from '@google-cloud/firestore';

@Injectable()
export class LoanExpiryService {
  private readonly logger = new Logger(LoanExpiryService.name);
  private readonly PENDING_LOAN_EXPIRY_HOURS = 24; // Expire pending loans after 24 hours

  constructor(@Inject('FIRESTORE') private firestore: Firestore) {
    this.logger.log(
      `🔄 LoanExpiryService initialized - Will expire pending loans after ${this.PENDING_LOAN_EXPIRY_HOURS} hours`
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredPendingLoans() {
    try {
      const now = new Date();
      this.logger.log(`[LOAN-EXPIRY] Starting expired pending loans check at ${now.toISOString()}`);

      // Calculate expiry cutoff time
      const expiryCutoff = new Date(now.getTime() - this.PENDING_LOAN_EXPIRY_HOURS * 60 * 60 * 1000);
      
      this.logger.log(`[LOAN-EXPIRY] Looking for pending loans created before ${expiryCutoff.toISOString()}`);

      // Fetch all pending loans
      const pendingLoansSnapshot = await this.firestore
        .collection('crl_loans')
        .where('status', '==', 'pending')
        .get();

      this.logger.log(`[LOAN-EXPIRY] Found ${pendingLoansSnapshot.size} pending loans`);

      if (pendingLoansSnapshot.empty) {
        this.logger.log('[LOAN-EXPIRY] No pending loans found - nothing to process');
        return;
      }

      // Filter expired loans in memory
      const expiredLoans = pendingLoansSnapshot.docs.filter((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        const isExpired = createdAt < expiryCutoff;
        
        if (isExpired) {
          const hoursOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
          this.logger.log(
            `[LOAN-EXPIRY] Loan ${data.loanId} expired: ` +
            `created=${createdAt.toISOString()}, age=${hoursOld}h, ` +
            `amount=${data.principalAmount}, customer=${data.customerId}`
          );
        }
        
        return isExpired;
      });

      if (expiredLoans.length === 0) {
        this.logger.log('[LOAN-EXPIRY] No expired pending loans found');
        return;
      }

      this.logger.log(`[LOAN-EXPIRY] Processing ${expiredLoans.length} expired pending loans`);

      for (const loanDoc of expiredLoans) {
        const loan = loanDoc.data();

        try {
          await this.firestore.runTransaction(async (transaction) => {
            const loanRef = this.firestore.collection('crl_loans').doc(loan.loanId);
            const currentLoan = await transaction.get(loanRef);

            if (!currentLoan.exists || currentLoan.data()?.status !== 'pending') {
              this.logger.log(
                `[LOAN-EXPIRY] Loan ${loan.loanId} already processed, skipping`
              );
              return;
            }

            // Update loan status to expired and clear financial fields
            transaction.update(loanRef, {
              status: 'expired',
              expiredAt: now,
              amountRemaining: 0,
              updatedAt: now,
            });

            // Release the credit back to allocation
            const allocationRef = this.firestore
              .collection('crl_merchant_allocations')
              .doc(loan.allocationId);

            transaction.update(allocationRef, {
              usedAmount: FieldValue.increment(-loan.principalAmount),
              updatedAt: now,
            });

            // Reverse the capital pool disbursement
            const capitalPoolSnapshot = await this.firestore
              .collection('crl_capital_pool')
              .limit(1)
              .get();

            if (!capitalPoolSnapshot.empty) {
              const capitalPoolRef = capitalPoolSnapshot.docs[0].ref;
              transaction.update(capitalPoolRef, {
                inActiveLoans: FieldValue.increment(-loan.principalAmount),
                'metrics.activeLoansCount': FieldValue.increment(-1),
                updatedAt: now,
              });
            }

            // Create transaction record
            const transactionId = `${loan.loanId}_expired`;
            const transactionEntry = {
              transactionId,
              type: 'LOAN_EXPIRED',
              status: 'success',
              merchantId: loan.merchantId,
              customerId: loan.customerId,
              reference: loan.orderId,
              allocationId: loan.allocationId,
              loanId: loan.loanId,
              amount: loan.principalAmount,
              currency: 'NGN',
              provider: 'internal',
              metadata: { 
                reason: 'pending_loan_expired',
                hoursOld: Math.floor((now.getTime() - (loan.createdAt?.toDate?.() || new Date(loan.createdAt)).getTime()) / (1000 * 60 * 60))
              },
              createdAt: now,
              updatedAt: now,
            };

            const transactionRef = this.firestore.collection('crl_transactions').doc(transactionId);
            transaction.set(transactionRef, transactionEntry);
          });

          this.logger.log(
            `[LOAN-EXPIRY] ✅ Expired loan ${loan.loanId} processed successfully - ` +
            `released ₦${loan.principalAmount} back to allocation ${loan.allocationId}`
          );
        } catch (error) {
          this.logger.error(
            `[LOAN-EXPIRY] ❌ Failed to process expired loan ${loan.loanId}: ${error.message}`,
            error.stack
          );
        }
      }

      this.logger.log(
        `[LOAN-EXPIRY] ✅ Expired pending loans processing completed - processed ${expiredLoans.length} loans`
      );
    } catch (error) {
      this.logger.error(
        `[LOAN-EXPIRY] ❌ Failed to handle expired pending loans: ${error.message}`,
        error.stack
      );
    }
  }
}
