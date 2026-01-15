import api from './api';

export interface AnalyticsDashboard {
  totalLoans: number;
  activeLoans: number;
  totalDisbursed: number;
  totalCollected: number;
  totalOutstanding: number;
  approvalRate: number;
  collectionRate: number;
  defaultRate: number;
  totalRevenue: number;
  interestEarned: number;
  feesCollected: number;
  trends: {
    loansChange: number;
    disbursedChange: number;
    collectedChange: number;
    revenueChange: number;
  };
  recentLoans: number;
  recentPayments: number;
  recentDefaults: number;
}

export interface LoanDistribution {
  byStatus: {
    pending: number;
    active: number;
    completed: number;
    defaulted: number;
    cancelled: number;
  };
  byFrequency: Record<string, number>;
  byTenor: Record<string, number>;
  byAmountRange: Array<{
    range: string;
    count: number;
    totalAmount: number;
  }>;
}

export interface MerchantPerformance {
  merchantId: string;
  merchantName: string;
  totalLoans: number;
  totalDisbursed: number;
  defaultRate: number;
}

export const getDashboardAnalytics = async (period: string = 'monthly'): Promise<AnalyticsDashboard> => {
  const response = await api.get(`/analytics/dashboard?period=${period}`);
  return response.data.data;
};

export const getLoanDistribution = async (): Promise<LoanDistribution> => {
  const response = await api.get('/analytics/loans/distribution');
  return response.data.data;
};

export const getMerchantPerformance = async (): Promise<MerchantPerformance[]> => {
  // Fetch merchants and their loan statistics
  const merchantsResponse = await api.get('/merchants');
  const merchants = merchantsResponse.data.data;

  // Fetch all loans to calculate performance
  const loansResponse = await api.get('/loans');
  const loans = loansResponse.data.data;

  // Calculate performance for each merchant
  const performance = merchants.map((merchant: any) => {
    const merchantLoans = loans.filter((loan: any) => loan.merchantId === merchant.merchantId);
    const defaultedLoans = merchantLoans.filter((loan: any) => loan.status === 'defaulted');
    const totalDisbursed = merchantLoans.reduce((sum: number, loan: any) => sum + (loan.principalAmount || 0), 0);
    const defaultRate = merchantLoans.length > 0 ? (defaultedLoans.length / merchantLoans.length) * 100 : 0;

    return {
      merchantId: merchant.merchantId,
      merchantName: merchant.businessName || merchant.companyName,
      totalLoans: merchantLoans.length,
      totalDisbursed,
      defaultRate: Math.round(defaultRate * 10) / 10,
    };
  });

  // Sort by total loans and return top 5
  return performance
    .filter((m: MerchantPerformance) => m.totalLoans > 0)
    .sort((a: MerchantPerformance, b: MerchantPerformance) => b.totalLoans - a.totalLoans)
    .slice(0, 5);
};
