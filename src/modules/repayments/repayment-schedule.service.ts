import { Injectable, Logger, Inject } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { v4 as uuidv4 } from 'uuid';
import { RepaymentScheduleItem } from '../../entities/repayment.entity';
import { Loan } from '../../entities/loan.entity';

@Injectable()
export class RepaymentScheduleService {
  private readonly logger = new Logger(RepaymentScheduleService.name);

  constructor(@Inject('FIRESTORE') private firestore: Firestore) {}

  async generateScheduleForLoan(loan: Loan): Promise<RepaymentScheduleItem[]> {
    try {
      this.logger.log(`Generating repayment schedule for loan: ${loan.loanId}`);

      const schedule: RepaymentScheduleItem[] = [];
      const numberOfInstallments = this.calculateNumberOfInstallments(
        loan.configuration.frequency,
        loan.configuration.tenor,
      );

      const installmentAmount = Math.ceil(loan.configuration.totalAmount / numberOfInstallments);
      const principalPerInstallment = Math.ceil(loan.principalAmount / numberOfInstallments);
      const interestPerInstallment = Math.ceil(
        (loan.configuration.totalAmount - loan.principalAmount) / numberOfInstallments,
      );

      let currentDate = new Date(loan.firstPaymentDate || loan.createdAt);

      for (let i = 0; i < numberOfInstallments; i++) {
        const dueDate = this.calculateDueDate(currentDate, loan.configuration.frequency, i);
        const scheduleId = uuidv4();

        const scheduleItem: RepaymentScheduleItem = {
          scheduleId,
          loanId: loan.loanId,
          merchantId: loan.merchantId,
          customerId: loan.customerId,
          financierId: (loan.metadata?.financierId as string) || '',
          installmentNumber: i + 1,
          dueDate,
          amount: installmentAmount,
          principalAmount: principalPerInstallment,
          interestAmount: interestPerInstallment,
          status: 'pending',
          paidAmount: 0,
          lateFee: 0,
          totalDue: installmentAmount,
          retryCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        schedule.push(scheduleItem);

        await this.firestore
          .collection('crl_repayment_schedules')
          .doc(scheduleId)
          .set(scheduleItem);
      }

      this.logger.log(
        `Generated ${schedule.length} repayment schedule items for loan ${loan.loanId}`,
      );

      return schedule;
    } catch (error) {
      this.logger.error(
        `Failed to generate repayment schedule: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private calculateNumberOfInstallments(
    frequency: string,
    tenor: { value: number; period: string },
  ): number {
    let tenorInDays = tenor.value;

    switch (tenor.period) {
      case 'WEEKS':
        tenorInDays *= 7;
        break;
      case 'MONTHS':
        tenorInDays *= 30;
        break;
      case 'YEARS':
        tenorInDays *= 365;
        break;
    }

    switch (frequency) {
      case 'daily':
        return tenorInDays;
      case 'weekly':
        return Math.ceil(tenorInDays / 7);
      case 'bi-weekly':
        return Math.ceil(tenorInDays / 14);
      case 'monthly':
        return Math.ceil(tenorInDays / 30);
      case 'quarterly':
        return Math.ceil(tenorInDays / 90);
      case 'bi-annually':
        return Math.ceil(tenorInDays / 180);
      case 'annually':
        return Math.ceil(tenorInDays / 365);
      default:
        return Math.ceil(tenorInDays / 30);
    }
  }

  private calculateDueDate(startDate: Date, frequency: string, installmentIndex: number): Date {
    const dueDate = new Date(startDate);

    switch (frequency) {
      case 'daily':
        dueDate.setDate(dueDate.getDate() + installmentIndex + 1);
        break;
      case 'weekly':
        dueDate.setDate(dueDate.getDate() + (installmentIndex + 1) * 7);
        break;
      case 'bi-weekly':
        dueDate.setDate(dueDate.getDate() + (installmentIndex + 1) * 14);
        break;
      case 'monthly':
        dueDate.setMonth(dueDate.getMonth() + installmentIndex + 1);
        break;
      case 'quarterly':
        dueDate.setMonth(dueDate.getMonth() + (installmentIndex + 1) * 3);
        break;
      case 'bi-annually':
        dueDate.setMonth(dueDate.getMonth() + (installmentIndex + 1) * 6);
        break;
      case 'annually':
        dueDate.setFullYear(dueDate.getFullYear() + installmentIndex + 1);
        break;
      default:
        dueDate.setMonth(dueDate.getMonth() + installmentIndex + 1);
    }

    return dueDate;
  }

  async getScheduleForLoan(loanId: string): Promise<RepaymentScheduleItem[]> {
    const snapshot = await this.firestore
      .collection('crl_repayment_schedules')
      .where('loanId', '==', loanId)
      .orderBy('installmentNumber', 'asc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate),
        paidAt: data.paidAt?.toDate ? data.paidAt.toDate() : data.paidAt,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        lastRetryAt: data.lastRetryAt?.toDate ? data.lastRetryAt.toDate() : data.lastRetryAt,
        nextRetryAt: data.nextRetryAt?.toDate ? data.nextRetryAt.toDate() : data.nextRetryAt,
      } as RepaymentScheduleItem;
    });
  }
}
