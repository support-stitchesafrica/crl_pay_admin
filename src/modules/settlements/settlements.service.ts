import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { SettlementRequest, SettlementBreakdown } from '../../entities/settlement-request.entity';
import { AllocationsService } from '../allocations/allocations.service';
import { CapitalService } from '../capital/capital.service';
import { CreateSettlementRequestDto } from './dto/create-settlement-request.dto';

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);
  private settlementsCollection: FirebaseFirestore.CollectionReference;

  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private allocationsService: AllocationsService,
    private capitalService: CapitalService,
    private configService: ConfigService,
  ) {
    this.settlementsCollection = this.firestore.collection('crl_settlement_requests');
  }

  async createRequest(dto: CreateSettlementRequestDto, requestedBy: string): Promise<SettlementRequest> {
    this.logger.log(`Creating settlement request for merchant ${dto.merchantId}`);
    
    const allocation = await this.allocationsService.findByMerchant(dto.merchantId);
    if (!allocation) {
      throw new NotFoundException('Merchant has no active allocation');
    }
    
    const calculation = await this.calculateSettlementAmount(dto.merchantId, allocation.allocationId);
    
    if (calculation.breakdown.completedLoansCount === 0) {
      throw new BadRequestException('No completed loans to settle');
    }
    
    const settlementId = uuidv4();
    const now = new Date();
    
    const settlement: SettlementRequest = {
      settlementId,
      merchantId: dto.merchantId,
      allocationId: allocation.allocationId,
      requestedAmount: calculation.totalAmount,
      approvedAmount: calculation.totalAmount,
      breakdown: calculation.breakdown,
      requestedBy,
      requestedAt: now,
      requestNotes: dto.requestNotes,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    
    await this.settlementsCollection.doc(settlementId).set(settlement);
    
    this.logger.log(`Settlement request created: ${settlementId} for ₦${calculation.totalAmount}`);
    return settlement;
  }

  async calculateSettlementAmount(merchantId: string, allocationId: string): Promise<{
    totalAmount: number;
    breakdown: SettlementBreakdown;
  }> {
    const loansSnapshot = await this.firestore
      .collection('crl_loans')
      .where('merchantId', '==', merchantId)
      .where('allocationId', '==', allocationId)
      .where('status', '==', 'completed')
      .where('settled', '==', false)
      .get();
    
    let principalRepaid = 0;
    let interestEarned = 0;
    let penaltiesCollected = 0;
    const loanIds: string[] = [];
    
    loansSnapshot.forEach(doc => {
      const loan = doc.data();
      loanIds.push(loan.loanId);
      principalRepaid += loan.principalAmount;
      interestEarned += loan.configuration.totalInterest;
      
      loan.paymentSchedule?.forEach((schedule: any) => {
        if (schedule.lateFee) {
          penaltiesCollected += schedule.lateFee;
        }
      });
    });
    
    const breakdown: SettlementBreakdown = {
      completedLoansCount: loansSnapshot.size,
      principalRepaid,
      interestEarned,
      penaltiesCollected,
      loanIds,
    };
    
    const totalAmount = principalRepaid + interestEarned + penaltiesCollected;
    
    return { totalAmount, breakdown };
  }

  async approveRequest(settlementId: string, approvedBy: string, approvalNotes?: string): Promise<SettlementRequest> {
    this.logger.log(`Approving settlement request ${settlementId}`);
    
    const settlement = await this.findOne(settlementId);
    
    if (settlement.status !== 'pending') {
      throw new BadRequestException(`Settlement is ${settlement.status}, cannot approve`);
    }
    
    await this.settlementsCollection.doc(settlementId).update({
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
      approvalNotes,
      updatedAt: new Date(),
    });
    
    return this.findOne(settlementId);
  }

  async rejectRequest(settlementId: string, rejectedBy: string, rejectionReason: string): Promise<SettlementRequest> {
    this.logger.log(`Rejecting settlement request ${settlementId}`);
    
    const settlement = await this.findOne(settlementId);
    
    if (settlement.status !== 'pending') {
      throw new BadRequestException(`Settlement is ${settlement.status}, cannot reject`);
    }
    
    await this.settlementsCollection.doc(settlementId).update({
      status: 'rejected',
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason,
      updatedAt: new Date(),
    });
    
    return this.findOne(settlementId);
  }

  async processPayout(settlementId: string, paidBy: string): Promise<SettlementRequest> {
    this.logger.log(`Processing payout for settlement ${settlementId}`);
    
    const settlement = await this.findOne(settlementId);
    
    if (settlement.status !== 'approved') {
      throw new BadRequestException('Settlement must be approved before payout');
    }
    
    const merchantDoc = await this.firestore
      .collection('crl_merchants')
      .doc(settlement.merchantId)
      .get();
    
    if (!merchantDoc.exists) {
      throw new NotFoundException('Merchant not found');
    }
    
    const payoutReference = `SETTLE-${settlementId}`;
    
    await this.settlementsCollection.doc(settlementId).update({
      status: 'paid',
      paidBy,
      paidAt: new Date(),
      payoutReference,
      updatedAt: new Date(),
    });
    
    for (const loanId of settlement.breakdown.loanIds) {
      await this.firestore.collection('crl_loans').doc(loanId).update({
        settled: true,
        settlementId,
        settledAt: new Date(),
      });
    }
    
    await this.firestore
      .collection('crl_merchant_allocations')
      .doc(settlement.allocationId)
      .update({
        pendingSettlement: 0,
        totalSettled: settlement.approvedAmount,
        updatedAt: new Date(),
      });
    
    await this.capitalService.recordSettlement(settlement.approvedAmount);
    
    this.logger.log(`Payout processed: ${payoutReference}`);
    return this.findOne(settlementId);
  }

  async findOne(settlementId: string): Promise<SettlementRequest> {
    const doc = await this.settlementsCollection.doc(settlementId).get();
    
    if (!doc.exists) {
      throw new NotFoundException('Settlement request not found');
    }
    
    return doc.data() as SettlementRequest;
  }

  async getPendingRequests(): Promise<SettlementRequest[]> {
    const snapshot = await this.settlementsCollection
      .where('status', '==', 'pending')
      .orderBy('requestedAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as SettlementRequest);
  }

  async getRequestsByMerchant(merchantId: string): Promise<SettlementRequest[]> {
    const snapshot = await this.settlementsCollection
      .where('merchantId', '==', merchantId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as SettlementRequest);
  }

  async findAll(filters?: { status?: string }): Promise<SettlementRequest[]> {
    let query: any = this.settlementsCollection.orderBy('createdAt', 'desc');
    
    if (filters?.status) {
      query = this.settlementsCollection
        .where('status', '==', filters.status)
        .orderBy('createdAt', 'desc');
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as SettlementRequest);
  }
}
