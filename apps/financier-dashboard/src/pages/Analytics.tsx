import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { BarChart3, AlertCircle, Loader2 } from 'lucide-react';
import * as financierService from '../services/financier.service';
import { FinancierAnalytics } from '../services/types';
import { showToast } from '../utils/toast';

export default function Analytics() {
  const [analytics, setAnalytics] = useState<FinancierAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await financierService.getAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load analytics';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Analytics</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={loadAnalytics} className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline">
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Detailed performance metrics and insights</p>
        </div>

        {/* Portfolio Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Portfolio Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Repayment Rate</span>
                <span className="font-semibold text-green-600">
                  {analytics?.overview.repaymentRate.toFixed(1) || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full"
                  style={{ width: `${analytics?.overview.repaymentRate || 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Default Rate</span>
                <span className="font-semibold text-red-600">
                  {analytics?.overview.defaultRate.toFixed(1) || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-red-600 h-3 rounded-full"
                  style={{ width: `${analytics?.overview.defaultRate || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Loan Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Loans</span>
                <span className="text-lg font-bold text-gray-900">{analytics?.overview.totalLoans || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Loans</span>
                <span className="text-lg font-bold text-blue-600">{analytics?.overview.activeLoans || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed Loans</span>
                <span className="text-lg font-bold text-green-600">{analytics?.overview.completedLoans || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Defaulted Loans</span>
                <span className="text-lg font-bold text-red-600">{analytics?.overview.defaultedLoans || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Financial Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Available Funds</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(analytics?.financials.availableFunds || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Disbursed</span>
                <span className="text-lg font-bold text-blue-600">
                  {formatCurrency(analytics?.financials.totalDisbursed || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Repaid</span>
                <span className="text-lg font-bold text-purple-600">
                  {formatCurrency(analytics?.financials.totalRepaid || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Revenue</span>
                <span className="text-lg font-bold text-orange-600">
                  {formatCurrency(analytics?.financials.totalRevenue || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
          <BarChart3 className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <h3 className="font-semibold text-purple-900 mb-2">Advanced Analytics Coming Soon</h3>
          <p className="text-sm text-purple-700">
            Charts, trend analysis, and detailed reports will be available in future updates.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
