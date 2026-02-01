export interface AllocationTerms {
  tenure: number;
  tenurePeriod: 'months' | 'weeks' | 'days';
  
  penalty: {
    type: 'percentage' | 'fixed';
    amount: number;
    gracePeriodDays: number;
  };
  
  minLoanAmount?: number;
  maxLoanAmount?: number;
}

export interface MerchantAllocation {
  allocationId: string;
  merchantId: string;
  
  // Allocation amounts
  allocatedAmount: number;
  availableAmount: number;
  usedAmount: number;
  
  // Terms
  terms: AllocationTerms;
  
  // Tracking
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  defaultedLoans: number;
  totalDisbursed: number;
  totalRepaid: number;
  pendingSettlement: number;
  totalSettled: number;
  
  // Status
  status: 'active' | 'suspended' | 'expired';
  expiresAt: Date;
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
