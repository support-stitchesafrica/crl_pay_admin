import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { CapitalPool } from '../../entities/capital-pool.entity';

@Injectable()
export class CapitalService {
  private readonly logger = new Logger(CapitalService.name);
  private poolDoc: FirebaseFirestore.DocumentReference;

  constructor(@Inject('FIRESTORE') private firestore: Firestore) {
    this.poolDoc = this.firestore.collection('crl_capital_pool').doc('main');
  }

  async getPoolStatus(): Promise<CapitalPool> {
    const doc = await this.poolDoc.get();
    
    if (!doc.exists) {
      const initialPool: CapitalPool = {
        poolId: 'main',
        totalCapital: 0,
        allocated: 0,
        available: 0,
        inActiveLoans: 0,
        totalRepaid: 0,
        totalSettled: 0,
        pendingSettlement: 0,
        metrics: {
          utilizationRate: 0,
          activeLoansCount: 0,
          completedLoansCount: 0,
          defaultedLoansCount: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await this.poolDoc.set(initialPool);
      return initialPool;
    }
    
    return doc.data() as CapitalPool;
  }

  async setTotalCapital(amount: number): Promise<void> {
    this.logger.log(`Setting total capital to ₦${amount}`);
    
    const pool = await this.getPoolStatus();
    
    await this.poolDoc.update({
      totalCapital: amount,
      available: amount - pool.allocated,
      updatedAt: new Date(),
    });
  }

  async allocateToMerchant(merchantId: string, amount: number): Promise<void> {
    this.logger.log(`Allocating ₦${amount} to merchant ${merchantId}`);
    
    const pool = await this.getPoolStatus();
    
    if (pool.available < amount) {
      throw new BadRequestException(
        `Insufficient capital. Available: ₦${pool.available}, Requested: ₦${amount}`
      );
    }
    
    await this.poolDoc.update({
      allocated: FieldValue.increment(amount),
      available: FieldValue.increment(-amount),
      updatedAt: new Date(),
    });
    
    this.logger.log(`Capital allocated. New available: ₦${pool.available - amount}`);
  }

  async releaseAllocation(allocationId: string, amount: number): Promise<void> {
    this.logger.log(`Releasing ₦${amount} from allocation ${allocationId}`);
    
    await this.poolDoc.update({
      allocated: FieldValue.increment(-amount),
      available: FieldValue.increment(amount),
      updatedAt: new Date(),
    });
  }

  async recordLoanDisbursement(amount: number): Promise<void> {
    await this.poolDoc.update({
      inActiveLoans: FieldValue.increment(amount),
      'metrics.activeLoansCount': FieldValue.increment(1),
      updatedAt: new Date(),
    });
  }

  async recordLoanRepayment(amount: number): Promise<void> {
    await this.poolDoc.update({
      inActiveLoans: FieldValue.increment(-amount),
      totalRepaid: FieldValue.increment(amount),
      updatedAt: new Date(),
    });
  }

  async recordLoanCompletion(): Promise<void> {
    await this.poolDoc.update({
      'metrics.activeLoansCount': FieldValue.increment(-1),
      'metrics.completedLoansCount': FieldValue.increment(1),
      updatedAt: new Date(),
    });
  }

  async recordSettlement(amount: number): Promise<void> {
    await this.poolDoc.update({
      totalSettled: FieldValue.increment(amount),
      pendingSettlement: FieldValue.increment(-amount),
      updatedAt: new Date(),
    });
  }

  async checkAvailability(amount: number): Promise<boolean> {
    const pool = await this.getPoolStatus();
    return pool.available >= amount;
  }

  async updateMetrics(): Promise<void> {
    const pool = await this.getPoolStatus();
    const utilizationRate = pool.totalCapital > 0 
      ? Math.round((pool.allocated / pool.totalCapital) * 100)
      : 0;
    
    await this.poolDoc.update({
      'metrics.utilizationRate': utilizationRate,
      updatedAt: new Date(),
    });
  }
}
