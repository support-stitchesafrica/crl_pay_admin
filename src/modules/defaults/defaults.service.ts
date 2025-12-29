import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Default,
  DefaultStats,
  EscalationLevel,
  ContactAttempt,
  PaymentPlan,
  ESCALATION_THRESHOLDS,
  LATE_FEE_CONFIG,
} from '../../entities/default.entity';
import {
  RecordContactAttemptDto,
  CreatePaymentPlanDto,
  UpdateDefaultDto,
  DefaultQueryDto,
} from './dto/default.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DefaultsService {
  private readonly logger = new Logger(DefaultsService.name);
  private defaultsCollection: FirebaseFirestore.CollectionReference;
  private loansCollection: FirebaseFirestore.CollectionReference;

  constructor(@Inject('FIRESTORE') private firestore: Firestore) {
    this.defaultsCollection = this.firestore.collection('crl_defaults');
    this.loansCollection = this.firestore.collection('crl_loans');
  }

  /**
   * Create a new default record for an overdue loan
   */
  async createDefault(
    loanId: string,
    customerId: string,
    merchantId: string,
    amountOverdue: number,
    daysOverdue: number,
  ): Promise<Default> {
    // Check if default already exists for this loan
    const existingSnapshot = await this.defaultsCollection
      .where('loanId', '==', loanId)
      .where('resolutionStatus', '==', 'pending')
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      // Update existing default instead
      const existingDefault = existingSnapshot.docs[0];
      return this.updateDefaultMetrics(existingDefault.id, amountOverdue, daysOverdue);
    }

    const defaultId = uuidv4();
    const now = new Date();
    const escalationLevel = this.calculateEscalationLevel(daysOverdue);
    const lateFees = this.calculateLateFees(amountOverdue, daysOverdue);

    const defaultRecord: Default = {
      defaultId,
      loanId,
      customerId,
      merchantId,
      daysOverdue,
      amountOverdue,
      totalOutstanding: amountOverdue + lateFees,
      lateFees,
      escalationLevel,
      contactAttempts: [],
      totalContactAttempts: 0,
      resolutionStatus: 'pending',
      reportedToCreditBureau: false,
      createdAt: now,
      updatedAt: now,
    };

    await this.defaultsCollection.doc(defaultId).set(defaultRecord);
    this.logger.log(`Default created: ${defaultId} for loan: ${loanId}`);

    return defaultRecord;
  }

  /**
   * Update default metrics (called when loan becomes more overdue)
   */
  private async updateDefaultMetrics(
    defaultId: string,
    amountOverdue: number,
    daysOverdue: number,
  ): Promise<Default> {
    const defaultRecord = await this.findOne(defaultId);
    const previousLevel = defaultRecord.escalationLevel;
    const newLevel = this.calculateEscalationLevel(daysOverdue);
    const lateFees = this.calculateLateFees(amountOverdue, daysOverdue);
    const now = new Date();

    const updateData: Partial<Default> = {
      daysOverdue,
      amountOverdue,
      lateFees,
      totalOutstanding: amountOverdue + lateFees,
      escalationLevel: newLevel,
      updatedAt: now,
    };

    // Track escalation changes
    if (newLevel !== previousLevel) {
      updateData.previousEscalationLevel = previousLevel;
      updateData.escalatedAt = now;
      this.logger.log(`Default ${defaultId} escalated from ${previousLevel} to ${newLevel}`);
    }

    await this.defaultsCollection.doc(defaultId).update(updateData);

    return { ...defaultRecord, ...updateData } as Default;
  }

  /**
   * Calculate escalation level based on days overdue
   */
  private calculateEscalationLevel(daysOverdue: number): EscalationLevel {
    if (daysOverdue >= ESCALATION_THRESHOLDS.terminal) return 'terminal';
    if (daysOverdue >= ESCALATION_THRESHOLDS.critical) return 'critical';
    if (daysOverdue >= ESCALATION_THRESHOLDS.high) return 'high';
    if (daysOverdue >= ESCALATION_THRESHOLDS.medium) return 'medium';
    return 'low';
  }

  /**
   * Calculate late fees based on amount and days overdue
   */
  calculateLateFees(amountOverdue: number, daysOverdue: number): number {
    if (daysOverdue <= LATE_FEE_CONFIG.gracePeriodDays) {
      return 0;
    }

    const daysAfterGrace = daysOverdue - LATE_FEE_CONFIG.gracePeriodDays;
    const penaltyPercentage = daysAfterGrace * LATE_FEE_CONFIG.dailyPenaltyRate;
    const cappedPercentage = Math.min(penaltyPercentage, LATE_FEE_CONFIG.maxPenaltyPercentage);

    return Math.ceil((amountOverdue * cappedPercentage) / 100);
  }

  /**
   * Record a contact attempt
   */
  async recordContactAttempt(
    defaultId: string,
    dto: RecordContactAttemptDto,
    agentId?: string,
  ): Promise<Default> {
    const defaultRecord = await this.findOne(defaultId);
    const now = new Date();

    const contactAttempt: ContactAttempt = {
      method: dto.method,
      attemptedAt: now,
      successful: dto.successful,
      notes: dto.notes,
      agentId,
    };

    const updateData: Partial<Default> = {
      contactAttempts: [...defaultRecord.contactAttempts, contactAttempt],
      totalContactAttempts: defaultRecord.totalContactAttempts + 1,
      lastContactDate: now,
      lastContactMethod: dto.method,
      updatedAt: now,
    };

    await this.defaultsCollection.doc(defaultId).update(updateData);
    this.logger.log(`Contact attempt recorded for default: ${defaultId}`);

    return { ...defaultRecord, ...updateData } as Default;
  }

  /**
   * Create a payment plan for restructuring
   */
  async createPaymentPlan(defaultId: string, dto: CreatePaymentPlanDto): Promise<Default> {
    const defaultRecord = await this.findOne(defaultId);

    if (defaultRecord.paymentPlan?.status === 'active') {
      throw new BadRequestException('An active payment plan already exists');
    }

    const startDate = new Date(dto.startDate);
    const installmentAmount = Math.ceil(dto.restructuredAmount / dto.numberOfInstallments);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (dto.numberOfInstallments * 7)); // Weekly payments

    const paymentPlan: PaymentPlan = {
      planId: uuidv4(),
      originalAmount: dto.originalAmount,
      restructuredAmount: dto.restructuredAmount,
      numberOfInstallments: dto.numberOfInstallments,
      installmentAmount,
      startDate,
      endDate,
      status: 'active',
      createdAt: new Date(),
    };

    const updateData: Partial<Default> = {
      paymentPlan,
      resolutionStatus: 'payment_plan',
      updatedAt: new Date(),
    };

    await this.defaultsCollection.doc(defaultId).update(updateData);
    this.logger.log(`Payment plan created for default: ${defaultId}`);

    return { ...defaultRecord, ...updateData } as Default;
  }

  /**
   * Update default record
   */
  async update(defaultId: string, dto: UpdateDefaultDto): Promise<Default> {
    const defaultRecord = await this.findOne(defaultId);
    const now = new Date();

    const updateData: Partial<Default> = {
      updatedAt: now,
    };

    if (dto.escalationLevel) {
      updateData.escalationLevel = dto.escalationLevel;
    }
    if (dto.resolutionStatus) {
      updateData.resolutionStatus = dto.resolutionStatus;
    }
    if (dto.resolutionDetails) {
      updateData.resolutionDetails = dto.resolutionDetails;
    }
    if (dto.nextContactDate) {
      updateData.nextContactDate = new Date(dto.nextContactDate);
    }

    if (dto.resolutionStatus === 'resolved') {
      updateData.resolvedAt = now;
    }

    await this.defaultsCollection.doc(defaultId).update(updateData);
    this.logger.log(`Default updated: ${defaultId}`);

    return { ...defaultRecord, ...updateData } as Default;
  }

  /**
   * Mark default as reported to credit bureau
   */
  async reportToCreditBureau(defaultId: string, reason?: string): Promise<Default> {
    const defaultRecord = await this.findOne(defaultId);

    if (defaultRecord.reportedToCreditBureau) {
      throw new BadRequestException('Already reported to credit bureau');
    }

    const now = new Date();
    const updateData: Partial<Default> = {
      reportedToCreditBureau: true,
      creditBureauReportDate: now,
      resolutionDetails: reason
        ? `${defaultRecord.resolutionDetails || ''}\nReported to credit bureau: ${reason}`.trim()
        : defaultRecord.resolutionDetails,
      updatedAt: now,
    };

    await this.defaultsCollection.doc(defaultId).update(updateData);
    this.logger.log(`Default ${defaultId} reported to credit bureau`);

    // TODO: Integrate with actual credit bureau API
    // await this.creditBureauService.report(defaultRecord);

    return { ...defaultRecord, ...updateData } as Default;
  }

  /**
   * Write off a default (mark as uncollectable)
   */
  async writeOff(defaultId: string, reason: string, agentId?: string): Promise<Default> {
    const defaultRecord = await this.findOne(defaultId);
    const now = new Date();

    const updateData: Partial<Default> = {
      resolutionStatus: 'written_off',
      resolutionDetails: reason,
      resolvedAt: now,
      resolvedBy: agentId,
      updatedAt: now,
    };

    await this.defaultsCollection.doc(defaultId).update(updateData);
    this.logger.log(`Default ${defaultId} written off: ${reason}`);

    // Update loan status to defaulted
    await this.loansCollection.doc(defaultRecord.loanId).update({
      status: 'defaulted',
      defaultedAt: now,
      updatedAt: now,
    });

    return { ...defaultRecord, ...updateData } as Default;
  }

  /**
   * Resolve a default (mark as paid/resolved)
   */
  async resolve(defaultId: string, details?: string, agentId?: string): Promise<Default> {
    const defaultRecord = await this.findOne(defaultId);
    const now = new Date();

    const updateData: Partial<Default> = {
      resolutionStatus: 'resolved',
      resolutionDetails: details || 'Fully paid',
      resolvedAt: now,
      resolvedBy: agentId,
      updatedAt: now,
    };

    await this.defaultsCollection.doc(defaultId).update(updateData);
    this.logger.log(`Default ${defaultId} resolved`);

    return { ...defaultRecord, ...updateData } as Default;
  }

  /**
   * Find all defaults with filters
   */
  async findAll(filters?: DefaultQueryDto): Promise<Default[]> {
    let query: FirebaseFirestore.Query = this.defaultsCollection;

    if (filters?.merchantId) {
      query = query.where('merchantId', '==', filters.merchantId);
    }

    if (filters?.customerId) {
      query = query.where('customerId', '==', filters.customerId);
    }

    if (filters?.escalationLevel) {
      query = query.where('escalationLevel', '==', filters.escalationLevel);
    }

    if (filters?.resolutionStatus) {
      query = query.where('resolutionStatus', '==', filters.resolutionStatus);
    }

    query = query.orderBy('createdAt', 'desc');

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => this.docToDefault(doc));
  }

  /**
   * Find one default by ID
   */
  async findOne(defaultId: string): Promise<Default> {
    const doc = await this.defaultsCollection.doc(defaultId).get();

    if (!doc.exists) {
      throw new NotFoundException(`Default with ID ${defaultId} not found`);
    }

    return this.docToDefault(doc);
  }

  /**
   * Find default by loan ID
   */
  async findByLoanId(loanId: string): Promise<Default | null> {
    const snapshot = await this.defaultsCollection
      .where('loanId', '==', loanId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return this.docToDefault(snapshot.docs[0]);
  }

  /**
   * Get default statistics
   */
  async getStats(merchantId?: string): Promise<DefaultStats> {
    let query: FirebaseFirestore.Query = this.defaultsCollection;

    if (merchantId) {
      query = query.where('merchantId', '==', merchantId);
    }

    const snapshot = await query.get();
    const defaults = snapshot.docs.map((doc) => this.docToDefault(doc));

    const activeDefaults = defaults.filter((d) => d.resolutionStatus === 'pending');
    const resolvedDefaults = defaults.filter((d) => d.resolutionStatus === 'resolved');
    const writtenOffDefaults = defaults.filter((d) => d.resolutionStatus === 'written_off');

    const totalAmountOverdue = activeDefaults.reduce((sum, d) => sum + d.amountOverdue, 0);
    const totalLateFees = activeDefaults.reduce((sum, d) => sum + d.lateFees, 0);
    const totalDaysOverdue = activeDefaults.reduce((sum, d) => sum + d.daysOverdue, 0);

    const byEscalationLevel = {
      low: activeDefaults.filter((d) => d.escalationLevel === 'low').length,
      medium: activeDefaults.filter((d) => d.escalationLevel === 'medium').length,
      high: activeDefaults.filter((d) => d.escalationLevel === 'high').length,
      critical: activeDefaults.filter((d) => d.escalationLevel === 'critical').length,
      terminal: activeDefaults.filter((d) => d.escalationLevel === 'terminal').length,
    };

    const recoveryRate = defaults.length > 0
      ? (resolvedDefaults.length / defaults.length) * 100
      : 0;

    return {
      totalDefaults: defaults.length,
      activeDefaults: activeDefaults.length,
      resolvedDefaults: resolvedDefaults.length,
      writtenOffDefaults: writtenOffDefaults.length,
      totalAmountOverdue,
      totalLateFees,
      byEscalationLevel,
      averageDaysOverdue: activeDefaults.length > 0
        ? Math.round(totalDaysOverdue / activeDefaults.length)
        : 0,
      recoveryRate: Math.round(recoveryRate * 100) / 100,
    };
  }

  /**
   * Process overdue loans and create/update defaults
   * Runs daily at 6 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async processOverdueLoans(): Promise<void> {
    this.logger.log('Processing overdue loans for defaults...');

    try {
      const now = new Date();

      // Get all active loans
      const loansSnapshot = await this.loansCollection
        .where('status', '==', 'active')
        .get();

      let processedCount = 0;

      for (const loanDoc of loansSnapshot.docs) {
        const loan = loanDoc.data();

        // Check payment schedule for overdue payments
        const overduePayments = (loan.paymentSchedule || []).filter((p: any) => {
          if (p.status === 'paid') return false;
          const dueDate = p.dueDate?.toDate ? p.dueDate.toDate() : new Date(p.dueDate);
          return dueDate < now;
        });

        if (overduePayments.length > 0) {
          const oldestOverdue = overduePayments[0];
          const dueDate = oldestOverdue.dueDate?.toDate
            ? oldestOverdue.dueDate.toDate()
            : new Date(oldestOverdue.dueDate);
          const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

          const amountOverdue = overduePayments.reduce((sum: number, p: any) => sum + p.amount, 0);

          await this.createDefault(
            loan.loanId,
            loan.customerId,
            loan.merchantId,
            amountOverdue,
            daysOverdue,
          );

          processedCount++;
        }
      }

      this.logger.log(`Processed ${processedCount} overdue loans`);
    } catch (error) {
      this.logger.error(`Failed to process overdue loans: ${error.message}`);
    }
  }

  /**
   * Convert Firestore document to Default
   */
  private docToDefault(doc: FirebaseFirestore.DocumentSnapshot): Default {
    const data = doc.data() as any;
    return {
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      escalatedAt: data.escalatedAt?.toDate ? data.escalatedAt.toDate() : data.escalatedAt,
      lastContactDate: data.lastContactDate?.toDate ? data.lastContactDate.toDate() : data.lastContactDate,
      nextContactDate: data.nextContactDate?.toDate ? data.nextContactDate.toDate() : data.nextContactDate,
      resolvedAt: data.resolvedAt?.toDate ? data.resolvedAt.toDate() : data.resolvedAt,
      creditBureauReportDate: data.creditBureauReportDate?.toDate
        ? data.creditBureauReportDate.toDate()
        : data.creditBureauReportDate,
      contactAttempts: (data.contactAttempts || []).map((c: any) => ({
        ...c,
        attemptedAt: c.attemptedAt?.toDate ? c.attemptedAt.toDate() : new Date(c.attemptedAt),
      })),
      paymentPlan: data.paymentPlan
        ? {
            ...data.paymentPlan,
            startDate: data.paymentPlan.startDate?.toDate
              ? data.paymentPlan.startDate.toDate()
              : new Date(data.paymentPlan.startDate),
            endDate: data.paymentPlan.endDate?.toDate
              ? data.paymentPlan.endDate.toDate()
              : new Date(data.paymentPlan.endDate),
            createdAt: data.paymentPlan.createdAt?.toDate
              ? data.paymentPlan.createdAt.toDate()
              : new Date(data.paymentPlan.createdAt),
          }
        : undefined,
    } as Default;
  }
}
