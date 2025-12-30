import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Wallet, TrendingUp, AlertCircle, Loader2, DollarSign } from 'lucide-react';
import * as financierService from '../services/financier.service';
import { Financier } from '../services/types';
import { showToast } from '../utils/toast';

export default function Funds() {
  const [profile, setProfile] = useState<Financier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await financierService.getProfile();
      setProfile(data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load fund information';
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
            <p className="text-gray-600">Loading fund information...</p>
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
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Funds</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={loadProfile} className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline">
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
          <h1 className="text-2xl font-bold text-gray-900">Fund Management</h1>
          <p className="text-gray-600">Monitor your fund balances and allocation</p>
        </div>

        {/* Fund Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Available Funds</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(profile?.availableFunds || 0)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Allocated Funds</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(profile?.allocatedFunds || 0)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Total Disbursed</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(profile?.totalDisbursed || 0)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Total Repaid</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(profile?.totalRepaid || 0)}</p>
          </div>
        </div>

        {/* Fund Utilization */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Fund Utilization</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Available</span>
                <span className="font-semibold text-green-600">{formatCurrency(profile?.availableFunds || 0)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full"
                  style={{
                    width: `${
                      ((profile?.availableFunds || 0) /
                        ((profile?.availableFunds || 0) + (profile?.allocatedFunds || 1))) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Allocated</span>
                <span className="font-semibold text-orange-600">{formatCurrency(profile?.allocatedFunds || 0)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-orange-600 h-3 rounded-full"
                  style={{
                    width: `${
                      ((profile?.allocatedFunds || 0) /
                        ((profile?.availableFunds || 0) + (profile?.allocatedFunds || 1))) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Fund Allocation</h3>
          <p className="text-sm text-blue-700">
            Fund deposits and allocations are managed by CRL Pay administrators. Contact support to request additional
            funds or report any discrepancies.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
