import { Injectable, BadRequestException, NotFoundException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Loan } from '../../entities/loan.entity';
import { RepaymentScheduleItem } from '../../entities/repayment.entity';
import { Transaction } from '../../entities/transaction.entity';
import { LiquidationCalculation } from './dto/liquidation.dto';
import { InterestAccrualService } from './interest-accrual.service';
import { PaystackService } from '../payments/paystack.service';

@Injectable()
export class LiquidationService {
  private readonly logger = new Logger(LiquidationService.name);

  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private interestAccrualService: InterestAccrualService,
    private configService: ConfigService,
  ) {}

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

      // Categorize schedules (exclude deleted schedules)
      const paidSchedules = schedules.filter((s) => s.status === 'success');
      const unpaidSchedules = schedules.filter((s) => s.status !== 'success' && s.status !== 'deleted');

      // Calculate for each unpaid schedule
      let totalUnpaidPrincipal = 0;
      let totalAccruedInterest = 0;
      let totalLateFees = 0;

      const schedulesIncluded: LiquidationCalculation['breakdown']['schedulesIncluded'] = [];

      for (const schedule of unpaidSchedules) {
        const dueDate = new Date(schedule.dueDate);
        const isPastDue = today > dueDate;

        // Use accrued interest from daily accrual job
        const interestToCharge = schedule.accruedInterest || 0;
        const remainingPrincipal = schedule.remainingPrincipal || schedule.principalAmount;

        // Calculate late fee if overdue
        let lateFee = 0;
        if (isPastDue && schedule.lateFee === 0) {
          const penaltyRate = loan.configuration?.penaltyRate || 5;
          lateFee = Math.ceil((remainingPrincipal * penaltyRate) / 100);
        } else {
          lateFee = schedule.lateFee || 0;
        }

        totalUnpaidPrincipal += remainingPrincipal;
        totalAccruedInterest += interestToCharge;
        totalLateFees += lateFee;

        schedulesIncluded.push({
          scheduleId: schedule.scheduleId,
          installmentNumber: schedule.installmentNumber,
          dueDate: schedule.dueDate,
          status: schedule.status,
          principalAmount: remainingPrincipal,
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
            // Partial payment of this schedule
            // Priority: Penalties → Interest → Principal
            const partialSchedule = { ...schedule };
            
            if (amountRemaining >= schedule.lateFee) {
              // Can cover late fee
              amountRemaining -= schedule.lateFee;
              
              if (amountRemaining >= (schedule.proratedInterest || 0)) {
                // Can cover interest
                amountRemaining -= schedule.proratedInterest || 0;
                
                if (amountRemaining >= schedule.principalAmount) {
                  // Can cover principal
                  amountRemaining -= schedule.principalAmount;
                } else {
                  // Partial principal
                  partialSchedule.principalAmount = amountRemaining;
                  amountRemaining = 0;
                }
              } else {
                // Partial interest
                partialSchedule.proratedInterest = amountRemaining;
                partialSchedule.principalAmount = 0;
                amountRemaining = 0;
              }
            } else {
              // Partial late fee only
              partialSchedule.lateFee = amountRemaining;
              partialSchedule.proratedInterest = 0;
              partialSchedule.principalAmount = 0;
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
    method: string = 'auto_debit',
  ): Promise<{ success: boolean; liquidationId: string; calculation: LiquidationCalculation }> {
    try {
      this.logger.log(`Processing liquidation for loan: ${loanId}, amount: ${amount}, method: ${method}`);

      // Calculate liquidation
      const calculation = await this.calculateLiquidation(loanId, amount);
      
      if (!calculation) {
        throw new BadRequestException('Failed to calculate liquidation');
      }
      
      this.logger.log(`Liquidation calculation result: totalDue=${calculation.totalDue}, isFullLiquidation=${calculation.isFullLiquidation}`);

      if (amount > 0 && amount < calculation.totalDue && !calculation.isFullLiquidation) {
        // Partial liquidation - amount must match calculation
        if (Math.abs(amount - calculation.totalDue) > 1) {
          throw new BadRequestException(
            `Amount mismatch. Expected ${calculation.totalDue} for partial liquidation`,
          );
        }
      }

      // Get loan and customer details for auto-debit
      const loanDoc = await this.firestore.collection('crl_loans').doc(loanId).get();
      if (!loanDoc.exists) {
        throw new NotFoundException('Loan not found');
      }
      const loan = loanDoc.data() as Loan;

      if (loan.merchantId !== merchantId) {
        throw new BadRequestException('Loan does not belong to this merchant');
      }

      // Get customer details
      const customerDoc = await this.firestore
        .collection('crl_customers')
        .doc(loan.customerId)
        .get();

      if (!customerDoc.exists) {
        throw new NotFoundException('Customer not found');
      }
      const customer = customerDoc.data();

      if (!customer) {
        throw new NotFoundException('Customer data not found');
      }

      // Auto-debit the customer if method is auto_debit
      if (method === 'auto_debit') {
        // Check for authorization code - first on loan, then fallback to customer
        let authorizationCode = loan.cardAuthorization?.authorizationCode;
        
        if (!authorizationCode && customer.paystackAuthorizationCode) {
          this.logger.log('Using customer saved card authorization');
          authorizationCode = customer.paystackAuthorizationCode;
        }
        
        if (!authorizationCode) {
          throw new BadRequestException('No saved card authorization found for this loan or customer');
        }

        // Get active repayment integration
        const repaymentSettingsDoc = await this.firestore
          .collection('crl_system_settings')
          .doc('repayments')
          .get();

        if (!repaymentSettingsDoc.exists) {
          throw new BadRequestException('Repayment integration not configured');
        }

        const repaymentSettings = repaymentSettingsDoc.data();
        const integrationDoc = await this.firestore
          .collection('crl_repayment_integrations')
          .doc(repaymentSettings?.activeIntegrationId)
          .get();

        if (!integrationDoc.exists) {
          throw new BadRequestException('Active repayment integration not found');
        }

        const integration = integrationDoc.data();
        const secretKey = this.configService.get<string>(integration?.secretKeyEnvRef || '');

        if (!secretKey) {
          throw new BadRequestException('Repayment integration secret key not configured');
        }

        // Create Paystack service and charge
        const paystackService = PaystackService.createWithSecretKey(secretKey);
        
        this.logger.log(`Charging customer card for liquidation: ₦${calculation.totalDue}`);

        const chargeResponse = await paystackService.chargeAuthorization({
          email: customer.email,
          amount: calculation.totalDue * 100, // Convert to kobo
          authorizationCode,
          reference,
          metadata: {
            loanId,
            customerId: loan.customerId,
            merchantId,
            type: 'liquidation',
            isFullLiquidation: calculation.isFullLiquidation,
          },
        });

        if (!chargeResponse.data || chargeResponse.data.status !== 'success') {
          throw new BadRequestException(
            chargeResponse.data?.gateway_response || 'Payment failed',
          );
        }

        this.logger.log(`Payment successful: ${chargeResponse.data.reference}`);
      }

      // Process in transaction
      const liquidationId = await this.firestore.runTransaction(async (transaction) => {
        const liquidationId = uuidv4();
        const now = new Date();

        // READ PHASE: All reads must happen before any writes
        const loanRef = this.firestore.collection('crl_loans').doc(loanId);
        const loanDoc = await transaction.get(loanRef);

        if (!loanDoc.exists) {
          throw new NotFoundException('Loan not found');
        }

        const loan = loanDoc.data() as Loan;

        if (loan.merchantId !== merchantId) {
          throw new BadRequestException('Loan does not belong to this merchant');
        }

        // Read all schedule documents upfront (both included and not included in liquidation)
        const scheduleReads = await Promise.all(
          calculation.breakdown.schedulesIncluded.map(schedule => {
            const scheduleRef = this.firestore
              .collection('crl_repayment_schedules')
              .doc(schedule.scheduleId);
            return transaction.get(scheduleRef);
          })
        );
        
        // Read all schedules to calculate remaining balance
        const allSchedulesSnapshot = await this.firestore
          .collection('crl_repayment_schedules')
          .where('loanId', '==', loanId)
          .get();
        
        // Filter out successful and deleted schedules in-memory
        const unpaidSchedulesForBalance = allSchedulesSnapshot.docs.filter(doc => {
          const status = doc.data().status;
          return status !== 'success' && status !== 'deleted';
        });

        // WRITE PHASE: Now perform all writes
        // Update each schedule included in liquidation
        for (let i = 0; i < calculation.breakdown.schedulesIncluded.length; i++) {
          const schedule = calculation.breakdown.schedulesIncluded[i];
          const scheduleRef = this.firestore
            .collection('crl_repayment_schedules')
            .doc(schedule.scheduleId);

          const paidAmount =
            schedule.principalAmount + (schedule.proratedInterest || 0) + schedule.lateFee;

          // Get original schedule from the read phase
          const originalScheduleDoc = scheduleReads[i];
          const originalSchedule = originalScheduleDoc.data() as RepaymentScheduleItem;
          const originalPrincipal = originalSchedule.remainingPrincipal || originalSchedule.principalAmount;

          // Check if this is a partial payment
          const isPartialPayment = schedule.principalAmount < originalPrincipal;

          if (isPartialPayment) {
            // Partial payment - update remaining principal and reset accrued interest
            const newRemainingPrincipal = originalPrincipal - schedule.principalAmount;

            transaction.update(scheduleRef, {
              status: 'pending', // Still pending since not fully paid
              paidAmount: FieldValue.increment(paidAmount),
              remainingPrincipal: newRemainingPrincipal,
              accruedInterest: 0, // Reset - will be recalculated by daily accrual job
              lateFee: schedule.lateFee,
              providerReference: reference,
              metadata: {
                liquidation: true,
                liquidationId,
                partialPayment: true,
                paidPrincipal: schedule.principalAmount,
                paidInterest: schedule.proratedInterest,
              },
              updatedAt: now,
            });
          } else {
            // Full payment
            transaction.update(scheduleRef, {
              status: 'success',
              paidAmount,
              paidAt: now,
              remainingPrincipal: 0,
              accruedInterest: 0, // Reset accrued interest for fully paid schedule
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
        }

        // Count how many schedules were fully paid
        const fullyPaidSchedules = calculation.breakdown.schedulesIncluded.filter((schedule, i) => {
          const originalScheduleDoc = scheduleReads[i];
          const originalSchedule = originalScheduleDoc.data() as RepaymentScheduleItem;
          const originalPrincipal = originalSchedule.remainingPrincipal || originalSchedule.principalAmount;
          return schedule.principalAmount >= originalPrincipal;
        }).length;

        // Update loan
        const newAmountPaid = loan.amountPaid + calculation.totalDue;
        const newStatus = calculation.isFullLiquidation ? 'completed' : loan.status;
        const newCurrentInstallment = loan.currentInstallment + fullyPaidSchedules;
        
        // Calculate actual remaining amount based on unpaid principal + prorated interest
        // Interest should be recalculated based on remaining principal, not fixed
        let newAmountRemaining = 0;
        
        unpaidSchedulesForBalance.forEach(doc => {
          const schedule = doc.data() as RepaymentScheduleItem;
          const scheduleId = doc.id;
          
          // Check if this schedule is being paid in this liquidation
          const liquidationSchedule = calculation.breakdown.schedulesIncluded.find(s => s.scheduleId === scheduleId);
          
          if (liquidationSchedule) {
            // This schedule is being paid - calculate remaining after payment
            const originalPrincipal = schedule.remainingPrincipal || schedule.principalAmount;
            const remainingPrincipal = originalPrincipal - liquidationSchedule.principalAmount;
            
            if (remainingPrincipal > 0) {
              // Prorate interest based on remaining principal
              // Interest rate = original interest / original principal
              const interestRate = schedule.interestAmount / schedule.principalAmount;
              const proratedInterest = remainingPrincipal * interestRate;
              newAmountRemaining += remainingPrincipal + proratedInterest;
            }
            // If fully paid, add nothing
          } else {
            // This schedule is not being paid - add remaining principal + full interest
            const remainingPrincipal = schedule.remainingPrincipal || schedule.principalAmount;
            newAmountRemaining += remainingPrincipal + schedule.interestAmount;
          }
        });

        transaction.update(loanRef, {
          amountPaid: newAmountPaid,
          amountRemaining: newAmountRemaining,
          currentInstallment: newCurrentInstallment,
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

      // Recalculate interest for partially paid schedules
      if (!calculation.isFullLiquidation) {
        for (const schedule of calculation.breakdown.schedulesIncluded) {
          const scheduleDoc = await this.firestore
            .collection('crl_repayment_schedules')
            .doc(schedule.scheduleId)
            .get();

          if (scheduleDoc.exists) {
            const updatedSchedule = scheduleDoc.data() as RepaymentScheduleItem;
            
            // If schedule is still pending (partial payment), recalculate interest
            if (updatedSchedule.status === 'pending' && updatedSchedule.remainingPrincipal > 0) {
              try {
                await this.interestAccrualService.recalculateScheduleInterest(
                  schedule.scheduleId,
                  updatedSchedule.remainingPrincipal,
                );
                this.logger.log(
                  `Recalculated interest for partially paid schedule ${schedule.scheduleId}`,
                );
              } catch (error) {
                this.logger.error(
                  `Failed to recalculate interest for schedule ${schedule.scheduleId}: ${error.message}`,
                );
              }
            }
          }
        }
      }

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
