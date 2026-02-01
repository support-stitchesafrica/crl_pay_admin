import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { capitalService } from '../services/capital.service';
import DashboardLayout from '../components/DashboardLayout';
import { DollarSign, TrendingUp, TrendingDown, RefreshCw, Wallet, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CapitalPool() {
  const queryClient = useQueryClient();
  const [showSetCapitalModal, setShowSetCapitalModal] = useState(false);
  const [capitalAmount, setCapitalAmount] = useState('');
  const [notes, setNotes] = useState('');

  const { data: pool, isLoading, error } = useQuery({
    queryKey: ['capital-pool'],
    queryFn: capitalService.getPoolStatus,
  });

  const setCapitalMutation = useMutation({
    mutationFn: capitalService.setTotalCapital,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capital-pool'] });
      toast.success('Capital updated successfully');
      setShowSetCapitalModal(false);
      setCapitalAmount('');
      setNotes('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update capital');
    },
  });

  const updateMetricsMutation = useMutation({
    mutationFn: capitalService.updateMetrics,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capital-pool'] });
      toast.success('Metrics updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update metrics');
    },
  });

  const handleSetCapital = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(capitalAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setCapitalMutation.mutate({ amount: amount * 100, notes });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount / 100);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading capital pool...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="text-red-600 mr-2" size={20} />
            <p className="text-red-800">Failed to load capital pool data</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Capital Pool Management</h1>
            <p className="text-gray-600 mt-1">Monitor and manage CRL Pay's lending capital</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => updateMetricsMutation.mutate()}
              disabled={updateMetricsMutation.isPending}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh Metrics
            </button>
            <button
              onClick={() => setShowSetCapitalModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <DollarSign size={16} className="mr-2" />
              Set Total Capital
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Capital</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(pool?.totalCapital || 0)}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Wallet className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Allocated</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(pool?.allocated || 0)}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <TrendingUp className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(pool?.available || 0)}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Utilization Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {pool?.utilizationRate?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <TrendingDown className="text-purple-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Loans</h3>
            <p className="text-3xl font-bold text-blue-600">{pool?.metrics?.activeLoansCount || 0}</p>
            <p className="text-sm text-gray-600 mt-2">Currently disbursed loans</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Repayments</h3>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(pool?.totalRepaid || 0)}
            </p>
            <p className="text-sm text-gray-600 mt-2">Received from customers</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Settlements</h3>
            <p className="text-3xl font-bold text-orange-600">
              {formatCurrency(pool?.pendingSettlement || 0)}
            </p>
            <p className="text-sm text-gray-600 mt-2">Awaiting payout</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="text-blue-600 mr-3 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-blue-900">About Capital Pool</h4>
              <p className="text-blue-800 text-sm mt-1">
                The capital pool represents CRL Pay's total lending capacity. Capital is allocated to merchants,
                who then use it to offer BNPL services to their customers. Monitor utilization rates and ensure
                sufficient capital is available for new allocations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showSetCapitalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Set Total Capital</h2>
            <form onSubmit={handleSetCapital}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (NGN)
                  </label>
                  <input
                    type="number"
                    value={capitalAmount}
                    onChange={(e) => setCapitalAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="1000000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Reason for capital adjustment..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowSetCapitalModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={setCapitalMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {setCapitalMutation.isPending ? 'Updating...' : 'Update Capital'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
