import { Injectable, UnauthorizedException, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Firestore } from '@google-cloud/firestore';
import * as bcrypt from 'bcrypt';
import { MerchantsService } from '../merchants/merchants.service';
import { Merchant } from '../../entities/merchant.entity';
import { Admin } from '../../entities/admin.entity';

export interface JwtPayload {
  sub: string; // merchantId or adminId
  email: string;
  role: 'merchant' | 'admin';
  businessName?: string; // for merchants
  name?: string; // for admins
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private adminsCollection: FirebaseFirestore.CollectionReference;

  constructor(
    @Inject('FIRESTORE') private firestore: Firestore,
    private jwtService: JwtService,
    private merchantsService: MerchantsService,
  ) {
    this.adminsCollection = this.firestore.collection('crl_admins');
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
    if (payload.role === 'merchant') {
      const merchant = await this.merchantsService.findOne(payload.sub);
      if (!merchant || merchant.status !== 'approved') {
        return null;
      }
      return { ...payload, merchantId: payload.sub };
    } else if (payload.role === 'admin') {
      const adminSnapshot = await this.adminsCollection.doc(payload.sub).get();
      if (!adminSnapshot.exists) {
        return null;
      }
      const admin = adminSnapshot.data() as Admin;
      if (!admin.isActive) {
        return null;
      }
      return { ...payload, adminId: payload.sub };
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
}
