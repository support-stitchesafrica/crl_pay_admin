import api from './api';

export interface MerchantAnalytics {
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  totalDisbursed: number;
  totalCollected: number;
  totalOutstanding: number;
  defaultRate: number;
  collectionRate: number;
  totalRevenue: number;
  interestEarned: number;
  feesCollected: number;
  trends: {
    loansChange: number;
    disbursedChange: number;
    collectedChange: number;
    revenueChange: number;
  };
}

export interface LoanDistribution {
  byStatus: {
    pending: number;
    active: number;
    completed: number;
    defaulted: number;
    cancelled: number;
  };
}

export const getMerchantAnalytics = async (period: string = 'monthly'): Promise<MerchantAnalytics> => {
  const response = await api.get(`/analytics/dashboard?period=${period}`);
  return response.data.data;
};

export const getLoanDistribution = async (): Promise<LoanDistribution> => {
  const response = await api.get('/analytics/loans/distribution');
  return response.data.data;
};
