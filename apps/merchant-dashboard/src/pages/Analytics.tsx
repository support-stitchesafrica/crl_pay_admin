import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Loader2,
} from 'lucide-react';
import * as analyticsService from '../services/analytics.service';
import { showToast } from '../utils/toast';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [analytics, setAnalytics] = useState<any>(null);
  const [distribution, setDistribution] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const periodMap = { '7d': 'weekly', '30d': 'monthly', '90d': 'monthly', '1y': 'yearly' };
      const period = periodMap[timeRange];
      
      const [analyticsData, distributionData] = await Promise.all([
        analyticsService.getMerchantAnalytics(period),
        analyticsService.getLoanDistribution(),
      ]);
      
      setAnalytics(analyticsData);
      setDistribution(distributionData);
    } catch (error: any) {
      showToast.error(error.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics || !distribution) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change}%`;
  };

  const stats = [
    {
      label: 'Total Revenue',
      value: formatCurrency(analytics.totalRevenue),
      change: formatChange(analytics.trends.revenueChange),
      trend: analytics.trends.revenueChange >= 0 ? 'up' as const : 'down' as const,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Active Loans',
      value: analytics.activeLoans.toLocaleString(),
      change: formatChange(analytics.trends.loansChange),
      trend: analytics.trends.loansChange >= 0 ? 'up' as const : 'down' as const,
      icon: CreditCard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Default Rate',
      value: `${analytics.defaultRate.toFixed(1)}%`,
      change: analytics.defaultRate < 3 ? '-0.5%' : '+0.5%',
      trend: analytics.defaultRate < 3 ? 'down' as const : 'up' as const,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      label: 'Collection Rate',
      value: `${analytics.collectionRate.toFixed(1)}%`,
      change: formatChange(analytics.trends.collectedChange),
      trend: analytics.trends.collectedChange >= 0 ? 'up' as const : 'down' as const,
      icon: CheckCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const totalDisbursed = analytics.totalDisbursed;
  const loanMetrics = [
    { 
      label: 'Total Disbursed', 
      value: formatCurrency(analytics.totalDisbursed), 
      percentage: 100 
    },
    { 
      label: 'Total Collected', 
      value: formatCurrency(analytics.totalCollected), 
      percentage: totalDisbursed > 0 ? (analytics.totalCollected / totalDisbursed) * 100 : 0 
    },
    { 
      label: 'Outstanding', 
      value: formatCurrency(analytics.totalOutstanding), 
      percentage: totalDisbursed > 0 ? (analytics.totalOutstanding / totalDisbursed) * 100 : 0 
    },
    { 
      label: 'Default Rate', 
      value: `${analytics.defaultRate.toFixed(1)}%`, 
      percentage: analytics.defaultRate 
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">
              Track your BNPL performance and business insights
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {[
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
              { value: '90d', label: '90 Days' },
              { value: '1y', label: '1 Year' },
            ].map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value as typeof timeRange)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  timeRange === range.value
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      stat.trend === 'up'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {stat.trend === 'up' ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Loan Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Loan Metrics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-green-600" />
              Loan Performance
            </h3>
            <div className="space-y-4">
              {loanMetrics.map((metric) => (
                <div key={metric.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                    <span className="text-sm font-semibold text-gray-900">{metric.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${metric.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Loan Status Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(distribution.byStatus).map(([status, count]: [string, any]) => {
                const totalLoans = Object.values(distribution.byStatus).reduce((sum: number, c: any) => sum + c, 0);
                const percentage = totalLoans > 0 ? ((count / totalLoans) * 100).toFixed(1) : '0.0';
                
                const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
                  completed: { icon: CheckCircle, color: 'text-green-600', label: 'Completed' },
                  active: { icon: Clock, color: 'text-blue-600', label: 'Active' },
                  pending: { icon: AlertCircle, color: 'text-yellow-600', label: 'Pending' },
                  defaulted: { icon: AlertCircle, color: 'text-red-600', label: 'Defaulted' },
                  cancelled: { icon: AlertCircle, color: 'text-gray-600', label: 'Cancelled' },
                };
                
                const config = statusConfig[status] || { icon: Clock, color: 'text-gray-600', label: status };
                const Icon = config.icon;
                
                return (
                  <div key={status} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <span className="text-sm text-gray-700">{config.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{count} loans</p>
                      <p className="text-xs text-gray-500">{percentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-gray-900">Total Loans</h4>
            </div>
            <p className="text-3xl font-bold text-green-600 mb-2">{analytics.totalLoans}</p>
            <p className="text-sm text-gray-600">All-time loans created</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">Interest Earned</h4>
            </div>
            <p className="text-3xl font-bold text-blue-600 mb-2">
              {formatCurrency(analytics.interestEarned)}
            </p>
            <p className="text-sm text-gray-600">From completed loans</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-gray-900">Completed Loans</h4>
            </div>
            <p className="text-3xl font-bold text-purple-600 mb-2">{analytics.completedLoans}</p>
            <p className="text-sm text-gray-600">Successfully repaid</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
