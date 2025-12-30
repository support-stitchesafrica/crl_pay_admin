import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { FirebaseService } from '../../config/firebase.config';
import { RegisterFinancierDto } from './dto/register-financier.dto';
import { LoginFinancierDto } from './dto/login-financier.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import * as admin from 'firebase-admin';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FinanciersService {
  private readonly logger = new Logger(FinanciersService.name);

  constructor(
    private firebaseService: FirebaseService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
  ) {}

  async register(dto: RegisterFinancierDto) {
    const db = this.firebaseService.getFirestore();

    // Check if email already exists
    const existingFinancier = await db
      .collection('crl_financiers')
      .where('email', '==', dto.email)
      .limit(1)
      .get();

    if (!existingFinancier.empty) {
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create financier document
    const financierRef = db.collection('crl_financiers').doc();
    const financier = {
      financierId: financierRef.id,
      companyName: dto.companyName,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      status: 'pending',
      businessAddress: dto.businessAddress,
      businessCategory: dto.businessCategory,
      registrationNumber: dto.registrationNumber,
      taxId: dto.taxId,
      availableFunds: 0,
      allocatedFunds: 0,
      totalDisbursed: 0,
      totalRepaid: 0,
      settlementAccount: {
        bankName: dto.settlementAccount?.bankName || '',
        accountNumber: dto.settlementAccount?.accountNumber || '',
        accountName: dto.settlementAccount?.accountName || '',
        ...(dto.settlementAccount?.bankCode && { bankCode: dto.settlementAccount.bankCode }),
      },
      businessDocuments: {},
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await financierRef.set(financier);

    // Send registration emails (don't await to avoid blocking registration)
    this.notificationsService
      .sendFinancierRegistrationEmail(financier.email, financier.companyName)
      .catch((err) => this.logger.error(`Failed to send registration email: ${err.message}`));

    return {
      message: 'Registration successful. Awaiting admin approval.',
      financierId: financier.financierId,
    };
  }

  async login(dto: LoginFinancierDto) {
    const db = this.firebaseService.getFirestore();

    const snapshot = await db
      .collection('crl_financiers')
      .where('email', '==', dto.email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const financier = snapshot.docs[0].data();

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      financier.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if approved
    if (financier.status !== 'approved') {
      throw new UnauthorizedException(
        `Account ${financier.status}. Please contact admin.`,
      );
    }

    // Generate JWT token
    const payload = {
      sub: financier.financierId,
      email: financier.email,
      type: 'financier',
    };

    const access_token = await this.jwtService.signAsync(payload);

    // Update last login
    await db
      .collection('crl_financiers')
      .doc(financier.financierId)
      .update({
        lastLoginAt: admin.firestore.Timestamp.now(),
      });

    // Send login notification to admin (don't await to avoid blocking login)
    this.notificationsService
      .sendLoginNotificationToAdmin('financier', financier.email, financier.companyName)
      .catch((err) => this.logger.error(`Failed to send login notification: ${err.message}`));

    return {
      access_token,
      user: {
        financierId: financier.financierId,
        companyName: financier.companyName,
        email: financier.email,
        status: financier.status,
      },
    };
  }

  async getProfile(financierId: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('crl_financiers').doc(financierId).get();

    if (!doc.exists) {
      throw new BadRequestException('Financier not found');
    }

    const data = doc.data();
    if (data) {
      delete data.passwordHash; // Don't return password hash
    }

    return data;
  }

  async updateProfile(financierId: string, updates: any) {
    const db = this.firebaseService.getFirestore();

    // Don't allow updating certain fields
    const allowedUpdates: any = {
      phone: updates.phone,
      businessAddress: updates.businessAddress,
      businessDocuments: updates.businessDocuments,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Convert settlementAccount DTO to plain object if it exists
    if (updates.settlementAccount) {
      allowedUpdates.settlementAccount = {
        bankName: updates.settlementAccount.bankName || '',
        accountNumber: updates.settlementAccount.accountNumber || '',
        accountName: updates.settlementAccount.accountName || '',
        ...(updates.settlementAccount.bankCode && { bankCode: updates.settlementAccount.bankCode }),
      };
    }

    // Remove undefined fields
    Object.keys(allowedUpdates).forEach(
      (key) =>
        allowedUpdates[key] === undefined && delete allowedUpdates[key],
    );

    await db
      .collection('crl_financiers')
      .doc(financierId)
      .update(allowedUpdates);

    return {
      message: 'Profile updated successfully',
    };
  }

  async getAllFinanciers(status?: string) {
    const db = this.firebaseService.getFirestore();

    // Fetch all financiers ordered by createdAt
    // We filter in-memory to avoid Firestore composite index requirement
    const snapshot = await db
      .collection('crl_financiers')
      .orderBy('createdAt', 'desc')
      .get();

    let financiers = snapshot.docs.map((doc) => {
      const data = doc.data();
      delete data.passwordHash;
      return data;
    });

    // Filter by status in-memory if needed
    if (status) {
      financiers = financiers.filter((f) => f.status === status);
    }

    return financiers;
  }

  async approveFinancier(financierId: string, adminId: string) {
    const db = this.firebaseService.getFirestore();

    // Get financier details before updating
    const financierDoc = await db.collection('crl_financiers').doc(financierId).get();
    if (!financierDoc.exists) {
      throw new BadRequestException('Financier not found');
    }
    const financierData = financierDoc.data()!;

    await db.collection('crl_financiers').doc(financierId).update({
      status: 'approved',
      approvedBy: adminId,
      approvedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Send approval email to financier (don't await to avoid blocking)
    this.notificationsService
      .sendFinancierApprovalEmail(financierData.email, financierData.companyName)
      .catch((err) => this.logger.error(`Failed to send approval email: ${err.message}`));

    return {
      message: 'Financier approved successfully',
    };
  }

  async rejectFinancier(
    financierId: string,
    adminId: string,
    reason: string,
  ) {
    const db = this.firebaseService.getFirestore();

    // Get financier details before updating
    const financierDoc = await db.collection('crl_financiers').doc(financierId).get();
    if (!financierDoc.exists) {
      throw new BadRequestException('Financier not found');
    }
    const financierData = financierDoc.data()!;

    await db.collection('crl_financiers').doc(financierId).update({
      status: 'rejected',
      approvedBy: adminId,
      adminNotes: reason,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Send rejection email to financier (don't await to avoid blocking)
    this.notificationsService
      .sendFinancierRejectionEmail(financierData.email, financierData.companyName, reason)
      .catch((err) => this.logger.error(`Failed to send rejection email: ${err.message}`));

    return {
      message: 'Financier rejected',
    };
  }

  async suspendFinancier(
    financierId: string,
    adminId: string,
    reason: string,
  ) {
    const db = this.firebaseService.getFirestore();

    await db.collection('crl_financiers').doc(financierId).update({
      status: 'suspended',
      suspendedBy: adminId,
      suspensionReason: reason,
      suspendedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // TODO: Send suspension email to financier

    return {
      message: 'Financier suspended',
    };
  }

  async approveFunds(financierId: string, amount: number, adminId: string) {
    const db = this.firebaseService.getFirestore();

    const financierDoc = await db
      .collection('crl_financiers')
      .doc(financierId)
      .get();

    if (!financierDoc.exists) {
      throw new BadRequestException('Financier not found');
    }

    const financier = financierDoc.data();
    if (!financier) {
      throw new BadRequestException('Financier data not found');
    }

    const currentFunds = financier.availableFunds || 0;
    const newBalance = currentFunds + amount;

    await db.collection('crl_financiers').doc(financierId).update({
      availableFunds: newBalance,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // TODO: Log fund approval in transactions

    return {
      message: `₦${amount.toLocaleString()} approved and credited to financier account`,
      newBalance,
    };
  }
}
