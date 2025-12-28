import { Injectable, ConflictException, NotFoundException, Inject, Logger, BadRequestException } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from '../../entities/customer.entity';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);
  private customersCollection: FirebaseFirestore.CollectionReference;

  constructor(@Inject('FIRESTORE') private firestore: Firestore) {
    this.customersCollection = this.firestore.collection('crl_customers');
  }

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    try {
      this.logger.log(`📝 Creating new customer: ${createCustomerDto.firstName} ${createCustomerDto.lastName} (${createCustomerDto.email})`);

      // Check if customer with email or phone already exists
      const existingByEmail = await this.customersCollection
        .where('email', '==', createCustomerDto.email)
        .get();

      if (!existingByEmail.empty) {
        this.logger.warn(`⚠️  Customer registration failed: Email ${createCustomerDto.email} already exists`);
        throw new ConflictException('Customer with this email already exists');
      }

      const existingByPhone = await this.customersCollection
        .where('phone', '==', createCustomerDto.phone)
        .get();

      if (!existingByPhone.empty) {
        this.logger.warn(`⚠️  Customer registration failed: Phone ${createCustomerDto.phone} already exists`);
        throw new ConflictException('Customer with this phone number already exists');
      }

      // Check if BVN is already registered
      const existingByBVN = await this.customersCollection
        .where('bvn', '==', createCustomerDto.bvn)
        .get();

      if (!existingByBVN.empty) {
        this.logger.warn(`⚠️  Customer registration failed: BVN already registered`);
        throw new ConflictException('This BVN is already registered');
      }

      // Create customer document
      const customerRef = this.customersCollection.doc();
      const customerId = customerRef.id;

      const customer: Customer = {
        customerId,
        firstName: createCustomerDto.firstName,
        lastName: createCustomerDto.lastName,
        email: createCustomerDto.email,
        phone: createCustomerDto.phone,
        bvn: createCustomerDto.bvn,
        dateOfBirth: new Date(createCustomerDto.dateOfBirth),
        address: createCustomerDto.address,
        city: createCustomerDto.city,
        state: createCustomerDto.state,

        // Initialize credit profile
        creditScore: 0,
        totalLoans: 0,
        activeLoans: 0,
        completedLoans: 0,
        defaultedLoans: 0,
        totalBorrowed: 0,
        totalRepaid: 0,
        onTimePaymentRate: 100,

        // Status
        status: 'active',

        // Metadata
        deviceFingerprint: createCustomerDto.deviceFingerprint,
        ipAddress: createCustomerDto.ipAddress,
        registeredVia: createCustomerDto.merchantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await customerRef.set(customer);
      this.logger.log(`✅ Customer created successfully: ${customer.firstName} ${customer.lastName} (ID: ${customerId})`);
      this.logger.log(`📊 Registered via merchant: ${createCustomerDto.merchantId}`);

      return customer;
    } catch (error) {
      this.logger.error('❌ Error creating customer:', error);
      throw error;
    }
  }

  async findAll(): Promise<Customer[]> {
    try {
      this.logger.log('📋 Fetching all customers...');

      const snapshot = await this.customersCollection.orderBy('createdAt', 'desc').get();
      const customers: Customer[] = [];

      snapshot.forEach((doc) => {
        customers.push(doc.data() as Customer);
      });

      this.logger.log(`✅ Retrieved ${customers.length} customers`);
      return customers;
    } catch (error) {
      this.logger.error('❌ Error fetching customers:', error);
      throw error;
    }
  }

  async findOne(customerId: string): Promise<Customer> {
    try {
      this.logger.log(`🔍 Fetching customer ID: ${customerId}`);

      const doc = await this.customersCollection.doc(customerId).get();

      if (!doc.exists) {
        this.logger.warn(`⚠️  Customer not found: ${customerId}`);
        throw new NotFoundException('Customer not found');
      }

      const customer = doc.data() as Customer;
      this.logger.log(`✅ Customer found: ${customer.firstName} ${customer.lastName}`);
      return customer;
    } catch (error) {
      this.logger.error('❌ Error fetching customer:', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<Customer | null> {
    try {
      const snapshot = await this.customersCollection.where('email', '==', email).get();

      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as Customer;
    } catch (error) {
      this.logger.error('❌ Error finding customer by email:', error);
      throw error;
    }
  }

  async findByBVN(bvn: string): Promise<Customer | null> {
    try {
      const snapshot = await this.customersCollection.where('bvn', '==', bvn).get();

      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as Customer;
    } catch (error) {
      this.logger.error('❌ Error finding customer by BVN:', error);
      throw error;
    }
  }

  async findByMerchant(merchantId: string): Promise<Customer[]> {
    try {
      this.logger.log(`📋 Fetching customers for merchant: ${merchantId}`);

      const snapshot = await this.customersCollection
        .where('registeredVia', '==', merchantId)
        .orderBy('createdAt', 'desc')
        .get();

      const customers: Customer[] = [];
      snapshot.forEach((doc) => {
        customers.push(doc.data() as Customer);
      });

      this.logger.log(`✅ Found ${customers.length} customers for merchant ${merchantId}`);
      return customers;
    } catch (error) {
      this.logger.error('❌ Error fetching customers by merchant:', error);
      throw error;
    }
  }

  async update(customerId: string, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    try {
      this.logger.log(`📝 Updating customer ID: ${customerId}`);

      const customerRef = this.customersCollection.doc(customerId);
      const doc = await customerRef.get();

      if (!doc.exists) {
        this.logger.warn(`⚠️  Customer not found: ${customerId}`);
        throw new NotFoundException('Customer not found');
      }

      await customerRef.update({
        ...updateCustomerDto,
        updatedAt: new Date(),
      });

      this.logger.log(`✅ Customer updated successfully: ${customerId}`);
      return this.findOne(customerId);
    } catch (error) {
      this.logger.error('❌ Error updating customer:', error);
      throw error;
    }
  }

  async updateCreditProfile(customerId: string, profileUpdates: Partial<Customer>): Promise<Customer> {
    try {
      this.logger.log(`📊 Updating credit profile for customer: ${customerId}`);

      const customerRef = this.customersCollection.doc(customerId);
      const doc = await customerRef.get();

      if (!doc.exists) {
        this.logger.warn(`⚠️  Customer not found: ${customerId}`);
        throw new NotFoundException('Customer not found');
      }

      await customerRef.update({
        ...profileUpdates,
        updatedAt: new Date(),
      });

      this.logger.log(`✅ Credit profile updated for customer: ${customerId}`);
      return this.findOne(customerId);
    } catch (error) {
      this.logger.error('❌ Error updating credit profile:', error);
      throw error;
    }
  }

  async blacklist(customerId: string, reason: string): Promise<Customer> {
    try {
      this.logger.log(`🚫 Blacklisting customer: ${customerId}`);
      this.logger.log(`📝 Reason: ${reason}`);

      const customerRef = this.customersCollection.doc(customerId);
      const doc = await customerRef.get();

      if (!doc.exists) {
        this.logger.warn(`⚠️  Customer not found: ${customerId}`);
        throw new NotFoundException('Customer not found');
      }

      await customerRef.update({
        status: 'blacklisted',
        blacklistReason: reason,
        updatedAt: new Date(),
      });

      this.logger.log(`✅ Customer blacklisted: ${customerId}`);
      return this.findOne(customerId);
    } catch (error) {
      this.logger.error('❌ Error blacklisting customer:', error);
      throw error;
    }
  }

  async remove(customerId: string): Promise<void> {
    try {
      this.logger.log(`🗑️  Deleting customer ID: ${customerId}`);

      const customerRef = this.customersCollection.doc(customerId);
      const doc = await customerRef.get();

      if (!doc.exists) {
        this.logger.warn(`⚠️  Customer not found: ${customerId}`);
        throw new NotFoundException('Customer not found');
      }

      const customerData = doc.data() as Customer;

      // Check if customer has active loans
      if (customerData.activeLoans > 0) {
        this.logger.warn(`⚠️  Cannot delete customer with active loans: ${customerId}`);
        throw new BadRequestException('Cannot delete customer with active loans');
      }

      this.logger.log(`📄 Deleting customer: ${customerData.firstName} ${customerData.lastName} (${customerData.email})`);

      await customerRef.delete();
      this.logger.log(`✅ Customer deleted successfully: ${customerId}`);
    } catch (error) {
      this.logger.error('❌ Error deleting customer:', error);
      throw error;
    }
  }

  async getCustomerStats(): Promise<{
    total: number;
    active: number;
    suspended: number;
    blacklisted: number;
    withActiveLoans: number;
  }> {
    try {
      this.logger.log('📊 Calculating customer statistics...');

      const allCustomers = await this.customersCollection.get();

      const stats = {
        total: 0,
        active: 0,
        suspended: 0,
        blacklisted: 0,
        withActiveLoans: 0,
      };

      allCustomers.forEach((doc) => {
        const customer = doc.data() as Customer;
        stats.total++;
        stats[customer.status]++;
        if (customer.activeLoans > 0) {
          stats.withActiveLoans++;
        }
      });

      this.logger.log(`✅ Stats: Total=${stats.total}, Active=${stats.active}, Suspended=${stats.suspended}, Blacklisted=${stats.blacklisted}, WithActiveLoans=${stats.withActiveLoans}`);
      return stats;
    } catch (error) {
      this.logger.error('❌ Error calculating customer stats:', error);
      throw error;
    }
  }
}
