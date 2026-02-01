export interface SettlementBreakdown {
  completedLoansCount: number;
  principalRepaid: number;
  interestEarned: number;
  penaltiesCollected: number;
  loanIds: string[];
}

export interface SettlementRequest {
  settlementId: string;
  merchantId: string;
  allocationId: string;
  
  // Amount details
  requestedAmount: number;
  approvedAmount: number;
  breakdown: SettlementBreakdown;
  
  // Request details
  requestedBy: string;
  requestedAt: Date;
  requestNotes?: string;
  
  // Approval workflow
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  
  approvedBy?: string;
  approvedAt?: Date;
  approvalNotes?: string;
  
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  
  // Payout details
  paidBy?: string;
  paidAt?: Date;
  payoutReference?: string;
  paystackTransferCode?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
