// Merchant Types
export interface Merchant {
  merchantId: string;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  apiKey?: string;
  webhookUrl?: string;
  totalTransactions: number;
  totalRevenue: number;
  activeCustomers: number;
  defaultRate: number;
  createdAt: string;
  updatedAt: string;
}

// Customer Types
export interface Customer {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'active' | 'suspended' | 'blacklisted';
  creditScore?: number;
  creditTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  totalBorrowed: number;
  totalRepaid: number;
  onTimePaymentRate: number;
  createdAt: string;
  registeredVia: string;
}

// Dashboard Types
export interface MerchantDashboardStats {
  totalRevenue: number;
  activeCustomers: number;
  activeLoans: number;
  pendingLoans: number;
  completedLoans: number;
  defaultedLoans: number;
  collectionRate: number;
  defaultRate: number;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  businessName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  businessCategory: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    merchant: Merchant;
    token: string;
  };
}
