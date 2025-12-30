import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../../config/firebase.config';
import * as admin from 'firebase-admin';

@Injectable()
export class PlanMappingsService {
  constructor(private firebaseService: FirebaseService) {}

  async getMappings(filters?: {
    planId?: string;
    merchantId?: string;
    financierId?: string;
  }) {
    const db = this.firebaseService.getFirestore();
    let query: any = db.collection('crl_plan_merchant_mappings');

    if (filters?.planId) {
      query = query.where('planId', '==', filters.planId);
    }
    if (filters?.merchantId) {
      query = query.where('merchantId', '==', filters.merchantId);
    }
    if (filters?.financierId) {
      query = query.where('financierId', '==', filters.financierId);
    }

    const snapshot = await query.get();
    const mappings = snapshot.docs.map((doc) => ({
      mappingId: doc.id,
      ...doc.data(),
    }));

    return mappings;
  }

  async getMappingById(mappingId: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db
      .collection('crl_plan_merchant_mappings')
      .doc(mappingId)
      .get();

    if (!doc.exists) {
      throw new NotFoundException('Mapping not found');
    }

    return {
      mappingId: doc.id,
      ...doc.data(),
    };
  }

  async createMapping(data: {
    planId: string;
    merchantId: string;
    fundsAllocated: number;
    expirationDate: string;
  }) {
    const db = this.firebaseService.getFirestore();

    // Get plan details to extract financierId
    const planDoc = await db
      .collection('crl_financing_plans')
      .doc(data.planId)
      .get();

    if (!planDoc.exists) {
      throw new NotFoundException('Financing plan not found');
    }

    const plan = planDoc.data();
    if (!plan) {
      throw new NotFoundException('Financing plan data not found');
    }

    // Validate plan is active
    if (!plan.isActive) {
      throw new Error('Plan must be enabled before mapping to merchants');
    }

    // Validate funds allocated
    if (!data.fundsAllocated || data.fundsAllocated <= 0) {
      throw new Error('Funds allocated must be greater than 0');
    }

    // Calculate already allocated funds for this plan
    const existingMappingsSnapshot = await db
      .collection('crl_plan_merchant_mappings')
      .where('planId', '==', data.planId)
      .get();

    const totalAllocatedForPlan = existingMappingsSnapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().fundsAllocated || 0),
      0,
    );

    const availableFunds = plan.totalFundsAllocated - totalAllocatedForPlan;

    if (data.fundsAllocated > availableFunds) {
      throw new Error(
        `Insufficient funds. Only ₦${availableFunds.toLocaleString()} available for allocation (₦${totalAllocatedForPlan.toLocaleString()} already allocated out of ₦${plan.totalFundsAllocated.toLocaleString()})`,
      );
    }

    // Validate expiration date
    if (!data.expirationDate) {
      throw new Error('Expiration date is required');
    }

    const expirationDate = new Date(data.expirationDate);
    const now = new Date();
    const minExpiration = new Date(now);

    // Calculate minimum expiration based on plan tenor
    if (plan.tenor.period === 'DAYS') {
      minExpiration.setDate(minExpiration.getDate() + plan.tenor.value);
    } else if (plan.tenor.period === 'WEEKS') {
      minExpiration.setDate(minExpiration.getDate() + plan.tenor.value * 7);
    } else if (plan.tenor.period === 'MONTHS') {
      minExpiration.setMonth(minExpiration.getMonth() + plan.tenor.value);
    } else if (plan.tenor.period === 'YEARS') {
      minExpiration.setFullYear(minExpiration.getFullYear() + plan.tenor.value);
    }

    if (expirationDate <= minExpiration) {
      throw new Error(
        `Expiration date must be after ${minExpiration.toLocaleDateString()} (allocation date + plan tenor)`,
      );
    }

    // Check if mapping already exists
    const existingMapping = await db
      .collection('crl_plan_merchant_mappings')
      .where('planId', '==', data.planId)
      .where('merchantId', '==', data.merchantId)
      .get();

    if (!existingMapping.empty) {
      throw new BadRequestException(
        'This merchant is already mapped to this plan. You can edit or delete the existing mapping instead.',
      );
    }

    // Create mapping
    const mappingRef = db.collection('crl_plan_merchant_mappings').doc();
    const mapping = {
      mappingId: mappingRef.id,
      planId: data.planId,
      merchantId: data.merchantId,
      financierId: plan.financierId,
      fundsAllocated: data.fundsAllocated,
      expirationDate: admin.firestore.Timestamp.fromDate(expirationDate),
      currentAllocation: 0,
      totalLoans: 0,
      totalDisbursed: 0,
      totalRepaid: 0,
      defaultRate: 0,
      status: 'active',
      mappedBy: 'admin', // TODO: Get from authenticated user
      mappedAt: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await mappingRef.set(mapping);

    // Update plan's fundsAllocatedToMerchants
    await db.collection('crl_financing_plans').doc(data.planId).update({
      fundsAllocatedToMerchants: admin.firestore.FieldValue.increment(data.fundsAllocated),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Update financier's allocatedFunds and availableFunds
    await db.collection('crl_financiers').doc(plan.financierId).update({
      allocatedFunds: admin.firestore.FieldValue.increment(data.fundsAllocated),
      availableFunds: admin.firestore.FieldValue.increment(-data.fundsAllocated),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return {
      message: 'Plan-merchant mapping created successfully',
      mapping,
    };
  }

  async updateMapping(
    mappingId: string,
    data: { fundsAllocated?: number; status?: string },
  ) {
    const db = this.firebaseService.getFirestore();
    const mappingRef = db
      .collection('crl_plan_merchant_mappings')
      .doc(mappingId);

    const doc = await mappingRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Mapping not found');
    }

    const mapping = doc.data();
    if (!mapping) {
      throw new NotFoundException('Mapping data not found');
    }

    const updates: any = {
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // If updating fundsAllocated, validate against current usage
    if (data.fundsAllocated !== undefined) {
      const currentUsage = mapping.currentAllocation || 0;
      
      if (data.fundsAllocated < currentUsage) {
        throw new BadRequestException(
          `Cannot reduce allocation below current usage. Current usage: ₦${currentUsage.toLocaleString()}, Attempted allocation: ₦${data.fundsAllocated.toLocaleString()}`,
        );
      }

      // Calculate the difference to update plan's fundsAllocatedToMerchants
      const oldAllocation = mapping.fundsAllocated || 0;
      const difference = data.fundsAllocated - oldAllocation;

      // Validate plan has enough available funds for increase
      if (difference > 0) {
        const planDoc = await db.collection('crl_financing_plans').doc(mapping.planId).get();
        const plan = planDoc.data();
        
        if (plan) {
          const currentAllocated = plan.fundsAllocatedToMerchants || 0;
          const availableFunds = plan.totalFundsAllocated - currentAllocated;
          
          if (difference > availableFunds) {
            throw new BadRequestException(
              `Insufficient funds. Only ₦${availableFunds.toLocaleString()} available for allocation.`,
            );
          }
        }
      }

      updates.fundsAllocated = data.fundsAllocated;

      // Update plan's fundsAllocatedToMerchants
      await db.collection('crl_financing_plans').doc(mapping.planId).update({
        fundsAllocatedToMerchants: admin.firestore.FieldValue.increment(difference),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Update financier's allocatedFunds and availableFunds
      const planDoc = await db.collection('crl_financing_plans').doc(mapping.planId).get();
      const planData = planDoc.data();
      if (planData?.financierId) {
        await db.collection('crl_financiers').doc(planData.financierId).update({
          allocatedFunds: admin.firestore.FieldValue.increment(difference),
          availableFunds: admin.firestore.FieldValue.increment(-difference),
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }
    }

    if (data.status) {
      updates.status = data.status;
    }

    await mappingRef.update(updates);

    return {
      message: 'Mapping updated successfully',
    };
  }

  async deleteMapping(mappingId: string) {
    const db = this.firebaseService.getFirestore();
    const mappingRef = db
      .collection('crl_plan_merchant_mappings')
      .doc(mappingId);

    const doc = await mappingRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Mapping not found');
    }

    // Check if there is active usage
    const mapping = doc.data();
    if (!mapping) {
      throw new NotFoundException('Mapping data not found');
    }

    const currentUsage = mapping.currentAllocation || 0;
    if (currentUsage > 0 || mapping.totalLoans > 0) {
      throw new BadRequestException(
        `Cannot delete mapping with active usage. Current usage: ₦${currentUsage.toLocaleString()}, Total loans: ${mapping.totalLoans}. Please disable the mapping instead.`,
      );
    }

    // Delete the mapping and decrement plan's fundsAllocatedToMerchants
    await mappingRef.delete();

    // Get plan to find financierId
    const planDoc = await db.collection('crl_financing_plans').doc(mapping.planId).get();
    const planData = planDoc.data();

    await db.collection('crl_financing_plans').doc(mapping.planId).update({
      fundsAllocatedToMerchants: admin.firestore.FieldValue.increment(-mapping.fundsAllocated),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Decrement financier's allocatedFunds and increment availableFunds
    if (planData?.financierId) {
      await db.collection('crl_financiers').doc(planData.financierId).update({
        allocatedFunds: admin.firestore.FieldValue.increment(-mapping.fundsAllocated),
        availableFunds: admin.firestore.FieldValue.increment(mapping.fundsAllocated),
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }

    return {
      message: 'Mapping deleted successfully',
    };
  }
}
