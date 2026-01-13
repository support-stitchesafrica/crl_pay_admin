import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { RepaymentScheduleItem } from '../../entities/repayment.entity';
import { Loan } from '../../entities/loan.entity';
import { SystemLoanSettings } from '../../entities/system-settings.entity';

@Injectable()
export class InterestAccrualService {
  private readonly logger = new Logger(InterestAccrualService.name);

  constructor(@Inject('FIRESTORE') private firestore: Firestore) {}

  /**
   * Backfill missed accruals for all active loans
   * Calculates and applies accruals from activation date to last accrual date
   */
  async backfillMissedAccruals(): Promise<void> {
    try {
      this.logger.log('Starting backfill of missed accruals...');

      const systemSettings = await this.getLoanSettings();
      const daysInYear = systemSettings?.daysInYear || 365;

      const loansSnapshot = await this.firestore
        .collection('crl_loans')
        .where('status', '==', 'active')
        .get();

      let totalSchedulesBackfilled = 0;
      let totalInterestBackfilled = 0;

      for (const loanDoc of loansSnapshot.docs) {
        const loan = loanDoc.data() as Loan;
        const currentInstallment = loan.currentInstallment || 1;

        // Get only the current active schedule
        const schedulesSnapshot = await this.firestore
          .collection('crl_repayment_schedules')
          .where('loanId', '==', loan.loanId)
          .where('installmentNumber', '==', currentInstallment)
          .where('status', '==', 'pending')
          .limit(1)
          .get();

        for (const scheduleDoc of schedulesSnapshot.docs) {
          const schedule = scheduleDoc.data() as RepaymentScheduleItem;

          // Determine start date (loan activation or creation)
          const startDate = loan.activatedAt
            ? new Date(loan.activatedAt)
            : new Date(loan.createdAt);
          startDate.setHours(0, 0, 0, 0);

          // Determine last accrual date
          const lastAccrual = schedule.lastAccrualDate
            ? new Date((schedule.lastAccrualDate as any).toDate ? (schedule.lastAccrualDate as any).toDate() : schedule.lastAccrualDate)
            : null;

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Calculate days to backfill
          const fromDate = lastAccrual || startDate;
          fromDate.setHours(0, 0, 0, 0);

          const daysDiff = Math.floor((today.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff <= 0) {
            continue; // No days to backfill
          }

          // Calculate total interest for missed days using monthly interest
          const monthlyInterest = schedule.interestAmount;
          const daysInMonth = 30;
          const dailyInterest = Math.ceil(monthlyInterest / daysInMonth);
          const totalMissedInterest = dailyInterest * daysDiff;

          // Apply backfilled interest
          await this.firestore
            .collection('crl_repayment_schedules')
            .doc(schedule.scheduleId)
            .update({
              accruedInterest: FieldValue.increment(totalMissedInterest),
              lastAccrualDate: today,
              updatedAt: new Date(),
            });

          totalSchedulesBackfilled++;
          totalInterestBackfilled += totalMissedInterest;

          this.logger.debug(
            `Backfilled ${daysDiff} days (₦${totalMissedInterest}) for schedule ${schedule.scheduleId}`,
          );
        }
      }

      this.logger.log(
        `Backfill completed. Processed ${totalSchedulesBackfilled} schedules. Total backfilled: ₦${totalInterestBackfilled}`,
      );
    } catch (error) {
      this.logger.error(`Failed to backfill missed accruals: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async accrueInterestForAllLoans() {
    try {
      this.logger.log('Starting daily interest accrual job...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get system settings for days in year configuration
      const systemSettings = await this.getLoanSettings();
      const daysInYear = systemSettings?.daysInYear || 365; // Default to 365 if not configured

      // Get all active loans
      const loansSnapshot = await this.firestore
        .collection('crl_loans')
        .where('status', '==', 'active')
        .get();

      if (loansSnapshot.empty) {
        this.logger.log('No active loans found for interest accrual');
        return;
      }

      this.logger.log(`Processing interest accrual for ${loansSnapshot.size} active loans (using ${daysInYear} days/year)`);

      let totalSchedulesProcessed = 0;
      let totalInterestAccrued = 0;

      for (const loanDoc of loansSnapshot.docs) {
        const loan = loanDoc.data() as Loan;

        try {
          // Get the current active installment (only accrue on the current one, not future ones)
          const currentInstallment = loan.currentInstallment || 1;

          // Get only the current active schedule
          const schedulesSnapshot = await this.firestore
            .collection('crl_repayment_schedules')
            .where('loanId', '==', loan.loanId)
            .where('installmentNumber', '==', currentInstallment)
            .where('status', '==', 'pending')
            .limit(1)
            .get();

          if (schedulesSnapshot.empty) {
            this.logger.debug(`No active pending schedule for loan ${loan.loanId}`);
            continue;
          }

          for (const scheduleDoc of schedulesSnapshot.docs) {
            const schedule = scheduleDoc.data() as RepaymentScheduleItem;

            // Skip if already accrued today
            const lastAccrual = schedule.lastAccrualDate
              ? new Date((schedule.lastAccrualDate as any).toDate ? (schedule.lastAccrualDate as any).toDate() : schedule.lastAccrualDate)
              : null;

            if (lastAccrual) {
              lastAccrual.setHours(0, 0, 0, 0);
              if (lastAccrual.getTime() === today.getTime()) {
                continue; // Already accrued today
              }
            }

            // Calculate daily interest from the monthly interest amount
            // Monthly interest is already calculated in the schedule
            const monthlyInterest = schedule.interestAmount;
            const daysInMonth = 30; // Standard 30-day month for interest calculation
            const dailyInterest = Math.ceil(monthlyInterest / daysInMonth);

            // Update schedule with accrued interest
            await this.firestore
              .collection('crl_repayment_schedules')
              .doc(schedule.scheduleId)
              .update({
                accruedInterest: FieldValue.increment(dailyInterest),
                lastAccrualDate: today,
                updatedAt: new Date(),
              });

            totalSchedulesProcessed++;
            totalInterestAccrued += dailyInterest;

            this.logger.debug(
              `Accrued ₦${dailyInterest} for schedule ${schedule.scheduleId} (Monthly Interest: ₦${monthlyInterest})`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to accrue interest for loan ${loan.loanId}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `Interest accrual completed. Processed ${totalSchedulesProcessed} schedules. Total accrued: ₦${totalInterestAccrued}`,
      );
    } catch (error) {
      this.logger.error(`Interest accrual job failed: ${error.message}`, error.stack);
    }
  }

  async accrueInterestForLoan(loanId: string): Promise<void> {
    try {
      this.logger.log(`Manually accruing interest for loan: ${loanId}`);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get loan to use its interest rate
      const loanDoc = await this.firestore.collection('crl_loans').doc(loanId).get();
      if (!loanDoc.exists) {
        throw new Error('Loan not found');
      }

      const loan = loanDoc.data() as Loan;
      const annualRate = loan.configuration?.interestRate || 0;
      
      if (annualRate === 0) {
        throw new Error('Loan has 0% interest rate');
      }

      const currentInstallment = loan.currentInstallment || 1;

      // Get only the current active schedule
      const schedulesSnapshot = await this.firestore
        .collection('crl_repayment_schedules')
        .where('loanId', '==', loanId)
        .where('installmentNumber', '==', currentInstallment)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      for (const scheduleDoc of schedulesSnapshot.docs) {
        const schedule = scheduleDoc.data() as RepaymentScheduleItem;

        const monthlyInterest = schedule.interestAmount;
        const daysInMonth = 30;
        const dailyInterest = Math.ceil(monthlyInterest / daysInMonth);

        await this.firestore
          .collection('crl_repayment_schedules')
          .doc(schedule.scheduleId)
          .update({
            accruedInterest: FieldValue.increment(dailyInterest),
            lastAccrualDate: today,
            updatedAt: new Date(),
          });
      }

      this.logger.log(`Interest accrued successfully for loan: ${loanId}`);
    } catch (error) {
      this.logger.error(`Failed to accrue interest for loan ${loanId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async recalculateScheduleInterest(scheduleId: string, newPrincipal: number): Promise<number> {
    try {
      const scheduleDoc = await this.firestore
        .collection('crl_repayment_schedules')
        .doc(scheduleId)
        .get();

      if (!scheduleDoc.exists) {
        throw new Error('Schedule not found');
      }

      const schedule = scheduleDoc.data() as RepaymentScheduleItem;
      const loanDoc = await this.firestore.collection('crl_loans').doc(schedule.loanId).get();

      if (!loanDoc.exists) {
        throw new Error('Loan not found');
      }

      const loan = loanDoc.data() as Loan;
      
      const annualRate = loan.configuration?.interestRate || 0;
      if (annualRate === 0) {
        throw new Error('Loan has 0% interest rate');
      }

      const systemSettings = await this.getLoanSettings();
      const daysInYear = systemSettings?.daysInYear || 365;
      const dailyRate = annualRate / daysInYear / 100;

      // Calculate days from last payment/loan start to due date
      const startDate = loan.lastPaymentDate || loan.activatedAt || loan.createdAt;
      const dueDate = new Date((schedule.dueDate as any).toDate ? (schedule.dueDate as any).toDate() : schedule.dueDate);
      const daysDiff = Math.ceil((dueDate.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));

      // Calculate new expected interest based on new principal
      const newInterestAmount = Math.ceil(newPrincipal * dailyRate * daysDiff);

      // Update schedule with new interest amount
      await this.firestore
        .collection('crl_repayment_schedules')
        .doc(scheduleId)
        .update({
          interestAmount: newInterestAmount,
          remainingPrincipal: newPrincipal,
          accruedInterest: 0, // Reset accrued interest (will be recalculated by daily job)
          updatedAt: new Date(),
        });

      this.logger.log(
        `Recalculated interest for schedule ${scheduleId}: Principal ₦${newPrincipal}, New Interest ₦${newInterestAmount}`,
      );

      return newInterestAmount;
    } catch (error) {
      this.logger.error(
        `Failed to recalculate schedule interest: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async getLoanSettings(): Promise<SystemLoanSettings | null> {
    const settingsDoc = await this.firestore
      .collection('crl_system_settings')
      .doc('loan_settings')
      .get();

    if (!settingsDoc.exists) {
      return null;
    }

    const data = settingsDoc.data();
    return {
      ...data,
      updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data?.updatedAt),
    } as SystemLoanSettings;
  }
}
