export interface SettlementAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankCode?: string;
  paystackRecipientCode?: string;
}

export interface Merchant {
  merchantId: string;
  businessName: string;
  email: string;
  phone: string;
  passwordHash: string;
  cacNumber?: string;
  businessAddress: string;
  businessCategory: string;
  websiteUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  apiKey?: string;
  apiSecret?: string;
  // Settlement account (deprecated - settlements are manual)
  settlementAccount?: SettlementAccount;
  adminNotes?: string;

  // Allocation reference
  activeAllocationId?: string;

  // Analytics fields
  totalRevenue?: number;
  totalTransactions?: number;
  activeCustomers?: number;
  defaultRate?: number;

  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string; // admin ID
}
