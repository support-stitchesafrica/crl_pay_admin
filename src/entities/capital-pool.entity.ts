export interface CapitalPool {
  poolId: string;
  totalCapital: number;
  allocated: number;
  available: number;
  inActiveLoans: number;
  totalRepaid: number;
  totalSettled: number;
  pendingSettlement: number;
  
  metrics: {
    utilizationRate: number;
    activeLoansCount: number;
    completedLoansCount: number;
    defaultedLoansCount: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}
