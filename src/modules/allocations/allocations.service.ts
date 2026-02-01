import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { v4 as uuidv4 } from 'uuid';
import { MerchantAllocation, AllocationTerms } from '../../entities/merchant-allocation.entity';
import { CapitalService } from '../capital/capital.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';

@Injectable()
export class AllocationsService {
  private readonly logger = new Logger(AllocationsService.name);
  private allocationsCollection: FirebaseFirestore.CollectionReference;

  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private capitalService: CapitalService,
  ) {
    this.allocationsCollection = this.firestore.collection('crl_merchant_allocations');
  }

  async create(dto: CreateAllocationDto, createdBy: string): Promise<MerchantAllocation> {
    this.logger.log(`Creating allocation for merchant ${dto.merchantId}: ₦${dto.allocatedAmount}`);
    
    const merchantDoc = await this.firestore
      .collection('crl_merchants')
      .doc(dto.merchantId)
      .get();
    
    if (!merchantDoc.exists) {
      throw new NotFoundException('Merchant not found');
    }
    
    const existingAllocation = await this.findByMerchant(dto.merchantId);
    if (existingAllocation) {
      throw new BadRequestException('Merchant already has an active allocation');
    }
    
    const hasCapital = await this.capitalService.checkAvailability(dto.allocatedAmount);
    if (!hasCapital) {
      throw new BadRequestException('Insufficient capital in pool');
    }
    
    await this.capitalService.allocateToMerchant(dto.merchantId, dto.allocatedAmount);
    
    const allocationId = uuidv4();
    const now = new Date();
    
    const terms: any = {
      tenure: dto.terms.tenure,
      tenurePeriod: dto.terms.tenurePeriod,
      penalty: {
        type: dto.terms.penalty.type,
        amount: dto.terms.penalty.amount,
        gracePeriodDays: dto.terms.penalty.gracePeriodDays,
      },
    };
    
    if (dto.terms.minLoanAmount !== undefined) {
      terms.minLoanAmount = dto.terms.minLoanAmount;
    }
    if (dto.terms.maxLoanAmount !== undefined) {
      terms.maxLoanAmount = dto.terms.maxLoanAmount;
    }
    
    const allocation: any = {
      allocationId,
      merchantId: dto.merchantId,
      allocatedAmount: dto.allocatedAmount,
      availableAmount: dto.allocatedAmount,
      usedAmount: 0,
      terms,
      totalLoans: 0,
      activeLoans: 0,
      completedLoans: 0,
      defaultedLoans: 0,
      totalDisbursed: 0,
      totalRepaid: 0,
      pendingSettlement: 0,
      totalSettled: 0,
      status: 'active',
      expiresAt: dto.expiresAt,
      createdAt: now,
      updatedAt: now,
      createdBy: createdBy || 'system',
      updatedBy: createdBy || 'system',
    };
    
    if (dto.notes) {
      allocation.notes = dto.notes;
    }
    
    await this.allocationsCollection.doc(allocationId).set(allocation);
    
    await this.firestore
      .collection('crl_merchants')
      .doc(dto.merchantId)
      .update({
        activeAllocationId: allocationId,
        updatedAt: now,
      });
    
    this.logger.log(`Allocation created: ${allocationId}`);
    return allocation;
  }

  async findOne(allocationId: string): Promise<MerchantAllocation> {
    const doc = await this.allocationsCollection.doc(allocationId).get();
    
    if (!doc.exists) {
      throw new NotFoundException('Allocation not found');
    }
    
    return doc.data() as MerchantAllocation;
  }

  async findByMerchant(merchantId: string): Promise<MerchantAllocation | null> {
    const snapshot = await this.allocationsCollection
      .where('merchantId', '==', merchantId)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    return snapshot.docs[0].data() as MerchantAllocation;
  }

  async checkEligibility(allocationId: string, amount: number): Promise<{
    eligible: boolean;
    reason?: string;
    terms?: AllocationTerms;
  }> {
    const allocation = await this.findOne(allocationId);
    
    if (allocation.status !== 'active') {
      return { eligible: false, reason: 'Allocation is not active' };
    }
    
    // Convert Firestore Timestamp to Date for comparison
    const expiryDate = (allocation.expiresAt as any)?.toDate 
      ? (allocation.expiresAt as any).toDate() 
      : new Date(allocation.expiresAt);
    if (new Date() > expiryDate) {
      return { eligible: false, reason: 'Allocation has expired' };
    }
    
    if (allocation.availableAmount < amount) {
      return {
        eligible: false,
        reason: `Insufficient allocation. Available: ₦${allocation.availableAmount}, Requested: ₦${amount}`,
      };
    }
    
    if (allocation.terms.minLoanAmount && amount < allocation.terms.minLoanAmount) {
      return {
        eligible: false,
        reason: `Amount below minimum: ₦${allocation.terms.minLoanAmount}`,
      };
    }
    
    if (allocation.terms.maxLoanAmount && amount > allocation.terms.maxLoanAmount) {
      return {
        eligible: false,
        reason: `Amount exceeds maximum: ₦${allocation.terms.maxLoanAmount}`,
      };
    }
    
    return { eligible: true, terms: allocation.terms };
  }

  async reserveAmount(allocationId: string, amount: number): Promise<void> {
    this.logger.log(`Reserving ₦${amount} from allocation ${allocationId}`);
    
    const allocation = await this.findOne(allocationId);
    
    if (allocation.availableAmount < amount) {
      throw new BadRequestException('Insufficient allocation');
    }
    
    await this.allocationsCollection.doc(allocationId).update({
      availableAmount: FieldValue.increment(-amount),
      usedAmount: FieldValue.increment(amount),
      updatedAt: new Date(),
    });
  }

  async recordLoanCreation(allocationId: string, amount: number): Promise<void> {
    await this.allocationsCollection.doc(allocationId).update({
      totalLoans: FieldValue.increment(1),
      activeLoans: FieldValue.increment(1),
      totalDisbursed: FieldValue.increment(amount),
      updatedAt: new Date(),
    });
  }

  async recordLoanCompletion(allocationId: string, principalAmount: number, totalRepaid: number): Promise<void> {
    await this.allocationsCollection.doc(allocationId).update({
      activeLoans: FieldValue.increment(-1),
      completedLoans: FieldValue.increment(1),
      usedAmount: FieldValue.increment(-principalAmount),
      totalRepaid: FieldValue.increment(totalRepaid),
      pendingSettlement: FieldValue.increment(totalRepaid),
      updatedAt: new Date(),
    });
  }

  async suspend(allocationId: string, updatedBy: string): Promise<void> {
    this.logger.log(`Suspending allocation ${allocationId}`);
    
    await this.allocationsCollection.doc(allocationId).update({
      status: 'suspended',
      updatedAt: new Date(),
      updatedBy,
    });
  }

  async findAll(filters?: { status?: string }): Promise<MerchantAllocation[]> {
    let query: any = this.allocationsCollection.orderBy('createdAt', 'desc');
    
    if (filters?.status) {
      query = this.allocationsCollection.where('status', '==', filters.status);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as MerchantAllocation);
  }
}
