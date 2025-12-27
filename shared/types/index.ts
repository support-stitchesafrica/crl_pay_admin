// Shared types across all CRL Pay applications

export interface Merchant {
  merchantId: string;
  businessName: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  customerId: string;
  fullName: string;
  email: string;
  phone: string;
  bvn: string;
  creditScore: number;
  creditLimit: number;
  createdAt: Date;
}

export interface Loan {
  loanId: string;
  customerId: string;
  merchantId: string;
  principalAmount: number;
  totalAmount: number;
  installmentAmount: number;
  numberOfInstallments: number;
  paidInstallments: number;
  status: 'active' | 'completed' | 'defaulted';
  paymentPlan: 'bronze' | 'silver' | 'gold' | 'platinum';
  createdAt: Date;
}

export interface Transaction {
  transactionId: string;
  loanId: string;
  customerId: string;
  merchantId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  type: 'disbursement' | 'installment' | 'refund';
  createdAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
