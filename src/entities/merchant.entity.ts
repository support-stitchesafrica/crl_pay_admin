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
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string; // admin ID
}
