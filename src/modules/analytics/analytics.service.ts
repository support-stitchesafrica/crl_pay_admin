import { Injectable, Inject, Logger } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  MerchantAnalytics,
  DashboardSummary,
  TimeSeriesDataPoint,
  LoanDistribution,
  CustomerAnalytics,
  RevenueBreakdown,
  AnalyticsPeriod,
} from '../../entities/analytics.entity';
import {
  DashboardQueryDto,
  TimeSeriesQueryDto,
  CustomerAnalyticsQueryDto,
  RevenueQueryDto,
} from './dto/analytics.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private analyticsCollection: FirebaseFirestore.CollectionReference;
  private loansCollection: FirebaseFirestore.CollectionReference;
  private paymentsCollection: FirebaseFirestore.CollectionReference;
  private customersCollection: FirebaseFirestore.CollectionReference;
  private defaultsCollection: FirebaseFirestore.CollectionReference;

  constructor(@Inject('FIRESTORE') private firestore: Firestore) {
    this.analyticsCollection = this.firestore.collection('crl_merchant_analytics');
    this.loansCollection = this.firestore.collection('crl_loans');
    this.paymentsCollection = this.firestore.collection('crl_payments');
    this.customersCollection = this.firestore.collection('crl_customers');
    this.defaultsCollection = this.firestore.collection('crl_defaults');
  }

  /**
   * Get dashboard summary for a merchant
   */
  async getDashboardSummary(query: DashboardQueryDto): Promise<DashboardSummary> {
    const merchantId = query.merchantId;
    const period = query.period || 'monthly';

    // Get current period dates
    const { currentStart, currentEnd, previousStart, previousEnd } = this.getPeriodDates(period);

    // Fetch loans
    let loansQuery: FirebaseFirestore.Query = this.loansCollection;
    if (merchantId) {
      loansQuery = loansQuery.where('merchantId', '==', merchantId);
    }
    const loansSnapshot = await loansQuery.get();
    const loans = loansSnapshot.docs.map((doc) => doc.data());

    // Calculate loan metrics
    const activeLoans = loans.filter((l) => l.status === 'active');
    const completedLoans = loans.filter((l) => l.status === 'completed');
    const defaultedLoans = loans.filter((l) => l.status === 'defaulted');

    const totalDisbursed = loans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
    const totalCollected = loans.reduce((sum, l) => sum + (l.amountPaid || 0), 0);
    const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.amountRemaining || 0), 0);

    // Calculate rates
    const approvalRate = loans.length > 0
      ? ((loans.length - loans.filter((l) => l.status === 'cancelled').length) / loans.length) * 100
      : 0;
    const collectionRate = totalDisbursed > 0 ? (totalCollected / totalDisbursed) * 100 : 0;
    const defaultRate = loans.length > 0 ? (defaultedLoans.length / loans.length) * 100 : 0;

    // Calculate revenue
    const totalInterest = completedLoans.reduce(
      (sum, l) => sum + (l.configuration?.totalInterest || 0),
      0,
    );
    const totalLateFees = loans.reduce((sum, l) => sum + (l.lateFees || 0), 0);
    const totalRevenue = totalInterest + totalLateFees;

    // Calculate trends (current vs previous period)
    const currentPeriodLoans = loans.filter((l) => {
      const createdAt = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
      return createdAt >= currentStart && createdAt <= currentEnd;
    });
    const previousPeriodLoans = loans.filter((l) => {
      const createdAt = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
      return createdAt >= previousStart && createdAt <= previousEnd;
    });

    const currentDisbursed = currentPeriodLoans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
    const previousDisbursed = previousPeriodLoans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
    const currentCollected = currentPeriodLoans.reduce((sum, l) => sum + (l.amountPaid || 0), 0);
    const previousCollected = previousPeriodLoans.reduce((sum, l) => sum + (l.amountPaid || 0), 0);

    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLoans = loans.filter((l) => {
      const createdAt = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
      return createdAt >= sevenDaysAgo;
    }).length;

    // Get recent defaults
    let defaultsQuery: FirebaseFirestore.Query = this.defaultsCollection;
    if (merchantId) {
      defaultsQuery = defaultsQuery.where('merchantId', '==', merchantId);
    }
    const defaultsSnapshot = await defaultsQuery.get();
    const recentDefaults = defaultsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      return createdAt >= sevenDaysAgo;
    }).length;

    return {
      totalLoans: loans.length,
      activeLoans: activeLoans.length,
      totalDisbursed,
      totalCollected,
      totalOutstanding,
      approvalRate: Math.round(approvalRate * 100) / 100,
      collectionRate: Math.round(collectionRate * 100) / 100,
      defaultRate: Math.round(defaultRate * 100) / 100,
      totalRevenue,
      interestEarned: totalInterest,
      feesCollected: totalLateFees,
      trends: {
        loansChange: calculateChange(currentPeriodLoans.length, previousPeriodLoans.length),
        disbursedChange: calculateChange(currentDisbursed, previousDisbursed),
        collectedChange: calculateChange(currentCollected, previousCollected),
        revenueChange: calculateChange(
          currentPeriodLoans.reduce((sum, l) => sum + (l.configuration?.totalInterest || 0), 0),
          previousPeriodLoans.reduce((sum, l) => sum + (l.configuration?.totalInterest || 0), 0),
        ),
      },
      recentLoans,
      recentPayments: currentPeriodLoans.filter((l) => l.amountPaid > 0).length,
      recentDefaults,
    };
  }

  /**
   * Get loan distribution analytics
   */
  async getLoanDistribution(merchantId?: string): Promise<LoanDistribution> {
    let query: FirebaseFirestore.Query = this.loansCollection;
    if (merchantId) {
      query = query.where('merchantId', '==', merchantId);
    }

    const snapshot = await query.get();
    const loans = snapshot.docs.map((doc) => doc.data());

    // By status
    const byStatus = {
      pending: loans.filter((l) => l.status === 'pending').length,
      active: loans.filter((l) => l.status === 'active').length,
      completed: loans.filter((l) => l.status === 'completed').length,
      defaulted: loans.filter((l) => l.status === 'defaulted').length,
      cancelled: loans.filter((l) => l.status === 'cancelled').length,
    };

    // By frequency
    const byFrequency: Record<string, number> = {};
    loans.forEach((l) => {
      const freq = l.configuration?.frequency || 'unknown';
      byFrequency[freq] = (byFrequency[freq] || 0) + 1;
    });

    // By tenor
    const byTenor: Record<string, number> = {};
    loans.forEach((l) => {
      const tenor = l.configuration?.tenor;
      if (tenor) {
        const key = `${tenor.value} ${tenor.period}`;
        byTenor[key] = (byTenor[key] || 0) + 1;
      }
    });

    // By amount range
    const ranges = [
      { min: 0, max: 50000, label: '₦0 - ₦50K' },
      { min: 50001, max: 100000, label: '₦50K - ₦100K' },
      { min: 100001, max: 250000, label: '₦100K - ₦250K' },
      { min: 250001, max: 500000, label: '₦250K - ₦500K' },
      { min: 500001, max: Infinity, label: '₦500K+' },
    ];

    const byAmountRange = ranges.map((range) => {
      const loansInRange = loans.filter(
        (l) => l.principalAmount >= range.min && l.principalAmount <= range.max,
      );
      return {
        range: range.label,
        count: loansInRange.length,
        totalAmount: loansInRange.reduce((sum, l) => sum + (l.principalAmount || 0), 0),
      };
    });

    return { byStatus, byFrequency, byTenor, byAmountRange };
  }

  /**
   * Get time series data for charts
   */
  async getTimeSeries(query: TimeSeriesQueryDto): Promise<TimeSeriesDataPoint[]> {
    const { merchantId, metric, granularity = 'daily', startDate, endDate } = query;

    // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    let loansQuery: FirebaseFirestore.Query = this.loansCollection;
    if (merchantId) {
      loansQuery = loansQuery.where('merchantId', '==', merchantId);
    }

    const snapshot = await loansQuery.get();
    const loans = snapshot.docs.map((doc) => doc.data());

    // Group by date
    const dataPoints: Map<string, number> = new Map();
    const dateFormat = this.getDateFormat(granularity);

    // Initialize all dates in range
    const current = new Date(start);
    while (current <= end) {
      const key = this.formatDate(current, granularity);
      dataPoints.set(key, 0);
      this.incrementDate(current, granularity);
    }

    // Aggregate data
    loans.forEach((loan) => {
      const createdAt = loan.createdAt?.toDate ? loan.createdAt.toDate() : new Date(loan.createdAt);
      if (createdAt < start || createdAt > end) return;

      const key = this.formatDate(createdAt, granularity);
      const currentValue = dataPoints.get(key) || 0;

      switch (metric) {
        case 'disbursed':
          dataPoints.set(key, currentValue + (loan.principalAmount || 0));
          break;
        case 'collected':
          dataPoints.set(key, currentValue + (loan.amountPaid || 0));
          break;
        case 'loans':
          dataPoints.set(key, currentValue + 1);
          break;
        case 'revenue':
          dataPoints.set(key, currentValue + (loan.configuration?.totalInterest || 0));
          break;
        case 'defaults':
          if (loan.status === 'defaulted') {
            dataPoints.set(key, currentValue + 1);
          }
          break;
      }
    });

    return Array.from(dataPoints.entries()).map(([date, value]) => ({
      date,
      value,
    }));
  }

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(query: CustomerAnalyticsQueryDto): Promise<CustomerAnalytics> {
    const { merchantId, topCount = 10 } = query;

    let customersQuery: FirebaseFirestore.Query = this.customersCollection;
    if (merchantId) {
      customersQuery = customersQuery.where('merchantId', '==', merchantId);
    }

    const snapshot = await customersQuery.get();
    const customers = snapshot.docs.map((doc) => doc.data());

    // Calculate metrics
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter((c) => c.activeLoans > 0).length;

    // New customers this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newCustomersThisMonth = customers.filter((c) => {
      const createdAt = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
      return createdAt >= startOfMonth;
    }).length;

    // Average credit score
    const customersWithScore = customers.filter((c) => c.creditScore > 0);
    const averageCreditScore = customersWithScore.length > 0
      ? Math.round(customersWithScore.reduce((sum, c) => sum + c.creditScore, 0) / customersWithScore.length)
      : 0;

    // Credit score distribution
    const creditScoreDistribution = {
      excellent: customers.filter((c) => c.creditScore >= 800).length,
      good: customers.filter((c) => c.creditScore >= 650 && c.creditScore < 800).length,
      fair: customers.filter((c) => c.creditScore >= 500 && c.creditScore < 650).length,
      poor: customers.filter((c) => c.creditScore >= 300 && c.creditScore < 500).length,
      veryPoor: customers.filter((c) => c.creditScore > 0 && c.creditScore < 300).length,
    };

    // Top customers by loan volume
    const topCustomers = customers
      .filter((c) => c.totalLoans > 0)
      .sort((a, b) => (b.totalLoans || 0) - (a.totalLoans || 0))
      .slice(0, topCount)
      .map((c) => ({
        customerId: c.customerId,
        totalLoans: c.totalLoans || 0,
        totalAmount: 0, // Would need to aggregate from loans
        onTimePaymentRate: c.paymentHistory
          ? (c.paymentHistory.onTimePayments /
              (c.paymentHistory.onTimePayments + c.paymentHistory.latePayments + c.paymentHistory.missedPayments || 1)) * 100
          : 0,
      }));

    return {
      totalCustomers,
      activeCustomers,
      newCustomersThisMonth,
      averageCreditScore,
      creditScoreDistribution,
      topCustomers,
    };
  }

  /**
   * Get revenue breakdown
   */
  async getRevenueBreakdown(query: RevenueQueryDto): Promise<RevenueBreakdown[]> {
    const { merchantId, period = 'monthly', startDate, endDate } = query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);

    let loansQuery: FirebaseFirestore.Query = this.loansCollection;
    if (merchantId) {
      loansQuery = loansQuery.where('merchantId', '==', merchantId);
    }

    const snapshot = await loansQuery.get();
    const loans = snapshot.docs.map((doc) => doc.data());

    // Group by period
    const breakdown: Map<string, RevenueBreakdown> = new Map();

    loans.forEach((loan) => {
      const createdAt = loan.createdAt?.toDate ? loan.createdAt.toDate() : new Date(loan.createdAt);
      if (createdAt < start || createdAt > end) return;

      const key = this.formatDate(createdAt, period);
      const existing = breakdown.get(key) || {
        period: key,
        interest: 0,
        fees: 0,
        lateFees: 0,
        total: 0,
      };

      existing.interest += loan.configuration?.totalInterest || 0;
      existing.lateFees += loan.lateFees || 0;
      existing.total = existing.interest + existing.fees + existing.lateFees;

      breakdown.set(key, existing);
    });

    return Array.from(breakdown.values()).sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Aggregate and store daily analytics
   * Runs daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyAnalytics(): Promise<void> {
    this.logger.log('Aggregating daily analytics...');

    try {
      // Get all merchants
      const merchantsSnapshot = await this.firestore
        .collection('crl_merchants')
        .where('status', '==', 'approved')
        .get();

      for (const merchantDoc of merchantsSnapshot.docs) {
        const merchantId = merchantDoc.id;
        await this.storeMerchantAnalytics(merchantId, 'daily');
      }

      this.logger.log('Daily analytics aggregation complete');
    } catch (error) {
      this.logger.error(`Failed to aggregate daily analytics: ${error.message}`);
    }
  }

  /**
   * Store merchant analytics for a period
   */
  private async storeMerchantAnalytics(
    merchantId: string,
    period: AnalyticsPeriod,
  ): Promise<void> {
    const summary = await this.getDashboardSummary({ merchantId, period });
    const distribution = await this.getLoanDistribution(merchantId);
    const customerAnalytics = await this.getCustomerAnalytics({ merchantId });

    const now = new Date();
    const periodDate = this.getPeriodStartDate(now, period);

    const analytics: MerchantAnalytics = {
      analyticsId: uuidv4(),
      merchantId,
      period,
      periodDate,
      metrics: {
        totalTransactions: summary.totalLoans,
        totalAmount: summary.totalDisbursed,
        approvedTransactions: summary.totalLoans - distribution.byStatus.cancelled,
        declinedTransactions: distribution.byStatus.cancelled,
        approvalRate: summary.approvalRate,
        averageOrderValue: summary.totalLoans > 0
          ? Math.round(summary.totalDisbursed / summary.totalLoans)
          : 0,
      },
      loanMetrics: {
        totalLoans: summary.totalLoans,
        activeLoans: summary.activeLoans,
        completedLoans: distribution.byStatus.completed,
        defaultedLoans: distribution.byStatus.defaulted,
        cancelledLoans: distribution.byStatus.cancelled,
        totalDisbursed: summary.totalDisbursed,
        totalCollected: summary.totalCollected,
        totalOutstanding: summary.totalOutstanding,
      },
      collectionMetrics: {
        collectionRate: summary.collectionRate,
        defaultRate: summary.defaultRate,
        averageDaysToPayment: 0, // Would need payment data
        onTimePaymentRate: 0,
        latePaymentRate: 0,
      },
      revenueMetrics: {
        totalInterestEarned: summary.interestEarned,
        totalFeesCollected: summary.feesCollected,
        totalLateFees: summary.feesCollected,
        grossRevenue: summary.totalRevenue,
      },
      customerMetrics: {
        totalCustomers: customerAnalytics.totalCustomers,
        newCustomers: customerAnalytics.newCustomersThisMonth,
        repeatCustomers: customerAnalytics.activeCustomers,
        averageCreditScore: customerAnalytics.averageCreditScore,
      },
      createdAt: now,
      updatedAt: now,
    };

    await this.analyticsCollection.doc(analytics.analyticsId).set(analytics);
  }

  /**
   * Helper: Get period dates for comparison
   */
  private getPeriodDates(period: AnalyticsPeriod): {
    currentStart: Date;
    currentEnd: Date;
    previousStart: Date;
    previousEnd: Date;
  } {
    const now = new Date();
    let currentStart: Date;
    let currentEnd: Date;
    let previousStart: Date;
    let previousEnd: Date;

    switch (period) {
      case 'daily':
        currentStart = new Date(now.setHours(0, 0, 0, 0));
        currentEnd = new Date(now.setHours(23, 59, 59, 999));
        previousStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
        previousEnd = new Date(currentEnd.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        currentStart = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        currentStart.setHours(0, 0, 0, 0);
        currentEnd = new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousEnd = new Date(currentStart.getTime() - 1);
        break;
      case 'monthly':
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'yearly':
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
    }

    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  /**
   * Helper: Get period start date
   */
  private getPeriodStartDate(date: Date, period: AnalyticsPeriod): Date {
    const d = new Date(date);
    switch (period) {
      case 'daily':
        d.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        break;
      case 'yearly':
        d.setMonth(0, 1);
        d.setHours(0, 0, 0, 0);
        break;
    }
    return d;
  }

  /**
   * Helper: Format date for grouping
   */
  private formatDate(date: Date, granularity: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (granularity) {
      case 'daily':
        return `${year}-${month}-${day}`;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${String(Math.ceil(weekStart.getDate() / 7)).padStart(2, '0')}`;
      case 'monthly':
        return `${year}-${month}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  /**
   * Helper: Get date format string
   */
  private getDateFormat(granularity: string): string {
    switch (granularity) {
      case 'daily':
        return 'YYYY-MM-DD';
      case 'weekly':
        return 'YYYY-[W]WW';
      case 'monthly':
        return 'YYYY-MM';
      default:
        return 'YYYY-MM-DD';
    }
  }

  /**
   * Helper: Increment date by granularity
   */
  private incrementDate(date: Date, granularity: string): void {
    switch (granularity) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
    }
  }
}
