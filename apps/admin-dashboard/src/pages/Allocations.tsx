import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { allocationsService, type MerchantAllocation } from '../services/allocations.service';
import * as merchantService from '../services/merchant.service';
import DashboardLayout from '../components/DashboardLayout';
import { Plus, Search, AlertCircle, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Allocations() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<MerchantAllocation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { data: allocations, isLoading } = useQuery({
    queryKey: ['allocations'],
    queryFn: allocationsService.getAllocations,
  });

  const { data: merchants } = useQuery({
    queryKey: ['merchants'],
    queryFn: merchantService.getAll,
  });

  const filteredAllocations = allocations?.filter((allocation) => {
    const merchant = merchants?.find((m) => m.merchantId === allocation.merchantId);
    const merchantName = merchant?.businessName || '';
    return merchantName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount / 100);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
    };
    return styles[status as keyof typeof styles] || styles.expired;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'suspended':
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading allocations...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Merchant Allocations</h1>
            <p className="text-gray-600 mt-1">Manage capital allocations to merchants</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} className="mr-2" />
            Create Allocation
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by merchant name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Used</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loans</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAllocations?.map((allocation) => {
                  const merchant = merchants?.find((m) => m.merchantId === allocation.merchantId);
                  return (
                    <tr key={allocation.allocationId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{merchant?.businessName || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{merchant?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{formatCurrency(allocation.allocatedAmount)}</td>
                      <td className="px-6 py-4 text-green-600 font-medium">
                        {formatCurrency(allocation.availableAmount)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{formatCurrency(allocation.usedAmount)}</td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900">{allocation.activeLoans}</span>
                        <span className="text-gray-500 text-sm"> / {allocation.completedLoans}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(allocation.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(allocation.status)}`}>
                            {allocation.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{formatDate(allocation.expiresAt)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedAllocation(allocation);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredAllocations?.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-600">No allocations found</p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateAllocationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['allocations'] });
            setShowCreateModal(false);
          }}
          merchants={merchants || []}
        />
      )}

      {showDetailsModal && selectedAllocation && (
        <AllocationDetailsModal
          allocation={selectedAllocation}
          merchant={merchants?.find((m) => m.merchantId === selectedAllocation.merchantId)}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedAllocation(null);
          }}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['allocations'] });
          }}
        />
      )}
    </DashboardLayout>
  );
}

function CreateAllocationModal({ onClose, onSuccess, merchants }: any) {
  const [formData, setFormData] = useState({
    merchantId: '',
    allocatedAmount: '',
    tenure: '6',
    tenurePeriod: 'months',
    penaltyType: 'percentage',
    penaltyAmount: '2',
    gracePeriodDays: '3',
    expiresAt: '',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: allocationsService.createAllocation,
    onSuccess,
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create allocation');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      merchantId: formData.merchantId,
      allocatedAmount: parseFloat(formData.allocatedAmount) * 100,
      terms: {
        tenure: parseInt(formData.tenure),
        tenurePeriod: formData.tenurePeriod,
        penalty: {
          type: formData.penaltyType,
          amount: parseFloat(formData.penaltyAmount),
          gracePeriodDays: parseInt(formData.gracePeriodDays),
        },
      },
      expiresAt: formData.expiresAt,
      notes: formData.notes,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl m-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create Merchant Allocation</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Merchant</label>
              <select
                value={formData.merchantId}
                onChange={(e) => setFormData({ ...formData, merchantId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select merchant...</option>
                {merchants.map((m: any) => (
                  <option key={m.merchantId} value={m.merchantId}>
                    {m.businessName}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Allocated Amount (NGN)</label>
              <input
                type="number"
                value={formData.allocatedAmount}
                onChange={(e) => setFormData({ ...formData, allocatedAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="200000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenure</label>
              <input
                type="number"
                value={formData.tenure}
                onChange={(e) => setFormData({ ...formData, tenure: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenure Period</label>
              <select
                value={formData.tenurePeriod}
                onChange={(e) => setFormData({ ...formData, tenurePeriod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Penalty Amount (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.penaltyAmount}
                onChange={(e) => setFormData({ ...formData, penaltyAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (Days)</label>
              <input
                type="number"
                value={formData.gracePeriodDays}
                onChange={(e) => setFormData({ ...formData, gracePeriodDays: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Allocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AllocationDetailsModal({ allocation, merchant, onClose, onUpdate }: any) {
  const suspendMutation = useMutation({
    mutationFn: (reason: string) => allocationsService.suspendAllocation(allocation.allocationId, reason),
    onSuccess: () => {
      toast.success('Allocation suspended');
      onUpdate();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to suspend allocation');
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount / 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl m-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Allocation Details</h2>
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Merchant Information</h3>
            <p className="text-gray-700">{merchant?.businessName}</p>
            <p className="text-sm text-gray-500">{merchant?.email}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Allocated</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(allocation.allocatedAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Available</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(allocation.availableAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Used</p>
              <p className="text-lg font-semibold text-gray-600">{formatCurrency(allocation.usedAmount)}</p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Terms</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Tenure:</span>
                <span className="ml-2 font-medium">{allocation.terms.tenure} {allocation.terms.tenurePeriod}</span>
              </div>
              <div>
                <span className="text-gray-600">Penalty:</span>
                <span className="ml-2 font-medium">{allocation.terms.penalty.amount}% after {allocation.terms.penalty.gracePeriodDays} days</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Active Loans</p>
              <p className="text-lg font-semibold text-blue-600">{allocation.activeLoans}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed Loans</p>
              <p className="text-lg font-semibold text-green-600">{allocation.completedLoans}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          {allocation.status === 'active' && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to suspend this allocation?')) {
                  suspendMutation.mutate('Suspended by admin');
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Suspend Allocation
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
