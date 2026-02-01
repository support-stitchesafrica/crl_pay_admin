import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settlementsService, type SettlementRequest } from '../services/settlements.service';
import * as merchantService from '../services/merchant.service';
import DashboardLayout from '../components/DashboardLayout';
import { Plus, Search, AlertCircle, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function Settlements() {
  const queryClient = useQueryClient();
  const { admin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const isFinance = admin?.role === 'finance' || admin?.role === 'super_admin';
  const isAdmin = admin?.role === 'admin' || admin?.role === 'super_admin';

  const { data: settlements, isLoading } = useQuery({
    queryKey: ['settlements'],
    queryFn: settlementsService.getAllSettlements,
  });

  const { data: merchants } = useQuery({
    queryKey: ['merchants'],
    queryFn: merchantService.getAll,
  });

  const filteredSettlements = settlements?.filter((settlement) => {
    const merchant = merchants?.find((m: any) => m.merchantId === settlement.merchantId);
    const merchantName = merchant?.businessName || '';
    const matchesSearch = merchantName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || settlement.status === statusFilter;
    return matchesSearch && matchesStatus;
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-600" />;
      case 'approved':
        return <CheckCircle size={16} className="text-blue-600" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-600" />;
      case 'paid':
        return <CheckCircle size={16} className="text-green-600" />;
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
            <p className="text-gray-600">Loading settlements...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Settlement Requests</h1>
            <p className="text-gray-600 mt-1">Manage merchant settlement approvals and payouts</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} className="mr-2" />
              Create Settlement
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg ${
                  statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-4 py-2 rounded-lg ${
                  statusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-4 py-2 rounded-lg ${
                  statusFilter === 'approved' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-4 py-2 rounded-lg ${
                  statusFilter === 'paid' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Paid
              </button>
            </div>

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loans</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSettlements?.map((settlement) => {
                  const merchant = merchants?.find((m: any) => m.merchantId === settlement.merchantId);
                  return (
                    <tr key={settlement.settlementId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{merchant?.businessName || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{merchant?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{formatCurrency(settlement.breakdown.totalAmount)}</p>
                        <p className="text-xs text-gray-500">
                          Principal: {formatCurrency(settlement.breakdown.totalPrincipal)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{settlement.breakdown.loanCount}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(settlement.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(settlement.status)}`}>
                            {settlement.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{formatDate(settlement.requestedAt)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedSettlement(settlement);
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

          {filteredSettlements?.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-600">No settlements found</p>
            </div>
          )}
        </div>

        {isFinance && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="text-blue-600 mr-3 mt-0.5" size={20} />
              <div>
                <h4 className="font-semibold text-blue-900">Finance Role</h4>
                <p className="text-blue-800 text-sm mt-1">
                  You can approve, reject, and process payouts for settlement requests. Ensure all documentation is verified before approval.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateSettlementModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['settlements'] });
            setShowCreateModal(false);
          }}
          merchants={merchants || []}
        />
      )}

      {showDetailsModal && selectedSettlement && (
        <SettlementDetailsModal
          settlement={selectedSettlement}
          merchant={merchants?.find((m: any) => m.merchantId === selectedSettlement.merchantId)}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedSettlement(null);
          }}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['settlements'] });
          }}
          isFinance={isFinance}
        />
      )}
    </DashboardLayout>
  );
}

function CreateSettlementModal({ onClose, onSuccess, merchants }: any) {
  const [merchantId, setMerchantId] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [breakdown, setBreakdown] = useState<any>(null);

  const calculateMutation = useMutation({
    mutationFn: settlementsService.calculateSettlement,
    onSuccess: (data) => {
      setBreakdown(data);
      toast.success('Settlement calculated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to calculate settlement');
    },
  });

  const createMutation = useMutation({
    mutationFn: settlementsService.createSettlement,
    onSuccess,
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create settlement');
    },
  });

  const handleCalculate = () => {
    if (!merchantId) {
      toast.error('Please select a merchant');
      return;
    }
    calculateMutation.mutate(merchantId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakdown) {
      toast.error('Please calculate settlement first');
      return;
    }
    createMutation.mutate({ merchantId, requestNotes });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount / 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create Settlement Request</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Merchant</label>
            <select
              value={merchantId}
              onChange={(e) => {
                setMerchantId(e.target.value);
                setBreakdown(null);
              }}
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

          <button
            type="button"
            onClick={handleCalculate}
            disabled={!merchantId || calculateMutation.isPending}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            {calculateMutation.isPending ? 'Calculating...' : 'Calculate Settlement'}
          </button>

          {breakdown && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-gray-900">Settlement Breakdown</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Principal:</span>
                  <span className="font-medium">{formatCurrency(breakdown.totalPrincipal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Interest:</span>
                  <span className="font-medium">{formatCurrency(breakdown.totalInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Penalties:</span>
                  <span className="font-medium">{formatCurrency(breakdown.totalPenalties)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-lg">{formatCurrency(breakdown.totalAmount)}</span>
                </div>
                <div className="text-gray-600">Loans: {breakdown.loanCount}</div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Request Notes (Optional)</label>
            <textarea
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!breakdown || createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettlementDetailsModal({ settlement, merchant, onClose, onUpdate, isFinance }: any) {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const approveMutation = useMutation({
    mutationFn: () => settlementsService.approveSettlement(settlement.settlementId, { approvalNotes }),
    onSuccess: () => {
      toast.success('Settlement approved');
      onUpdate();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve settlement');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => settlementsService.rejectSettlement(settlement.settlementId, { rejectionReason }),
    onSuccess: () => {
      toast.success('Settlement rejected');
      onUpdate();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject settlement');
    },
  });

  const payoutMutation = useMutation({
    mutationFn: () => settlementsService.processPayout(settlement.settlementId),
    onSuccess: () => {
      toast.success('Payout processed successfully');
      onUpdate();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process payout');
    },
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl m-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Settlement Details</h2>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Merchant Information</h3>
            <p className="text-gray-700">{merchant?.businessName}</p>
            <p className="text-sm text-gray-500">{merchant?.email}</p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Settlement Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Principal:</span>
                <span className="font-medium">{formatCurrency(settlement.breakdown.totalPrincipal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Interest:</span>
                <span className="font-medium">{formatCurrency(settlement.breakdown.totalInterest)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Penalties:</span>
                <span className="font-medium">{formatCurrency(settlement.breakdown.totalPenalties)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-200">
                <span className="font-semibold text-lg">Total Amount:</span>
                <span className="font-bold text-xl text-blue-600">{formatCurrency(settlement.breakdown.totalAmount)}</span>
              </div>
              <div className="text-gray-600 text-sm">Loans: {settlement.breakdown.loanCount}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-semibold text-gray-900 capitalize">{settlement.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Requested At</p>
              <p className="font-semibold text-gray-900">{formatDate(settlement.requestedAt)}</p>
            </div>
          </div>

          {settlement.approvedAt && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                Approved by {settlement.approvedBy} on {formatDate(settlement.approvedAt)}
              </p>
              {settlement.approvalNotes && (
                <p className="text-sm text-green-700 mt-1">Notes: {settlement.approvalNotes}</p>
              )}
            </div>
          )}

          {settlement.rejectedAt && (
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm text-red-800">
                Rejected by {settlement.rejectedBy} on {formatDate(settlement.rejectedAt)}
              </p>
              {settlement.rejectionReason && (
                <p className="text-sm text-red-700 mt-1">Reason: {settlement.rejectionReason}</p>
              )}
            </div>
          )}

          {settlement.paidAt && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                Paid by {settlement.paidBy} on {formatDate(settlement.paidAt)}
              </p>
              {settlement.payoutReference && (
                <p className="text-sm text-green-700 mt-1">Reference: {settlement.payoutReference}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          {isFinance && settlement.status === 'pending' && (
            <>
              <button
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() => setShowApproveModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Approve
              </button>
            </>
          )}
          {isFinance && settlement.status === 'approved' && (
            <button
              onClick={() => {
                if (confirm('Process payout for this settlement?')) {
                  payoutMutation.mutate();
                }
              }}
              disabled={payoutMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {payoutMutation.isPending ? 'Processing...' : 'Process Payout'}
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

      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Approve Settlement</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Approval Notes (Optional)</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any notes..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {approveMutation.isPending ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Settlement</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Provide reason for rejection..."
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => rejectMutation.mutate()}
                  disabled={!rejectionReason || rejectMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
