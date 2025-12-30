export interface SettlementAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankCode?: string;
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
  settlementAccount: SettlementAccount;
  // Legacy fields (deprecated - use settlementAccount instead)
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  adminNotes?: string;

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
