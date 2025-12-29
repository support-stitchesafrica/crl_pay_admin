export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface MerchantAnalytics {
  analyticsId: string;
  merchantId: string;
  period: AnalyticsPeriod;
  periodDate: Date; // Start of the period

  // Transaction Metrics
  metrics: {
    totalTransactions: number;
    totalAmount: number;
    approvedTransactions: number;
    declinedTransactions: number;
    approvalRate: number;
    averageOrderValue: number;
  };

  // Loan Metrics
  loanMetrics: {
    totalLoans: number;
    activeLoans: number;
    completedLoans: number;
    defaultedLoans: number;
    cancelledLoans: number;
    totalDisbursed: number;
    totalCollected: number;
    totalOutstanding: number;
  };

  // Collection Metrics
  collectionMetrics: {
    collectionRate: number;
    defaultRate: number;
    averageDaysToPayment: number;
    onTimePaymentRate: number;
    latePaymentRate: number;
  };

  // Revenue Metrics
  revenueMetrics: {
    totalInterestEarned: number;
    totalFeesCollected: number;
    totalLateFees: number;
    grossRevenue: number;
  };

  // Customer Metrics
  customerMetrics: {
    totalCustomers: number;
    newCustomers: number;
    repeatCustomers: number;
    averageCreditScore: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardSummary {
  // Overview
  totalLoans: number;
  activeLoans: number;
  totalDisbursed: number;
  totalCollected: number;
  totalOutstanding: number;

  // Performance
  approvalRate: number;
  collectionRate: number;
  defaultRate: number;

  // Revenue
  totalRevenue: number;
  interestEarned: number;
  feesCollected: number;

  // Trends (compared to previous period)
  trends: {
    loansChange: number;
    disbursedChange: number;
    collectedChange: number;
    revenueChange: number;
  };

  // Recent Activity
  recentLoans: number;
  recentPayments: number;
  recentDefaults: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
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
  byAmountRange: {
    range: string;
    count: number;
    totalAmount: number;
  }[];
}

export interface CustomerAnalytics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  averageCreditScore: number;
  creditScoreDistribution: {
    excellent: number; // 800-1000
    good: number;      // 650-799
    fair: number;      // 500-649
    poor: number;      // 300-499
    veryPoor: number;  // 0-299
  };
  topCustomers: {
    customerId: string;
    totalLoans: number;
    totalAmount: number;
    onTimePaymentRate: number;
  }[];
}

export interface RevenueBreakdown {
  period: string;
  interest: number;
  fees: number;
  lateFees: number;
  total: number;
}
