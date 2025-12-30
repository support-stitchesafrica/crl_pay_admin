import { Injectable, ConflictException, NotFoundException, Inject, Logger } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import * as bcrypt from 'bcrypt';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { ApproveMerchantDto } from './dto/approve-merchant.dto';
import { Merchant } from '../../entities/merchant.entity';
import { generateApiKey, generateApiSecret } from '../../common/utils/crypto.utils';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);
  private merchantsCollection: FirebaseFirestore.CollectionReference;

  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private notificationsService: NotificationsService,
  ) {
    this.merchantsCollection = this.firestore.collection('crl_merchants');
  }

  async create(createMerchantDto: CreateMerchantDto): Promise<Merchant> {
    try {
      this.logger.log(`Creating new merchant: ${createMerchantDto.businessName} (${createMerchantDto.email})`);

      // Check if merchant with email already exists
      const existingMerchant = await this.merchantsCollection
        .where('email', '==', createMerchantDto.email)
        .get();

      if (!existingMerchant.empty) {
        this.logger.warn(`Merchant registration failed: Email ${createMerchantDto.email} already exists`);
        throw new ConflictException('Merchant with this email already exists');
      }

      // Hash password
      this.logger.log('Hashing merchant password...');
      const passwordHash = await bcrypt.hash(createMerchantDto.password, 10);

      // Create merchant document
      const merchantRef = this.merchantsCollection.doc();
      const merchantId = merchantRef.id;

      // Build business address from components
      const businessAddress = [
        createMerchantDto.address,
        createMerchantDto.city,
        createMerchantDto.state,
        createMerchantDto.country || 'Nigeria',
      ].filter(Boolean).join(', ');

      const merchant: Merchant = {
        merchantId,
        businessName: createMerchantDto.businessName,
        email: createMerchantDto.email,
        phone: createMerchantDto.phone,
        passwordHash,
        businessAddress,
        businessCategory: createMerchantDto.businessCategory,
        status: 'pending',
        settlementAccount: {
          bankName: createMerchantDto.settlementAccount?.bankName || '',
          accountNumber: createMerchantDto.settlementAccount?.accountNumber || '',
          accountName: createMerchantDto.settlementAccount?.accountName || '',
        },
        // Initialize analytics fields
        totalRevenue: 0,
        totalTransactions: 0,
        activeCustomers: 0,
        defaultRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add optional fields only if they have values (Firestore doesn't accept undefined)
      if (createMerchantDto.cacNumber) {
        merchant.cacNumber = createMerchantDto.cacNumber;
      }
      if (createMerchantDto.websiteUrl) {
        merchant.websiteUrl = createMerchantDto.websiteUrl;
      }

      await merchantRef.set(merchant);
      this.logger.log(`Merchant created successfully: ${merchant.businessName} (ID: ${merchantId})`);
      this.logger.log(`Status: pending - awaiting admin approval`);

      // Send registration emails (don't await to avoid blocking registration)
      this.notificationsService
        .sendMerchantRegistrationEmail(merchant.email, merchant.businessName)
        .catch((err) => this.logger.error(`Failed to send registration email: ${err.message}`));

      // Remove passwordHash from response
      const { passwordHash: _, ...merchantResponse } = merchant;
      return merchantResponse as Merchant;
    } catch (error) {
      this.logger.error('Error creating merchant:', error);
      throw error;
    }
  }

  async findAll(status?: string): Promise<Merchant[]> {
    let query = this.merchantsCollection.orderBy('createdAt', 'desc');

    if (status) {
      query = this.merchantsCollection.where('status', '==', status) as any;
    }

    const snapshot = await query.get();
    const merchants: Merchant[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as Merchant;
      const { passwordHash, ...merchantData } = data;
      merchants.push(merchantData as Merchant);
    });

    return merchants;
  }

  async findOne(merchantId: string): Promise<Merchant> {
    this.logger.log(`Finding merchant with ID: ${merchantId}`);
    const doc = await this.merchantsCollection.doc(merchantId).get();

    if (!doc.exists) {
      this.logger.warn(`Merchant not found with ID: ${merchantId}`);
      throw new NotFoundException('Merchant not found');
    }

    const data = doc.data() as Merchant;
    this.logger.log(`Merchant found: ${data.businessName}`);
    const { passwordHash, ...merchantData } = data;

    // Ensure analytics fields have default values for older merchants
    return {
      ...merchantData,
      totalRevenue: merchantData.totalRevenue ?? 0,
      totalTransactions: merchantData.totalTransactions ?? 0,
      activeCustomers: merchantData.activeCustomers ?? 0,
      defaultRate: merchantData.defaultRate ?? 0,
    } as Merchant;
  }

  async findByEmail(email: string): Promise<Merchant | null> {
    const snapshot = await this.merchantsCollection.where('email', '==', email).get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return doc.data() as Merchant;
  }

  async update(merchantId: string, updateMerchantDto: UpdateMerchantDto): Promise<Merchant> {
    try {
      this.logger.log(`Updating merchant ID: ${merchantId}`);

      const merchantRef = this.merchantsCollection.doc(merchantId);
      const doc = await merchantRef.get();

      if (!doc.exists) {
        this.logger.warn(`Merchant not found: ${merchantId}`);
        throw new NotFoundException('Merchant not found');
      }

      await merchantRef.update({
        ...updateMerchantDto,
        updatedAt: new Date(),
      });

      this.logger.log(`Merchant updated successfully: ${merchantId}`);
      return this.findOne(merchantId);
    } catch (error) {
      this.logger.error('Error updating merchant:', error);
      throw error;
    }
  }

  /**
   * Update merchant profile (used by merchants themselves)
   * Only allows updating specific fields
   */
  async updateProfile(merchantId: string, updates: any): Promise<Merchant> {
    try {
      this.logger.log(`Merchant updating own profile: ${merchantId}`);

      const merchantRef = this.merchantsCollection.doc(merchantId);
      const doc = await merchantRef.get();

      if (!doc.exists) {
        this.logger.warn(`Merchant not found: ${merchantId}`);
        throw new NotFoundException('Merchant not found');
      }

      // Only allow updating certain fields
      const allowedUpdates: any = {
        updatedAt: new Date(),
      };

      if (updates.phone !== undefined) {
        allowedUpdates.phone = updates.phone;
      }

      if (updates.businessAddress !== undefined) {
        allowedUpdates.businessAddress = updates.businessAddress;
      }

      if (updates.websiteUrl !== undefined) {
        allowedUpdates.websiteUrl = updates.websiteUrl;
      }

      if (updates.businessCategory !== undefined) {
        allowedUpdates.businessCategory = updates.businessCategory;
      }

      if (updates.cacNumber !== undefined) {
        allowedUpdates.cacNumber = updates.cacNumber;
      }

      if (updates.settlementAccount !== undefined) {
        // Convert to plain object to avoid Firestore serialization issues
        allowedUpdates.settlementAccount = {
          bankName: updates.settlementAccount.bankName || '',
          accountNumber: updates.settlementAccount.accountNumber || '',
          accountName: updates.settlementAccount.accountName || '',
          ...(updates.settlementAccount.bankCode && { bankCode: updates.settlementAccount.bankCode }),
        };

        // Also update legacy fields for backward compatibility
        if (updates.settlementAccount.bankName) {
          allowedUpdates.bankName = updates.settlementAccount.bankName;
        }
        if (updates.settlementAccount.accountNumber) {
          allowedUpdates.accountNumber = updates.settlementAccount.accountNumber;
        }
        if (updates.settlementAccount.accountName) {
          allowedUpdates.accountName = updates.settlementAccount.accountName;
        }
      }

      await merchantRef.update(allowedUpdates);

      this.logger.log(`Merchant profile updated successfully: ${merchantId}`);
      return this.findOne(merchantId);
    } catch (error) {
      this.logger.error('Error updating merchant profile:', error);
      throw error;
    }
  }

  async approve(merchantId: string, approveMerchantDto: ApproveMerchantDto, adminId: string): Promise<Merchant> {
    try {
      this.logger.log(`Processing approval for merchant ID: ${merchantId}`);
      this.logger.log(`New status: ${approveMerchantDto.status}`);

      const merchantRef = this.merchantsCollection.doc(merchantId);
      const doc = await merchantRef.get();

      if (!doc.exists) {
        this.logger.warn(`Merchant not found: ${merchantId}`);
        throw new NotFoundException('Merchant not found');
      }

      const merchantData = doc.data() as Merchant;
      this.logger.log(`Current merchant: ${merchantData.businessName} (${merchantData.email})`);

      const updateData: any = {
        status: approveMerchantDto.status,
        updatedAt: new Date(),
      };

      if (approveMerchantDto.notes) {
        updateData.adminNotes = approveMerchantDto.notes;
        this.logger.log(`Admin notes: ${approveMerchantDto.notes}`);
      }

      // If approved, generate API keys
      if (approveMerchantDto.status === 'approved') {
        this.logger.log('🔑 Generating API keys for approved merchant...');
        updateData.apiKey = generateApiKey();
        updateData.apiSecret = generateApiSecret();
        updateData.approvedAt = new Date();
        updateData.approvedBy = adminId;
        this.logger.log(`API Key: ${updateData.apiKey}`);
        this.logger.log(`API Secret: ${updateData.apiSecret.substring(0, 15)}...`);
      }

      await merchantRef.update(updateData);
      this.logger.log(`Merchant ${approveMerchantDto.status} successfully by admin ${adminId}`);

      // Send appropriate email based on status
      if (approveMerchantDto.status === 'approved') {
        this.notificationsService
          .sendMerchantApprovalEmail(merchantData.email, merchantData.businessName, approveMerchantDto.notes)
          .catch((err) => this.logger.error(`Failed to send approval email: ${err.message}`));
      } else if (approveMerchantDto.status === 'rejected') {
        this.notificationsService
          .sendMerchantRejectionEmail(merchantData.email, merchantData.businessName, approveMerchantDto.notes)
          .catch((err) => this.logger.error(`Failed to send rejection email: ${err.message}`));
      }

      return this.findOne(merchantId);
    } catch (error) {
      this.logger.error('Error approving merchant:', error);
      throw error;
    }
  }

  async remove(merchantId: string): Promise<void> {
    try {
      this.logger.log(`Deleting merchant ID: ${merchantId}`);

      const merchantRef = this.merchantsCollection.doc(merchantId);
      const doc = await merchantRef.get();

      if (!doc.exists) {
        this.logger.warn(`Merchant not found: ${merchantId}`);
        throw new NotFoundException('Merchant not found');
      }

      const merchantData = doc.data() as Merchant;
      this.logger.log(`Deleting merchant: ${merchantData.businessName} (${merchantData.email})`);

      await merchantRef.delete();
      this.logger.log(`Merchant deleted successfully: ${merchantId}`);
    } catch (error) {
      this.logger.error('Error deleting merchant:', error);
      throw error;
    }
  }

  async getMerchantStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
  }> {
    try {
      this.logger.log('Calculating merchant statistics...');

      const allMerchants = await this.merchantsCollection.get();

      const stats = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        suspended: 0,
      };

      allMerchants.forEach((doc) => {
        const merchant = doc.data() as Merchant;
        stats.total++;
        stats[merchant.status]++;
      });

      this.logger.log(`Stats: Total=${stats.total}, Pending=${stats.pending}, Approved=${stats.approved}, Rejected=${stats.rejected}, Suspended=${stats.suspended}`);
      return stats;
    } catch (error) {
      this.logger.error('Error calculating merchant stats:', error);
      throw error;
    }
  }
}
