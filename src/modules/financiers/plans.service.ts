import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { FirebaseService } from '../../config/firebase.config';
import { CreateFinancingPlanDto } from './dto/create-plan.dto';
import { UpdateFinancingPlanDto } from './dto/update-plan.dto';
import { UpdatePlanStatusDto } from './dto/update-plan-status.dto';
import { NotificationsService } from '../notifications/notifications.service';
import * as admin from 'firebase-admin';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private firebaseService: FirebaseService,
    private notificationsService: NotificationsService,
  ) {}

  async createPlan(financierId: string, dto: CreateFinancingPlanDto) {
    const db = this.firebaseService.getFirestore();

    // Validate minimumAmount < maximumAmount
    if (dto.minimumAmount >= dto.maximumAmount) {
      throw new BadRequestException('Minimum amount must be less than maximum amount');
    }

    // Create plan document
    const planRef = db.collection('crl_financing_plans').doc();

    // Convert nested DTOs to plain objects for Firestore compatibility
    const plan = {
      planId: planRef.id,
      financierId,
      name: dto.name,
      description: dto.description || '',
      tenor: {
        value: dto.tenor.value,
        period: dto.tenor.period,
      },
      interestRate: dto.interestRate,
      minimumAmount: dto.minimumAmount,
      maximumAmount: dto.maximumAmount,
      gracePeriod: {
        value: dto.gracePeriod.value,
        period: dto.gracePeriod.period,
      },
      lateFee: {
        type: dto.lateFee.type,
        amount: dto.lateFee.amount,
      },
      allowEarlyRepayment: dto.allowEarlyRepayment,
      eligibilityCriteria: dto.eligibilityCriteria ? {
        minCreditScore: dto.eligibilityCriteria.minCreditScore,
        minMonthlyIncome: dto.eligibilityCriteria.minMonthlyIncome,
        maxDebtToIncome: dto.eligibilityCriteria.maxDebtToIncome,
        minEmploymentMonths: dto.eligibilityCriteria.minEmploymentMonths,
        allowedEmailDomains: dto.eligibilityCriteria.allowedEmailDomains || [],
        allowedCategories: dto.eligibilityCriteria.allowedCategories || [],
      } : {},
      status: 'pending', // Plans start as pending until admin approves
      isActive: false, // Admin controls active state
      totalFundsAllocated: 0, // Total funds received from financier
      fundsAllocatedToMerchants: 0, // Funds allocated to merchants via mappings
      totalLoansCreated: 0,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await planRef.set(plan);

    // Get financier details for the email
    const financierDoc = await db.collection('crl_financiers').doc(financierId).get();
    if (financierDoc.exists) {
      const financier = financierDoc.data();

      // Send notification email to admin (don't await to avoid blocking plan creation)
      this.notificationsService
        .sendPlanCreationNotificationToAdmin({
          financierName: financier?.companyName || 'Unknown',
          financierEmail: financier?.email || '',
          planName: dto.name,
          planDescription: dto.description,
          interestRate: dto.interestRate,
          tenorValue: dto.tenor.value,
          tenorPeriod: dto.tenor.period,
          minimumAmount: dto.minimumAmount,
          maximumAmount: dto.maximumAmount,
          gracePeriodValue: dto.gracePeriod.value,
          gracePeriodPeriod: dto.gracePeriod.period,
        })
        .catch((err) => this.logger.error(`Failed to send plan notification email: ${err.message}`));
    }

    return {
      message: 'Financing plan created successfully and pending admin approval',
      plan,
    };
  }

  async getAllPlans() {
    const db = this.firebaseService.getFirestore();

    // Fetch all plans ordered by createdAt
    const snapshot = await db
      .collection('crl_financing_plans')
      .orderBy('createdAt', 'desc')
      .get();

    const plans = snapshot.docs.map((doc) => doc.data());

    // Return all plans for admin to manage (pending, approved, active, inactive)
    return plans;
  }

  async getPlans(financierId: string) {
    const db = this.firebaseService.getFirestore();

    // Fetch all plans ordered by createdAt
    // We filter in-memory to avoid Firestore composite index requirement
    const snapshot = await db
      .collection('crl_financing_plans')
      .orderBy('createdAt', 'desc')
      .get();

    const plans = snapshot.docs.map((doc) => doc.data());

    // Filter by financierId in-memory
    return plans.filter((plan) => plan.financierId === financierId);
  }

  async getPlanById(planId: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('crl_financing_plans').doc(planId).get();

    if (!doc.exists) {
      throw new BadRequestException('Plan not found');
    }

    return doc.data();
  }

  async updatePlan(
    financierId: string,
    planId: string,
    updates: UpdateFinancingPlanDto,
  ) {
    const db = this.firebaseService.getFirestore();

    // Verify ownership
    const planDoc = await db.collection('crl_financing_plans').doc(planId).get();
    if (!planDoc.exists) {
      throw new BadRequestException('Plan not found');
    }

    const plan = planDoc.data();
    if (!plan) {
      throw new BadRequestException('Plan data not found');
    }

    if (plan.financierId !== financierId) {
      throw new BadRequestException('Unauthorized to update this plan');
    }

    // Only allow updates if plan is still pending
    if (plan.status !== 'pending') {
      throw new BadRequestException('Cannot update plan after admin approval');
    }

    // Validate minimumAmount < maximumAmount if both provided
    const newMinAmount = updates.minimumAmount ?? plan.minimumAmount;
    const newMaxAmount = updates.maximumAmount ?? plan.maximumAmount;
    if (newMinAmount && newMaxAmount && newMinAmount >= newMaxAmount) {
      throw new BadRequestException('Minimum amount must be less than maximum amount');
    }

    // Convert nested DTOs to plain objects for Firestore compatibility
    const updateData: any = {
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.tenor) {
      updateData.tenor = {
        value: updates.tenor.value,
        period: updates.tenor.period,
      };
    }
    if (updates.interestRate !== undefined) updateData.interestRate = updates.interestRate;
    if (updates.minimumAmount !== undefined) updateData.minimumAmount = updates.minimumAmount;
    if (updates.maximumAmount !== undefined) updateData.maximumAmount = updates.maximumAmount;
    if (updates.gracePeriod) {
      updateData.gracePeriod = {
        value: updates.gracePeriod.value,
        period: updates.gracePeriod.period,
      };
    }
    if (updates.lateFee) {
      updateData.lateFee = {
        type: updates.lateFee.type,
        amount: updates.lateFee.amount,
      };
    }
    if (updates.allowEarlyRepayment !== undefined) updateData.allowEarlyRepayment = updates.allowEarlyRepayment;
    if (updates.eligibilityCriteria) {
      updateData.eligibilityCriteria = {
        minCreditScore: updates.eligibilityCriteria.minCreditScore,
        minMonthlyIncome: updates.eligibilityCriteria.minMonthlyIncome,
        maxDebtToIncome: updates.eligibilityCriteria.maxDebtToIncome,
        minEmploymentMonths: updates.eligibilityCriteria.minEmploymentMonths,
        allowedEmailDomains: updates.eligibilityCriteria.allowedEmailDomains || [],
        allowedCategories: updates.eligibilityCriteria.allowedCategories || [],
      };
    }

    await db
      .collection('crl_financing_plans')
      .doc(planId)
      .update(updateData);

    return {
      message: 'Plan updated successfully',
    };
  }

  async deactivatePlan(financierId: string, planId: string) {
    const db = this.firebaseService.getFirestore();

    // Verify ownership
    const planDoc = await db.collection('crl_financing_plans').doc(planId).get();
    if (!planDoc.exists) {
      throw new BadRequestException('Plan not found');
    }

    const plan = planDoc.data();
    if (!plan) {
      throw new BadRequestException('Plan data not found');
    }

    if (plan.financierId !== financierId) {
      throw new BadRequestException('Unauthorized to deactivate this plan');
    }

    await db.collection('crl_financing_plans').doc(planId).update({
      status: 'inactive',
      deactivatedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return {
      message: 'Plan deactivated successfully',
    };
  }

  // Admin-only methods
  async approvePlan(planId: string, fundsAllocated: number) {
    const db = this.firebaseService.getFirestore();

    // Get the plan
    const planDoc = await db.collection('crl_financing_plans').doc(planId).get();
    if (!planDoc.exists) {
      throw new BadRequestException('Plan not found');
    }

    const plan = planDoc.data();
    if (!plan) {
      throw new BadRequestException('Plan data not found');
    }

    if (plan.status !== 'pending') {
      throw new BadRequestException('Only pending plans can be approved');
    }

    if (!fundsAllocated || fundsAllocated <= 0) {
      throw new BadRequestException('Funds allocated must be greater than 0');
    }

    // Validate that funds don't exceed plan maximum
    if (fundsAllocated > plan.maximumAmount) {
      throw new BadRequestException(
        `Funds allocated cannot exceed plan maximum of ₦${plan.maximumAmount.toLocaleString()}`,
      );
    }

    // Update plan status to approved and set total funds allocated
    await db.collection('crl_financing_plans').doc(planId).update({
      status: 'approved',
      totalFundsAllocated: fundsAllocated,
      fundsAllocatedToMerchants: 0,
      approvedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Update financier's availableFunds (funds from plan approval)
    const financierRef = db.collection('crl_financiers').doc(plan.financierId);
    const financierDoc = await financierRef.get();

    if (financierDoc.exists) {
      const financier = financierDoc.data();
      const currentAvailable = financier?.availableFunds || 0;

      await financierRef.update({
        availableFunds: currentAvailable + fundsAllocated,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }

    return {
      message: 'Plan approved successfully and funds allocated to financier',
    };
  }

  async allocateFunds(planId: string, additionalFunds: number) {
    const db = this.firebaseService.getFirestore();

    // Get the plan
    const planDoc = await db.collection('crl_financing_plans').doc(planId).get();
    if (!planDoc.exists) {
      throw new BadRequestException('Plan not found');
    }

    const plan = planDoc.data();
    if (!plan) {
      throw new BadRequestException('Plan data not found');
    }

    if (plan.status !== 'approved') {
      throw new BadRequestException('Only approved plans can have funds allocated');
    }

    if (!additionalFunds || additionalFunds <= 0) {
      throw new BadRequestException('Additional funds must be greater than 0');
    }

    const currentFunds = plan.totalFundsAllocated || 0;
    const newTotalFunds = currentFunds + additionalFunds;

    // Validate that new total doesn't exceed plan maximum
    if (newTotalFunds > plan.maximumAmount) {
      throw new BadRequestException(
        `Total funds cannot exceed plan maximum of ₦${plan.maximumAmount.toLocaleString()}. Current: ₦${currentFunds.toLocaleString()}, Attempting to add: ₦${additionalFunds.toLocaleString()}`,
      );
    }

    // Update plan's total funds and ensure fundsAllocatedToMerchants exists
    const updateData: any = {
      totalFundsAllocated: newTotalFunds,
      updatedAt: admin.firestore.Timestamp.now(),
    };
    
    // Initialize fundsAllocatedToMerchants if it doesn't exist
    if (plan.fundsAllocatedToMerchants === undefined) {
      updateData.fundsAllocatedToMerchants = 0;
    }
    
    await db.collection('crl_financing_plans').doc(planId).update(updateData);

    // Update financier's availableFunds (additional funds from financier)
    const financierRef = db.collection('crl_financiers').doc(plan.financierId);
    const financierDoc = await financierRef.get();

    if (financierDoc.exists) {
      const financier = financierDoc.data();
      const currentAvailable = financier?.availableFunds || 0;

      await financierRef.update({
        availableFunds: currentAvailable + additionalFunds,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }

    return {
      message: `Successfully allocated ₦${additionalFunds.toLocaleString()} to plan. New total: ₦${newTotalFunds.toLocaleString()}`,
      previousTotal: currentFunds,
      additionalFunds,
      newTotal: newTotalFunds,
    };
  }

  async updatePlanStatus(planId: string, statusDto: UpdatePlanStatusDto) {
    const db = this.firebaseService.getFirestore();

    // Get the plan
    const planDoc = await db.collection('crl_financing_plans').doc(planId).get();
    if (!planDoc.exists) {
      throw new BadRequestException('Plan not found');
    }

    const plan = planDoc.data();
    if (!plan) {
      throw new BadRequestException('Plan data not found');
    }

    if (plan.status !== 'approved') {
      throw new BadRequestException('Only approved plans can be enabled/disabled');
    }

    const updateData: any = {
      isActive: statusDto.isActive,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (statusDto.isActive) {
      updateData.activatedAt = admin.firestore.Timestamp.now();
    } else {
      updateData.deactivatedAt = admin.firestore.Timestamp.now();
    }

    await db.collection('crl_financing_plans').doc(planId).update(updateData);

    return {
      message: `Plan ${statusDto.isActive ? 'enabled' : 'disabled'} successfully`,
    };
  }

  async getLoans(financierId: string) {
    const db = this.firebaseService.getFirestore();

    // Fetch all loans ordered by createdAt
    // We filter in-memory to avoid Firestore composite index requirement
    const snapshot = await db
      .collection('crl_loans')
      .orderBy('createdAt', 'desc')
      .get();

    const loans = snapshot.docs.map((doc) => doc.data());

    // Filter by financierId and fundingSource in-memory
    return loans.filter(
      (loan) => loan.financierId === financierId && loan.fundingSource === 'financier'
    );
  }

  async getAnalytics(financierId: string) {
    const db = this.firebaseService.getFirestore();

    // Get all loans for this financier
    const loansSnapshot = await db
      .collection('crl_loans')
      .where('financierId', '==', financierId)
      .get();

    const loans = loansSnapshot.docs.map((doc) => doc.data());

    // Calculate metrics
    const totalLoans = loans.length;
    const activeLoans = loans.filter((l) => l.status === 'active').length;
    const completedLoans = loans.filter((l) => l.status === 'completed').length;
    const defaultedLoans = loans.filter((l) => l.status === 'defaulted').length;

    const totalDisbursed = loans.reduce((sum, l) => sum + l.principalAmount, 0);
    const totalRepaid = loans.reduce((sum, l) => sum + (l.amountPaid || 0), 0);
    const outstandingAmount = loans
      .filter((l) => l.status === 'active')
      .reduce((sum, l) => sum + (l.amountRemaining || 0), 0);

    // Get financier profile for fund info
    const financierDoc = await db
      .collection('crl_financiers')
      .doc(financierId)
      .get();
    const financier = financierDoc.data();

    return {
      overview: {
        totalLoans,
        activeLoans,
        completedLoans,
        defaultedLoans,
        defaultRate: totalLoans > 0 ? (defaultedLoans / totalLoans) * 100 : 0,
        repaymentRate: totalDisbursed > 0 ? (totalRepaid / totalDisbursed) * 100 : 0,
      },
      financials: {
        availableFunds: financier?.availableFunds || 0,
        allocatedFunds: financier?.allocatedFunds || 0,
        totalDisbursed,
        totalRepaid,
        outstandingAmount,
        totalRevenue: totalRepaid - totalDisbursed, // Interest + fees
      },
    };
  }
}
