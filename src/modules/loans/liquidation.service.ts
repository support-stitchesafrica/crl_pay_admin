import { Injectable, BadRequestException, NotFoundException, Inject, Logger } from '@nestjs/common';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Loan } from '../../entities/loan.entity';
import { RepaymentScheduleItem } from '../../entities/repayment.entity';
import { Transaction } from '../../entities/transaction.entity';
import { LiquidationCalculation } from './dto/liquidation.dto';

@Injectable()
export class LiquidationService {
  private readonly logger = new Logger(LiquidationService.name);

  constructor(@Inject('FIRESTORE') private firestore: Firestore) {}

  async calculateLiquidation(
    loanId: string,
    partialAmount?: number,
  ): Promise<LiquidationCalculation> {
    try {
      this.logger.log(`Calculating liquidation for loan: ${loanId}`);

      const loanDoc = await this.firestore.collection('crl_loans').doc(loanId).get();

      if (!loanDoc.exists) {
        throw new NotFoundException('Loan not found');
      }

      const loan = loanDoc.data() as Loan;

      if (loan.status === 'completed') {
        throw new BadRequestException('Loan is already completed');
      }

      if (loan.status === 'cancelled') {
        throw new BadRequestException('Loan is cancelled');
      }

      // Get all schedules
      const schedulesSnapshot = await this.firestore
        .collection('crl_repayment_schedules')
        .where('loanId', '==', loanId)
        .orderBy('installmentNumber', 'asc')
        .get();

      const schedules = schedulesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate),
          paidAt: data.paidAt?.toDate ? data.paidAt.toDate() : data.paidAt,
        } as RepaymentScheduleItem;
      });

      const today = new Date();
      const loanStartDate = loan.activatedAt || loan.createdAt;

      // Categorize schedules
      const paidSchedules = schedules.filter((s) => s.status === 'success');
      const unpaidSchedules = schedules.filter((s) => s.status !== 'success');

      // Calculate for each unpaid schedule
      let totalUnpaidPrincipal = 0;
      let totalAccruedInterest = 0;
      let totalLateFees = 0;

      const schedulesIncluded: LiquidationCalculation['breakdown']['schedulesIncluded'] = [];

      for (const schedule of unpaidSchedules) {
        const dueDate = new Date(schedule.dueDate);
        const isPastDue = today > dueDate;
        const isCurrentlyDue = today >= dueDate;

        let interestToCharge = 0;

        if (isPastDue) {
          // A: Full interest accrued (past due date)
          interestToCharge = schedule.interestAmount;
        } else {
          // B or C: Prorate interest based on days elapsed
          const daysSinceLoanStart = Math.floor(
            (today.getTime() - new Date(loanStartDate).getTime()) / (1000 * 60 * 60 * 24),
          );
          const daysToDueDate = Math.floor(
            (dueDate.getTime() - new Date(loanStartDate).getTime()) / (1000 * 60 * 60 * 24),
          );

          if (daysSinceLoanStart > 0 && daysToDueDate > 0) {
            const prorateRatio = Math.min(daysSinceLoanStart / daysToDueDate, 1);
            interestToCharge = Math.ceil(schedule.interestAmount * prorateRatio);
          } else {
            // C: No interest yet (very early in loan term)
            interestToCharge = 0;
          }
        }

        // Calculate late fee if overdue
        let lateFee = 0;
        if (isPastDue && schedule.lateFee === 0) {
          const penaltyRate = loan.configuration?.penaltyRate || 5;
          lateFee = Math.ceil((schedule.amount * penaltyRate) / 100);
        } else {
          lateFee = schedule.lateFee || 0;
        }

        totalUnpaidPrincipal += schedule.principalAmount;
        totalAccruedInterest += interestToCharge;
        totalLateFees += lateFee;

        schedulesIncluded.push({
          scheduleId: schedule.scheduleId,
          installmentNumber: schedule.installmentNumber,
          dueDate: schedule.dueDate,
          status: schedule.status,
          principalAmount: schedule.principalAmount,
          interestAmount: schedule.interestAmount,
          proratedInterest: interestToCharge,
          lateFee,
        });
      }

      const totalDue = totalUnpaidPrincipal + totalAccruedInterest + totalLateFees;

      // Handle partial liquidation
      let isFullLiquidation = true;
      let remainingBalance: number | undefined;

      if (partialAmount && partialAmount < totalDue) {
        isFullLiquidation = false;
        remainingBalance = totalDue - partialAmount;

        // For partial liquidation, we need to determine which schedules to pay
        // Priority: Pay overdue first, then upcoming in order
        let amountRemaining = partialAmount;
        const partialSchedulesIncluded: typeof schedulesIncluded = [];

        // Sort: overdue first, then by due date
        const sortedSchedules = [...schedulesIncluded].sort((a, b) => {
          const aOverdue = new Date(a.dueDate) < today;
          const bOverdue = new Date(b.dueDate) < today;

          if (aOverdue && !bOverdue) return -1;
          if (!aOverdue && bOverdue) return 1;

          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

        for (const schedule of sortedSchedules) {
          const scheduleTotal =
            schedule.principalAmount + (schedule.proratedInterest || 0) + schedule.lateFee;

          if (amountRemaining >= scheduleTotal) {
            partialSchedulesIncluded.push(schedule);
            amountRemaining -= scheduleTotal;
          } else if (amountRemaining > 0) {
            // Partial payment of this schedule (apply to principal first, then interest, then fees)
            const partialSchedule = { ...schedule };
            
            if (amountRemaining >= schedule.principalAmount) {
              // Can cover principal
              amountRemaining -= schedule.principalAmount;
              
              if (amountRemaining >= (schedule.proratedInterest || 0)) {
                // Can cover interest
                amountRemaining -= schedule.proratedInterest || 0;
                
                if (amountRemaining >= schedule.lateFee) {
                  // Can cover late fee
                  amountRemaining -= schedule.lateFee;
                } else {
                  // Partial late fee
                  partialSchedule.lateFee = amountRemaining;
                  amountRemaining = 0;
                }
              } else {
                // Partial interest
                partialSchedule.proratedInterest = amountRemaining;
                partialSchedule.lateFee = 0;
                amountRemaining = 0;
              }
            } else {
              // Partial principal only
              partialSchedule.principalAmount = amountRemaining;
              partialSchedule.proratedInterest = 0;
              partialSchedule.lateFee = 0;
              amountRemaining = 0;
            }

            partialSchedulesIncluded.push(partialSchedule);
            break;
          }
        }

        // Recalculate totals for partial liquidation
        totalUnpaidPrincipal = partialSchedulesIncluded.reduce(
          (sum, s) => sum + s.principalAmount,
          0,
        );
        totalAccruedInterest = partialSchedulesIncluded.reduce(
          (sum, s) => sum + (s.proratedInterest || 0),
          0,
        );
        totalLateFees = partialSchedulesIncluded.reduce((sum, s) => sum + s.lateFee, 0);

        schedulesIncluded.length = 0;
        schedulesIncluded.push(...partialSchedulesIncluded);
      }

      const calculation: LiquidationCalculation = {
        loanId,
        totalDue: isFullLiquidation ? totalDue : partialAmount!,
        breakdown: {
          unpaidPrincipal: totalUnpaidPrincipal,
          accruedInterest: totalAccruedInterest,
          lateFees: totalLateFees,
          schedulesIncluded,
        },
        isFullLiquidation,
        remainingBalance,
      };

      this.logger.log(
        `Liquidation calculated: ${isFullLiquidation ? 'Full' : 'Partial'} - Total: ${calculation.totalDue}`,
      );

      return calculation;
    } catch (error) {
      this.logger.error(`Failed to calculate liquidation: ${error.message}`, error.stack);
      throw error;
    }
  }

  async processLiquidation(
    merchantId: string,
    loanId: string,
    amount: number,
    reference: string,
    method: string = 'manual',
  ): Promise<{ success: boolean; liquidationId: string; calculation: LiquidationCalculation }> {
    try {
      this.logger.log(`Processing liquidation for loan: ${loanId}, amount: ${amount}`);

      // Calculate liquidation
      const calculation = await this.calculateLiquidation(loanId, amount);

      if (amount < calculation.totalDue && !calculation.isFullLiquidation) {
        // Partial liquidation - amount must match calculation
        if (Math.abs(amount - calculation.totalDue) > 1) {
          throw new BadRequestException(
            `Amount mismatch. Expected ${calculation.totalDue} for partial liquidation`,
          );
        }
      }

      // Process in transaction
      const liquidationId = await this.firestore.runTransaction(async (transaction) => {
        const liquidationId = uuidv4();
        const now = new Date();

        const loanRef = this.firestore.collection('crl_loans').doc(loanId);
        const loanDoc = await transaction.get(loanRef);

        if (!loanDoc.exists) {
          throw new NotFoundException('Loan not found');
        }

        const loan = loanDoc.data() as Loan;

        if (loan.merchantId !== merchantId) {
          throw new BadRequestException('Loan does not belong to this merchant');
        }

        // Update each schedule included in liquidation
        for (const schedule of calculation.breakdown.schedulesIncluded) {
          const scheduleRef = this.firestore
            .collection('crl_repayment_schedules')
            .doc(schedule.scheduleId);

          const paidAmount =
            schedule.principalAmount + (schedule.proratedInterest || 0) + schedule.lateFee;

          transaction.update(scheduleRef, {
            status: 'success',
            paidAmount,
            paidAt: now,
            lateFee: schedule.lateFee,
            providerReference: reference,
            metadata: {
              liquidation: true,
              liquidationId,
              proratedInterest: schedule.proratedInterest,
            },
            updatedAt: now,
          });
        }

        // Update loan
        const newAmountPaid = loan.amountPaid + calculation.totalDue;
        const newStatus = calculation.isFullLiquidation ? 'completed' : loan.status;

        transaction.update(loanRef, {
          amountPaid: newAmountPaid,
          amountRemaining: loan.configuration.totalAmount - newAmountPaid,
          status: newStatus,
          lastPaymentDate: now,
          ...(calculation.isFullLiquidation && { completedAt: now }),
          updatedAt: now,
        });

        // Write ledger entry for liquidation
        const transactionId = uuidv4();
        const ledgerEntry: Transaction = {
          transactionId,
          type: 'REPAYMENT_SUCCESS',
          status: 'success',
          idempotencyKey: `LIQUIDATION:${loanId}:${reference}`,
          merchantId,
          reference,
          loanId,
          financierId: (loan.metadata?.financierId as string) || '',
          amount: calculation.totalDue,
          currency: 'NGN',
          provider: 'manual',
          metadata: {
            liquidation: true,
            liquidationId,
            isFullLiquidation: calculation.isFullLiquidation,
            breakdown: calculation.breakdown,
            method,
          },
          createdAt: now,
          updatedAt: now,
        };

        const ledgerRef = this.firestore.collection('crl_transactions').doc(transactionId);
        transaction.set(ledgerRef, ledgerEntry);

        return liquidationId;
      });

      this.logger.log(`Liquidation processed successfully: ${liquidationId}`);

      return {
        success: true,
        liquidationId,
        calculation,
      };
    } catch (error) {
      this.logger.error(`Failed to process liquidation: ${error.message}`, error.stack);
      throw error;
    }
  }
}
