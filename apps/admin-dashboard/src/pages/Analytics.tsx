import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Calendar,
  Loader2,
} from 'lucide-react';
import * as analyticsService from '../services/analytics.service';
import { showToast } from '../utils/toast';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [dashboard, setDashboard] = useState<any>(null);
  const [distribution, setDistribution] = useState<any>(null);
  const [merchantPerformance, setMerchantPerformance] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const periodMap = { '7d': 'weekly', '30d': 'monthly', '90d': 'monthly', '1y': 'yearly' };
      const period = periodMap[timeRange];
      
      const [dashboardData, distributionData, merchantData] = await Promise.all([
        analyticsService.getDashboardAnalytics(period),
        analyticsService.getLoanDistribution(),
        analyticsService.getMerchantPerformance(),
      ]);
      
      setDashboard(dashboardData);
      setDistribution(distributionData);
      setMerchantPerformance(merchantData);
    } catch (error: any) {
      showToast.error(error.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboard || !distribution) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
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
      value: formatCurrency(dashboard.totalRevenue),
      change: formatChange(dashboard.trends.revenueChange),
      trend: dashboard.trends.revenueChange >= 0 ? 'up' as const : 'down' as const,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Active Loans',
      value: dashboard.activeLoans.toLocaleString(),
      change: formatChange(dashboard.trends.loansChange),
      trend: dashboard.trends.loansChange >= 0 ? 'up' as const : 'down' as const,
      icon: CreditCard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Default Rate',
      value: `${dashboard.defaultRate.toFixed(1)}%`,
      change: dashboard.defaultRate < 3 ? '-0.5%' : '+0.5%',
      trend: dashboard.defaultRate < 3 ? 'down' as const : 'up' as const,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      label: 'Collection Rate',
      value: `${dashboard.collectionRate.toFixed(1)}%`,
      change: formatChange(dashboard.trends.collectedChange),
      trend: dashboard.trends.collectedChange >= 0 ? 'up' as const : 'down' as const,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const totalDisbursed = dashboard.totalDisbursed;
  const loanMetrics = [
    { 
      label: 'Total Disbursed', 
      value: formatCurrency(dashboard.totalDisbursed), 
      percentage: 100 
    },
    { 
      label: 'Total Collected', 
      value: formatCurrency(dashboard.totalCollected), 
      percentage: totalDisbursed > 0 ? (dashboard.totalCollected / totalDisbursed) * 100 : 0 
    },
    { 
      label: 'Outstanding', 
      value: formatCurrency(dashboard.totalOutstanding), 
      percentage: totalDisbursed > 0 ? (dashboard.totalOutstanding / totalDisbursed) * 100 : 0 
    },
    { 
      label: 'Default Rate', 
      value: `${dashboard.defaultRate.toFixed(1)}%`, 
      percentage: dashboard.defaultRate 
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
              Track performance metrics and business insights
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
                    ? 'bg-blue-600 text-white'
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
              <PieChart className="w-5 h-5 text-blue-600" />
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
                      className="bg-blue-600 h-2 rounded-full"
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

        {/* Merchant Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Top Performing Merchants
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Merchant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Loans
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Default Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {merchantPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No merchant data available
                    </td>
                  </tr>
                ) : (
                  merchantPerformance.map((merchant, index) => (
                    <tr key={merchant.merchantId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {index + 1}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {merchant.merchantName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{merchant.totalLoans}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(merchant.totalDisbursed)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            merchant.defaultRate < 2
                              ? 'bg-green-100 text-green-700'
                              : merchant.defaultRate < 2.5
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {merchant.defaultRate}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Growth Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">Loan Growth</h4>
            </div>
            <p className={`text-3xl font-bold mb-2 ${dashboard.trends.loansChange >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatChange(dashboard.trends.loansChange)}
            </p>
            <p className="text-sm text-gray-600">Compared to last period</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-gray-900">Collection Rate</h4>
            </div>
            <p className="text-3xl font-bold text-purple-600 mb-2">{dashboard.collectionRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-600">Of disbursed amount</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-gray-900">Average Loan Size</h4>
            </div>
            <p className="text-3xl font-bold text-green-600 mb-2">
              {formatCurrency(dashboard.totalLoans > 0 ? Math.round(dashboard.totalDisbursed / dashboard.totalLoans) : 0)}
            </p>
            <p className="text-sm text-gray-600">Per loan disbursed</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
