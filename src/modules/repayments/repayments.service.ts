import { Injectable, BadRequestException, NotFoundException, Inject, Logger } from '@nestjs/common';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { v4 as uuidv4 } from 'uuid';
import { RepaymentScheduleItem, Repayment } from '../../entities/repayment.entity';
import { Transaction } from '../../entities/transaction.entity';
import { RecordManualRepaymentDto } from './dto/repayment.dto';

@Injectable()
export class RepaymentsService {
  private readonly logger = new Logger(RepaymentsService.name);

  constructor(@Inject('FIRESTORE') private firestore: Firestore) {}

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

  async getRepaymentsForLoan(loanId: string): Promise<Repayment[]> {
    const snapshot = await this.firestore
      .collection('crl_repayments')
      .where('loanId', '==', loanId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      } as Repayment;
    });
  }

  async recordManualRepayment(
    merchantId: string,
    dto: RecordManualRepaymentDto,
  ): Promise<Repayment> {
    try {
      this.logger.log(`Recording manual repayment for loan: ${dto.loanId}`);

      const scheduleDoc = await this.firestore
        .collection('crl_repayment_schedules')
        .doc(dto.scheduleId)
        .get();

      if (!scheduleDoc.exists) {
        throw new NotFoundException('Repayment schedule not found');
      }

      const schedule = scheduleDoc.data() as RepaymentScheduleItem;

      if (schedule.merchantId !== merchantId) {
        throw new BadRequestException('Schedule does not belong to this merchant');
      }

      if (schedule.status === 'success') {
        throw new BadRequestException('This installment has already been paid');
      }

      const repayment = await this.firestore.runTransaction(async (transaction) => {
        const repaymentId = uuidv4();
        const now = new Date();

        const repayment: Repayment = {
          repaymentId,
          loanId: dto.loanId,
          scheduleId: dto.scheduleId,
          merchantId: schedule.merchantId,
          customerId: schedule.customerId,
          financierId: schedule.financierId,
          amount: dto.amount,
          method: (dto.method as any) || 'manual',
          status: 'success',
          provider: 'manual',
          providerReference: dto.reference,
          createdAt: now,
          updatedAt: now,
        };

        const repaymentRef = this.firestore.collection('crl_repayments').doc(repaymentId);
        transaction.set(repaymentRef, repayment);

        const scheduleRef = this.firestore
          .collection('crl_repayment_schedules')
          .doc(dto.scheduleId);

        transaction.update(scheduleRef, {
          status: 'success',
          paidAmount: dto.amount,
          paidAt: now,
          repaymentId,
          providerReference: dto.reference,
          updatedAt: now,
        });

        const loanRef = this.firestore.collection('crl_loans').doc(dto.loanId);
        transaction.update(loanRef, {
          amountPaid: FieldValue.increment(dto.amount),
          lastPaymentDate: now,
          updatedAt: now,
        });

        const transactionId = uuidv4();
        const ledgerEntry: Transaction = {
          transactionId,
          type: 'REPAYMENT_SUCCESS',
          status: 'success',
          idempotencyKey: `MANUAL_REPAY:${dto.loanId}:${dto.scheduleId}:${dto.reference}`,
          merchantId: schedule.merchantId,
          reference: dto.reference,
          loanId: dto.loanId,
          financierId: schedule.financierId,
          amount: dto.amount,
          currency: 'NGN',
          provider: 'manual',
          metadata: {
            scheduleId: dto.scheduleId,
            installmentNumber: schedule.installmentNumber,
            method: dto.method || 'manual',
          },
          createdAt: now,
          updatedAt: now,
        };

        const ledgerRef = this.firestore.collection('crl_transactions').doc(transactionId);
        transaction.set(ledgerRef, ledgerEntry);

        return repayment;
      });

      this.logger.log(`Manual repayment recorded: ${repayment.repaymentId}`);
      return repayment;
    } catch (error) {
      this.logger.error(`Failed to record manual repayment: ${error.message}`, error.stack);
      throw error;
    }
  }
}
