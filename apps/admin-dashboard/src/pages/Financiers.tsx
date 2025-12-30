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
  Calendar,
  CheckCircle,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Ban,
  DollarSign,
  FileText,
  Eye,
} from 'lucide-react';
import * as financierService from '../services/financier.service';
import { Financier } from '../services/types';
import { ConfirmationModal } from '../components/ui';
import { showToast } from '../utils/toast';

type TabType = 'pending' | 'approved' | 'rejected' | 'suspended';

const ITEMS_PER_PAGE = 10;

export default function Financiers() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [financiers, setFinanciers] = useState<Financier[]>([]);
  const [filteredFinanciers, setFilteredFinanciers] = useState<Financier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [approvalModal, setApprovalModal] = useState<{ isOpen: boolean; financier: Financier | null }>({
    isOpen: false,
    financier: null,
  });
  const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean; financier: Financier | null; reason: string }>({
    isOpen: false,
    financier: null,
    reason: '',
  });
  const [suspendModal, setSuspendModal] = useState<{ isOpen: boolean; financier: Financier | null; reason: string }>({
    isOpen: false,
    financier: null,
    reason: '',
  });
  const [viewModal, setViewModal] = useState<{ isOpen: boolean; financier: Financier | null }>({
    isOpen: false,
    financier: null,
  });

  const loadFinanciers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await financierService.getAll();
      setFinanciers(data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load financiers';
      setError(errorMsg);
      showToast.error(errorMsg);
      console.error('Error loading financiers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanciers();
  }, []);

  // Filter financiers by active tab and search term
  useEffect(() => {
    let filtered = financiers.filter((f) => f.status === activeTab);

    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (f) =>
          f.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.phone.includes(searchTerm) ||
          f.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFinanciers(filtered);
    setCurrentPage(1);
  }, [financiers, activeTab, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredFinanciers.length / ITEMS_PER_PAGE);
  const paginatedFinanciers = filteredFinanciers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleApprove = async () => {
    if (!approvalModal.financier) return;

    try {
      setProcessingId(approvalModal.financier.financierId);
      await financierService.approve(approvalModal.financier.financierId);
      await loadFinanciers();
      showToast.success(`${approvalModal.financier.companyName} has been approved successfully!`);
      setApprovalModal({ isOpen: false, financier: null });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to approve financier';
      showToast.error(errorMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionModal.financier || !rejectionModal.reason.trim()) {
      showToast.warning('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessingId(rejectionModal.financier.financierId);
      await financierService.reject(rejectionModal.financier.financierId, rejectionModal.reason);
      await loadFinanciers();
      showToast.success(`${rejectionModal.financier.companyName} has been rejected`);
      setRejectionModal({ isOpen: false, financier: null, reason: '' });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to reject financier';
      showToast.error(errorMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspend = async () => {
    if (!suspendModal.financier || !suspendModal.reason.trim()) {
      showToast.warning('Please provide a reason for suspension');
      return;
    }

    try {
      setProcessingId(suspendModal.financier.financierId);
      await financierService.suspend(suspendModal.financier.financierId, suspendModal.reason);
      await loadFinanciers();
      showToast.success(`${suspendModal.financier.companyName} has been suspended`);
      setSuspendModal({ isOpen: false, financier: null, reason: '' });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to suspend financier';
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
      pending: financiers.filter((f) => f.status === 'pending').length,
      approved: financiers.filter((f) => f.status === 'approved').length,
      rejected: financiers.filter((f) => f.status === 'rejected').length,
      suspended: financiers.filter((f) => f.status === 'suspended').length,
    };
  };

  const tabCounts = getTabCounts();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading financiers...</p>
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
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Financiers</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={loadFinanciers} className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline">
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
          <h1 className="text-2xl font-bold text-gray-900">Financiers</h1>
          <p className="text-gray-600 mt-1">Manage financier accounts and approvals</p>
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
            placeholder="Search by company name, email, phone, or registration number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* Table */}
        {filteredFinanciers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Financiers Found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search terms' : `No ${activeTab} financiers at the moment.`}
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
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Funds
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
                    {paginatedFinanciers.map((financier) => (
                      <tr key={financier.financierId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{financier.companyName}</div>
                              <div className="text-sm text-gray-500">{financier.businessCategory}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span>{financier.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{financier.phone}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span>{financier.registrationNumber}</span>
                            </div>
                            {financier.taxId && (
                              <div className="text-xs text-gray-500">Tax ID: {financier.taxId}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              <span className="text-green-600 font-medium">
                                ₦{financier.availableFunds.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Allocated: ₦{financier.allocatedFunds.toLocaleString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{formatTimestamp(financier.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              financier.status === 'approved'
                                ? 'bg-green-100 text-green-700'
                                : financier.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : financier.status === 'rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {financier.status === 'pending' && (
                              <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-pulse"></div>
                            )}
                            {financier.status.charAt(0).toUpperCase() + financier.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* View button - always visible */}
                            <button
                              onClick={() => setViewModal({ isOpen: true, financier })}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Status-specific actions */}
                            {activeTab === 'pending' && (
                              <>
                                <button
                                  onClick={() => setApprovalModal({ isOpen: true, financier })}
                                  disabled={processingId === financier.financierId}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setRejectionModal({ isOpen: true, financier, reason: '' })}
                                  disabled={processingId === financier.financierId}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Reject"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {activeTab === 'approved' && (
                              <button
                                onClick={() => setSuspendModal({ isOpen: true, financier, reason: '' })}
                                disabled={processingId === financier.financierId}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Suspend"
                              >
                                <Ban className="w-4 h-4" />
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
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredFinanciers.length)} of {filteredFinanciers.length}{' '}
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
        onClose={() => setApprovalModal({ isOpen: false, financier: null })}
        onConfirm={handleApprove}
        title="Approve Financier?"
        message={`Are you sure you want to approve ${approvalModal.financier?.companyName}? They will be able to create financing plans and fund merchant loans.`}
        confirmText="Yes, Approve"
        cancelText="Cancel"
        confirmVariant="success"
        loading={processingId === approvalModal.financier?.financierId}
        icon={<CheckCircle className="w-6 h-6 text-green-600" />}
      />

      {/* Rejection Modal */}
      {rejectionModal.isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setRejectionModal({ isOpen: false, financier: null, reason: '' })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 bg-red-100">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Reject Financier?</h3>
              <p className="text-gray-600 mb-4">
                Please provide a reason for rejecting {rejectionModal.financier?.companyName}. This will be sent to them via email.
              </p>
              <textarea
                value={rejectionModal.reason}
                onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
                placeholder="e.g., Incomplete documentation, Business verification failed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm mb-4"
                rows={4}
                disabled={processingId === rejectionModal.financier?.financierId}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectionModal({ isOpen: false, financier: null, reason: '' })}
                  disabled={processingId === rejectionModal.financier?.financierId}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processingId === rejectionModal.financier?.financierId || !rejectionModal.reason.trim()}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === rejectionModal.financier?.financierId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    'Reject Financier'
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
            onClick={() => setSuspendModal({ isOpen: false, financier: null, reason: '' })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 bg-orange-100">
                <Ban className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Suspend Financier?</h3>
              <p className="text-gray-600 mb-4">
                Please provide a reason for suspending {suspendModal.financier?.companyName}. Their access will be disabled.
              </p>
              <textarea
                value={suspendModal.reason}
                onChange={(e) => setSuspendModal({ ...suspendModal, reason: e.target.value })}
                placeholder="e.g., Suspicious activity, Compliance issues..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm mb-4"
                rows={4}
                disabled={processingId === suspendModal.financier?.financierId}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setSuspendModal({ isOpen: false, financier: null, reason: '' })}
                  disabled={processingId === suspendModal.financier?.financierId}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSuspend}
                  disabled={processingId === suspendModal.financier?.financierId || !suspendModal.reason.trim()}
                  className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === suspendModal.financier?.financierId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Suspending...</span>
                    </>
                  ) : (
                    'Suspend Financier'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View Details Modal */}
      {viewModal.isOpen && viewModal.financier && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setViewModal({ isOpen: false, financier: null })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 rounded-t-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{viewModal.financier.companyName}</h3>
                    <p className="text-purple-100 text-sm">Financier Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewModal({ isOpen: false, financier: null })}
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
                      viewModal.financier.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : viewModal.financier.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : viewModal.financier.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {viewModal.financier.status === 'pending' && (
                      <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse"></div>
                    )}
                    {viewModal.financier.status.charAt(0).toUpperCase() + viewModal.financier.status.slice(1)}
                  </span>
                  <span className="text-sm text-gray-500">Financier ID: {viewModal.financier.financierId}</span>
                </div>

                {/* Company Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-gray-600" />
                    Company Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Company Name</label>
                      <p className="text-gray-900 mt-1">{viewModal.financier.companyName}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Business Category</label>
                      <p className="text-gray-900 mt-1">{viewModal.financier.businessCategory}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Registration Number</label>
                      <p className="text-gray-900 mt-1">{viewModal.financier.registrationNumber}</p>
                    </div>
                    {viewModal.financier.taxId && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Tax ID</label>
                        <p className="text-gray-900 mt-1">{viewModal.financier.taxId}</p>
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
                      <p className="text-gray-900 mt-1">{viewModal.financier.email}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Phone</label>
                      <p className="text-gray-900 mt-1">{viewModal.financier.phone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">Business Address</label>
                      <p className="text-gray-900 mt-1">{viewModal.financier.businessAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Fund Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-gray-600" />
                    Fund Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Available Funds</label>
                      <p className="text-green-600 text-lg font-semibold mt-1">
                        ₦{viewModal.financier.availableFunds.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Allocated Funds</label>
                      <p className="text-orange-600 text-lg font-semibold mt-1">
                        ₦{viewModal.financier.allocatedFunds.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Total Funds</label>
                      <p className="text-blue-600 text-lg font-semibold mt-1">
                        ₦{(viewModal.financier.availableFunds + viewModal.financier.allocatedFunds).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Utilization Rate</label>
                      <p className="text-gray-900 text-lg font-semibold mt-1">
                        {(() => {
                          const available = viewModal.financier.availableFunds || 0;
                          const allocated = viewModal.financier.allocatedFunds || 0;
                          const total = available + allocated;
                          if (total === 0) return '0';
                          return ((allocated / total) * 100).toFixed(1);
                        })()}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Settlement Account */}
                {(viewModal.financier as any).settlementAccount && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-gray-600" />
                      Settlement Account
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Bank Name</label>
                        <p className="text-gray-900 mt-1">
                          {(viewModal.financier as any).settlementAccount.bankName || 'Not configured'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Account Number</label>
                        <p className="text-gray-900 mt-1">
                          {(viewModal.financier as any).settlementAccount.accountNumber || 'Not configured'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Account Name</label>
                        <p className="text-gray-900 mt-1">
                          {(viewModal.financier as any).settlementAccount.accountName || 'Not configured'}
                        </p>
                      </div>
                      {(viewModal.financier as any).settlementAccount.bankCode && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">Bank Code</label>
                          <p className="text-gray-900 mt-1">{(viewModal.financier as any).settlementAccount.bankCode}</p>
                        </div>
                      )}
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
                      <p className="text-gray-900 mt-1">{formatTimestamp(viewModal.financier.createdAt)}</p>
                    </div>
                    {viewModal.financier.updatedAt && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Last Updated</label>
                        <p className="text-gray-900 mt-1">{formatTimestamp(viewModal.financier.updatedAt)}</p>
                      </div>
                    )}
                    {(viewModal.financier as any).approvedAt && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Approved At</label>
                        <p className="text-gray-900 mt-1">{formatTimestamp((viewModal.financier as any).approvedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Notes */}
                {(viewModal.financier as any).adminNotes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Admin Notes</h4>
                    <p className="text-gray-700 text-sm">{(viewModal.financier as any).adminNotes}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end">
                <button
                  onClick={() => setViewModal({ isOpen: false, financier: null })}
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
