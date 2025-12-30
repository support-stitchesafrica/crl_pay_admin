import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  Check,
  X,
  AlertCircle,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Ban,
  Eye,
  DollarSign,
} from 'lucide-react';
import * as merchantService from '../services/merchant.service';
import { Merchant } from '../services/types';
import { ConfirmationModal } from '../components/ui';
import { showToast } from '../utils/toast';

type TabType = 'pending' | 'approved' | 'rejected' | 'suspended';

const ITEMS_PER_PAGE = 10;

export default function Merchants() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [approvalModal, setApprovalModal] = useState<{ isOpen: boolean; merchant: Merchant | null }>({
    isOpen: false,
    merchant: null,
  });
  const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean; merchant: Merchant | null; reason: string }>({
    isOpen: false,
    merchant: null,
    reason: '',
  });
  const [suspendModal, setSuspendModal] = useState<{ isOpen: boolean; merchant: Merchant | null; reason: string }>({
    isOpen: false,
    merchant: null,
    reason: '',
  });
  const [activateModal, setActivateModal] = useState<{ isOpen: boolean; merchant: Merchant | null }>({
    isOpen: false,
    merchant: null,
  });
  const [viewModal, setViewModal] = useState<{ isOpen: boolean; merchant: Merchant | null }>({
    isOpen: false,
    merchant: null,
  });

  const loadMerchants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await merchantService.getAll();
      setMerchants(data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load merchants';
      setError(errorMsg);
      showToast.error(errorMsg);
      console.error('Error loading merchants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMerchants();
  }, []);

  // Filter merchants by active tab and search term
  useEffect(() => {
    let filtered = merchants.filter((m) => m.status === activeTab);

    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (m) =>
          m.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.phone.includes(searchTerm)
      );
    }

    setFilteredMerchants(filtered);
    setCurrentPage(1);
  }, [merchants, activeTab, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredMerchants.length / ITEMS_PER_PAGE);
  const paginatedMerchants = filteredMerchants.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleApprove = async () => {
    if (!approvalModal.merchant) return;

    try {
      setProcessingId(approvalModal.merchant.merchantId);
      await merchantService.approve(approvalModal.merchant.merchantId);
      await loadMerchants();
      showToast.success(`${approvalModal.merchant.businessName} has been activated successfully!`);
      setApprovalModal({ isOpen: false, merchant: null });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to approve merchant';
      showToast.error(errorMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionModal.merchant || !rejectionModal.reason.trim()) {
      showToast.warning('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessingId(rejectionModal.merchant.merchantId);
      await merchantService.reject(rejectionModal.merchant.merchantId, rejectionModal.reason);
      await loadMerchants();
      showToast.success(`${rejectionModal.merchant.businessName} has been rejected`);
      setRejectionModal({ isOpen: false, merchant: null, reason: '' });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to reject merchant';
      showToast.error(errorMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspend = async () => {
    if (!suspendModal.merchant || !suspendModal.reason.trim()) {
      showToast.warning('Please provide a reason for suspension');
      return;
    }

    try {
      setProcessingId(suspendModal.merchant.merchantId);
      await merchantService.suspend(suspendModal.merchant.merchantId, suspendModal.reason);
      await loadMerchants();
      showToast.success(`${suspendModal.merchant.businessName} has been suspended`);
      setSuspendModal({ isOpen: false, merchant: null, reason: '' });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to suspend merchant';
      showToast.error(errorMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleActivate = async () => {
    if (!activateModal.merchant) return;

    try {
      setProcessingId(activateModal.merchant.merchantId);
      await merchantService.activate(activateModal.merchant.merchantId);
      await loadMerchants();
      showToast.success(`${activateModal.merchant.businessName} has been activated`);
      setActivateModal({ isOpen: false, merchant: null });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to activate merchant';
      showToast.error(errorMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (timestamp?._seconds) {
      return new Date(timestamp._seconds * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTabCounts = () => {
    return {
      pending: merchants.filter((m) => m.status === 'pending').length,
      approved: merchants.filter((m) => m.status === 'approved').length,
      rejected: merchants.filter((m) => m.status === 'rejected').length,
      suspended: merchants.filter((m) => m.status === 'suspended').length,
    };
  };

  const tabCounts = getTabCounts();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading merchants...</p>
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
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Merchants</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={loadMerchants} className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline">
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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
          <p className="text-gray-600 mt-1">Manage merchant accounts and approvals</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pending'
                  ? 'border-yellow-500 text-yellow-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Approval
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-yellow-100 text-yellow-700">
                {tabCounts.pending}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'approved'
                  ? 'border-green-500 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Approved
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-green-100 text-green-700">
                {tabCounts.approved}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'rejected'
                  ? 'border-red-500 text-red-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Rejected
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-red-100 text-red-700">
                {tabCounts.rejected}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('suspended')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'suspended'
                  ? 'border-orange-500 text-orange-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Suspended
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-orange-100 text-orange-700">
                {tabCounts.suspended}
              </span>
            </button>
          </nav>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by business name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Table */}
        {filteredMerchants.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Merchants Found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search terms' : `No ${activeTab} merchants at the moment.`}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Business
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedMerchants.map((merchant) => (
                      <tr key={merchant.merchantId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{merchant.businessName}</div>
                              <div className="text-sm text-gray-500">{merchant.businessCategory}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span>{merchant.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{merchant.phone}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="line-clamp-2">
                              {(merchant as any).businessAddress || `${merchant.address}, ${merchant.city}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{formatTimestamp(merchant.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              merchant.status === 'approved'
                                ? 'bg-green-100 text-green-700'
                                : merchant.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : merchant.status === 'rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {merchant.status === 'pending' && (
                              <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-pulse"></div>
                            )}
                            {merchant.status.charAt(0).toUpperCase() + merchant.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* View button - always visible */}
                            <button
                              onClick={() => setViewModal({ isOpen: true, merchant })}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Status-specific actions */}
                            {activeTab === 'pending' && (
                              <>
                                <button
                                  onClick={() => setApprovalModal({ isOpen: true, merchant })}
                                  disabled={processingId === merchant.merchantId}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setRejectionModal({ isOpen: true, merchant, reason: '' })}
                                  disabled={processingId === merchant.merchantId}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Reject"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {activeTab === 'approved' && (
                              <button
                                onClick={() => setSuspendModal({ isOpen: true, merchant, reason: '' })}
                                disabled={processingId === merchant.merchantId}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Suspend"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                            {activeTab === 'suspended' && (
                              <button
                                onClick={() => setActivateModal({ isOpen: true, merchant })}
                                disabled={processingId === merchant.merchantId}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Activate"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-6 py-3 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredMerchants.length)} of {filteredMerchants.length}{' '}
                  results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Approval Modal */}
      <ConfirmationModal
        isOpen={approvalModal.isOpen}
        onClose={() => setApprovalModal({ isOpen: false, merchant: null })}
        onConfirm={handleApprove}
        title="Approve Merchant?"
        message={`Are you sure you want to approve ${approvalModal.merchant?.businessName}? They will receive API credentials and can start accepting BNPL payments.`}
        confirmText="Yes, Approve"
        cancelText="Cancel"
        confirmVariant="success"
        loading={processingId === approvalModal.merchant?.merchantId}
        icon={<CheckCircle className="w-6 h-6 text-green-600" />}
      />

      {/* Rejection Modal */}
      {rejectionModal.isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setRejectionModal({ isOpen: false, merchant: null, reason: '' })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 bg-red-100">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Reject Merchant?</h3>
              <p className="text-gray-600 mb-4">
                Please provide a reason for rejecting {rejectionModal.merchant?.businessName}. This will be sent to them via email.
              </p>
              <textarea
                value={rejectionModal.reason}
                onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
                placeholder="e.g., Incomplete documentation, Business category not supported..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm mb-4"
                rows={4}
                disabled={processingId === rejectionModal.merchant?.merchantId}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectionModal({ isOpen: false, merchant: null, reason: '' })}
                  disabled={processingId === rejectionModal.merchant?.merchantId}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processingId === rejectionModal.merchant?.merchantId || !rejectionModal.reason.trim()}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === rejectionModal.merchant?.merchantId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    'Reject Merchant'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Suspend Modal */}
      {suspendModal.isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setSuspendModal({ isOpen: false, merchant: null, reason: '' })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 bg-orange-100">
                <Ban className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Suspend Merchant?</h3>
              <p className="text-gray-600 mb-4">
                Please provide a reason for suspending {suspendModal.merchant?.businessName}. Their API access will be disabled.
              </p>
              <textarea
                value={suspendModal.reason}
                onChange={(e) => setSuspendModal({ ...suspendModal, reason: e.target.value })}
                placeholder="e.g., Suspicious activity, Policy violation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm mb-4"
                rows={4}
                disabled={processingId === suspendModal.merchant?.merchantId}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setSuspendModal({ isOpen: false, merchant: null, reason: '' })}
                  disabled={processingId === suspendModal.merchant?.merchantId}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSuspend}
                  disabled={processingId === suspendModal.merchant?.merchantId || !suspendModal.reason.trim()}
                  className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === suspendModal.merchant?.merchantId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Suspending...</span>
                    </>
                  ) : (
                    'Suspend Merchant'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Activate Modal */}
      <ConfirmationModal
        isOpen={activateModal.isOpen}
        onClose={() => setActivateModal({ isOpen: false, merchant: null })}
        onConfirm={handleActivate}
        title="Activate Merchant?"
        message={`Are you sure you want to activate ${activateModal.merchant?.businessName}? They will regain API access.`}
        confirmText="Yes, Activate"
        cancelText="Cancel"
        confirmVariant="success"
        loading={processingId === activateModal.merchant?.merchantId}
        icon={<CheckCircle className="w-6 h-6 text-green-600" />}
      />

      {/* View Details Modal */}
      {viewModal.isOpen && viewModal.merchant && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setViewModal({ isOpen: false, merchant: null })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{viewModal.merchant.businessName}</h3>
                    <p className="text-blue-100 text-sm">Merchant Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewModal({ isOpen: false, merchant: null })}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                      viewModal.merchant.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : viewModal.merchant.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : viewModal.merchant.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {viewModal.merchant.status === 'pending' && (
                      <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse"></div>
                    )}
                    {viewModal.merchant.status.charAt(0).toUpperCase() + viewModal.merchant.status.slice(1)}
                  </span>
                  <span className="text-sm text-gray-500">Merchant ID: {viewModal.merchant.merchantId}</span>
                </div>

                {/* Business Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-gray-600" />
                    Business Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Business Name</label>
                      <p className="text-gray-900 mt-1">{viewModal.merchant.businessName}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Business Category</label>
                      <p className="text-gray-900 mt-1">{viewModal.merchant.businessCategory}</p>
                    </div>
                    {viewModal.merchant.cacNumber && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">CAC Number</label>
                        <p className="text-gray-900 mt-1">{viewModal.merchant.cacNumber}</p>
                      </div>
                    )}
                    {(viewModal.merchant as any).websiteUrl && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Website</label>
                        <p className="text-blue-600 mt-1 truncate">
                          <a href={(viewModal.merchant as any).websiteUrl} target="_blank" rel="noopener noreferrer">
                            {(viewModal.merchant as any).websiteUrl}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-gray-600" />
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                      <p className="text-gray-900 mt-1">{viewModal.merchant.email}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Phone</label>
                      <p className="text-gray-900 mt-1">{viewModal.merchant.phone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">Business Address</label>
                      <p className="text-gray-900 mt-1">
                        {(viewModal.merchant as any).businessAddress ||
                          `${viewModal.merchant.address}, ${viewModal.merchant.city}, ${viewModal.merchant.state}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Settlement Account */}
                {(viewModal.merchant as any).settlementAccount && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-gray-600" />
                      Settlement Account
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Bank Name</label>
                        <p className="text-gray-900 mt-1">
                          {(viewModal.merchant as any).settlementAccount.bankName || 'Not configured'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Account Number</label>
                        <p className="text-gray-900 mt-1">
                          {(viewModal.merchant as any).settlementAccount.accountNumber || 'Not configured'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Account Name</label>
                        <p className="text-gray-900 mt-1">
                          {(viewModal.merchant as any).settlementAccount.accountName || 'Not configured'}
                        </p>
                      </div>
                      {(viewModal.merchant as any).settlementAccount.bankCode && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Bank Code</label>
                          <p className="text-gray-900 mt-1">{(viewModal.merchant as any).settlementAccount.bankCode}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* API Credentials */}
                {(viewModal.merchant as any).apiKey && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">API Credentials</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">API Key</label>
                        <p className="text-gray-900 mt-1 font-mono text-sm break-all">
                          {(viewModal.merchant as any).apiKey}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    Timeline
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Created At</label>
                      <p className="text-gray-900 mt-1">{formatTimestamp(viewModal.merchant.createdAt)}</p>
                    </div>
                    {viewModal.merchant.updatedAt && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Last Updated</label>
                        <p className="text-gray-900 mt-1">{formatTimestamp(viewModal.merchant.updatedAt)}</p>
                      </div>
                    )}
                    {(viewModal.merchant as any).approvedAt && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Approved At</label>
                        <p className="text-gray-900 mt-1">{formatTimestamp((viewModal.merchant as any).approvedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Notes */}
                {(viewModal.merchant as any).adminNotes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Admin Notes</h4>
                    <p className="text-gray-700 text-sm">{(viewModal.merchant as any).adminNotes}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end">
                <button
                  onClick={() => setViewModal({ isOpen: false, merchant: null })}
                  className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
