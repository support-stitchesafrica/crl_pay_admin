import { Injectable, UnauthorizedException, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Firestore } from '@google-cloud/firestore';
import * as bcrypt from 'bcrypt';
import { MerchantsService } from '../merchants/merchants.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Merchant } from '../../entities/merchant.entity';
import { Admin } from '../../entities/admin.entity';

interface OTPRecord {
  email: string;
  otp: string;
  createdAt: Date;
  expiresAt: Date;
  verified: boolean;
  userType: 'merchant' | 'admin';
}

export interface JwtPayload {
  sub: string; // merchantId, adminId, or financierId
  email: string;
  role?: 'merchant' | 'admin' | 'financier';
  type?: 'merchant' | 'admin' | 'financier'; // Support both 'role' and 'type' for backwards compatibility
  businessName?: string; // for merchants
  name?: string; // for admins
  companyName?: string; // for financiers
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private adminsCollection: FirebaseFirestore.CollectionReference;
  private otpCollection: FirebaseFirestore.CollectionReference;

  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private jwtService: JwtService,
    private merchantsService: MerchantsService,
    private notificationsService: NotificationsService,
  ) {
    this.adminsCollection = this.firestore.collection('crl_admins');
    this.otpCollection = this.firestore.collection('password_reset_otps');
  }

  /**
   * Generate a 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async merchantLogin(email: string, password: string) {
    try {
      this.logger.log(`Merchant login attempt: ${email}`);

      const merchant = await this.merchantsService.findByEmail(email);

      if (!merchant) {
        this.logger.warn(`Login failed: Merchant not found (${email})`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Re-fetch with password for comparison
      const merchantDoc = await this.firestore
        .collection('crl_merchants')
        .where('email', '==', email)
        .get();

      if (merchantDoc.empty) {
        this.logger.warn(`Login failed: Merchant not found in database (${email})`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const merchantData = merchantDoc.docs[0].data() as Merchant;

      this.logger.log(`Verifying password for merchant: ${merchantData.businessName}`);
      const isPasswordValid = await bcrypt.compare(password, merchantData.passwordHash);

      if (!isPasswordValid) {
        this.logger.warn(`Login failed: Invalid password for ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      if (merchantData.status !== 'approved') {
        this.logger.warn(`Login failed: Merchant status is ${merchantData.status} (${email})`);
        throw new UnauthorizedException(
          `Your account is ${merchantData.status}. Please contact support.`,
        );
      }

      const payload: JwtPayload = {
        sub: merchantData.merchantId,
        email: merchantData.email,
        role: 'merchant',
        businessName: merchantData.businessName,
      };

      const { passwordHash, ...merchantWithoutPassword } = merchantData;

      this.logger.log(`Merchant login successful: ${merchantData.businessName} (${email})`);

      // Send login notification to admin (don't await to avoid blocking login)
      this.notificationsService
        .sendLoginNotificationToAdmin('merchant', merchantData.email, merchantData.businessName)
        .catch((err) => this.logger.error(`Failed to send login notification: ${err.message}`));

      return {
        access_token: this.jwtService.sign(payload),
        user: merchantWithoutPassword,
      };
    } catch (error) {
      this.logger.error(`Error during merchant login: ${error.message}`);
      throw error;
    }
  }

  async adminLogin(email: string, password: string) {
    try {
      this.logger.log(`Admin login attempt: ${email}`);

      const adminSnapshot = await this.adminsCollection.where('email', '==', email).get();

      if (adminSnapshot.empty) {
        this.logger.warn(`Login failed: Admin not found (${email})`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const adminDoc = adminSnapshot.docs[0];
      const admin = adminDoc.data() as Admin;

      this.logger.log(`Verifying password for admin: ${admin.name}`);
      const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

      if (!isPasswordValid) {
        this.logger.warn(`Login failed: Invalid password for ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!admin.isActive) {
        this.logger.warn(`Login failed: Admin account is deactivated (${email})`);
        throw new UnauthorizedException('Your account has been deactivated');
      }

      // Update last login
      this.logger.log(`Updating last login time for admin: ${admin.name}`);
      await this.adminsCollection.doc(admin.adminId).update({
        lastLoginAt: new Date(),
      });

      const payload: JwtPayload = {
        sub: admin.adminId,
        email: admin.email,
        role: 'admin',
        name: admin.name,
      };

      const { passwordHash, ...adminWithoutPassword } = admin;

      this.logger.log(`Admin login successful: ${admin.name} (${email})`);

      // Send login notification to admin (don't await to avoid blocking login)
      this.notificationsService
        .sendLoginNotificationToAdmin('admin', admin.email, admin.name)
        .catch((err) => this.logger.error(`Failed to send login notification: ${err.message}`));

      return {
        access_token: this.jwtService.sign(payload),
        user: adminWithoutPassword,
      };
    } catch (error) {
      this.logger.error(`Error during admin login: ${error.message}`);
      throw error;
    }
  }

  async validateToken(payload: JwtPayload) {
    // Support both 'role' and 'type' for backwards compatibility
    const userType = payload.role || payload.type;
    this.logger.log(`Validating token for ${userType}: ${payload.email}`);

    if (userType === 'merchant') {
      try {
        const merchant = await this.merchantsService.findOne(payload.sub);
        this.logger.log(`Merchant found: ${merchant?.businessName}, status: ${merchant?.status}`);

        if (!merchant || merchant.status !== 'approved') {
          this.logger.warn(`Token validation failed: merchant not found or not approved`);
          return null;
        }
        return { ...payload, merchantId: payload.sub };
      } catch (error) {
        this.logger.error(`Error validating merchant token: ${error.message}`);
        return null;
      }
    } else if (userType === 'admin') {
      const adminSnapshot = await this.adminsCollection.doc(payload.sub).get();
      if (!adminSnapshot.exists) {
        return null;
      }
      const admin = adminSnapshot.data() as Admin;
      if (!admin.isActive) {
        return null;
      }
      return { ...payload, adminId: payload.sub };
    } else if (userType === 'financier') {
      try {
        const financierDoc = await this.firestore
          .collection('crl_financiers')
          .doc(payload.sub)
          .get();

        if (!financierDoc.exists) {
          this.logger.warn(`Token validation failed: financier not found`);
          return null;
        }

        const financier = financierDoc.data();
        this.logger.log(`Financier found: ${financier?.companyName}, status: ${financier?.status}`);

        if (financier?.status !== 'approved') {
          this.logger.warn(`Token validation failed: financier not approved`);
          return null;
        }

        return { ...payload, financierId: payload.sub };
      } catch (error) {
        this.logger.error(`Error validating financier token: ${error.message}`);
        return null;
      }
    }
    return null;
  }

  async createDefaultAdmin() {
    try {
      this.logger.log('Checking for existing admin accounts...');

      // Check if any admin exists
      const adminsSnapshot = await this.adminsCollection.limit(1).get();

      if (!adminsSnapshot.empty) {
        this.logger.log('Admin account already exists, skipping creation');
        return; // Admin already exists
      }

      this.logger.log('No admin found, creating default admin account...');
      const passwordHash = await bcrypt.hash('admin123', 10);
      const adminRef = this.adminsCollection.doc();

      const admin: Admin = {
        adminId: adminRef.id,
        name: 'System Admin',
        email: 'admin@crlpay.com',
        passwordHash,
        role: 'super_admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await adminRef.set(admin);
      this.logger.log('Default admin created successfully');
      this.logger.log('Email: admin@crlpay.com');
      this.logger.log('Password: admin123');
      this.logger.warn('Please change the default password after first login');
    } catch (error) {
      this.logger.error('Error creating default admin:', error);
      throw error;
    }
  }

  /**
   * Send OTP for password reset
   */
  async sendPasswordResetOTP(email: string, userType: 'merchant' | 'admin'): Promise<void> {
    // Verify user exists
    const collectionName = userType === 'merchant' ? 'crl_merchants' : 'crl_admins';
    const userCollection = this.firestore.collection(collectionName);
    const userSnapshot = await userCollection.where('email', '==', email).get();

    if (userSnapshot.empty) {
      throw new NotFoundException(`${userType === 'merchant' ? 'Merchant' : 'Admin'} with this email not found`);
    }

    // Generate OTP
    const otp = this.generateOTP();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing OTPs for this email
    const existingOTPs = await this.otpCollection
      .where('email', '==', email)
      .where('userType', '==', userType)
      .get();

    const batch = this.firestore.batch();
    existingOTPs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Store new OTP
    const otpRecord: OTPRecord = {
      email,
      otp,
      createdAt: now,
      expiresAt,
      verified: false,
      userType,
    };

    await this.otpCollection.add(otpRecord);

    // Send email
    await this.notificationsService.sendForgotPasswordOTP(email, otp, userType);
    this.logger.log(`Password reset OTP sent to ${email}`);
  }

  /**
   * Verify OTP for password reset
   */
  async verifyPasswordResetOTP(email: string, otp: string, userType: 'merchant' | 'admin'): Promise<boolean> {
    const snapshot = await this.otpCollection
      .where('email', '==', email)
      .where('otp', '==', otp)
      .where('userType', '==', userType)
      .where('verified', '==', false)
      .get();

    if (snapshot.empty) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const otpDoc = snapshot.docs[0];
    const otpData = otpDoc.data() as any;

    // Convert Firestore Timestamp to Date
    const expiresAt = otpData.expiresAt?.toDate ? otpData.expiresAt.toDate() : new Date(otpData.expiresAt);

    // Check if OTP has expired
    if (new Date() > expiresAt) {
      await otpDoc.ref.delete();
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Mark OTP as verified
    await otpDoc.ref.update({ verified: true });
    this.logger.log(`OTP verified for ${email}`);

    return true;
  }

  /**
   * Reset password with verified OTP
   */
  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
    userType: 'merchant' | 'admin',
  ): Promise<void> {
    // Verify OTP is valid and verified
    const snapshot = await this.otpCollection
      .where('email', '==', email)
      .where('otp', '==', otp)
      .where('userType', '==', userType)
      .where('verified', '==', true)
      .get();

    if (snapshot.empty) {
      throw new BadRequestException('Invalid OTP or OTP not verified');
    }

    const otpDoc = snapshot.docs[0];
    const otpData = otpDoc.data() as any;

    // Convert Firestore Timestamp to Date
    const expiresAt = otpData.expiresAt?.toDate ? otpData.expiresAt.toDate() : new Date(otpData.expiresAt);

    // Check if OTP has expired
    if (new Date() > expiresAt) {
      await otpDoc.ref.delete();
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    const collectionName = userType === 'merchant' ? 'crl_merchants' : 'crl_admins';
    const userCollection = this.firestore.collection(collectionName);
    const userSnapshot = await userCollection.where('email', '==', email).get();

    if (userSnapshot.empty) {
      throw new NotFoundException('User not found');
    }

    const userDoc = userSnapshot.docs[0];
    await userDoc.ref.update({
      passwordHash,
      updatedAt: new Date(),
    });

    // Delete the used OTP
    await otpDoc.ref.delete();
    this.logger.log(`Password reset successful for ${email}`);
  }
}
