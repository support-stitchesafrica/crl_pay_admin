import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Check, X, AlertCircle, Loader2, Building2, Mail, Phone, MapPin, Calendar, CheckCircle, XCircle } from 'lucide-react';
import * as merchantService from '../services/merchant.service';
import { Merchant } from '../services/types';
import { ConfirmationModal } from '../components/ui';
import { showToast } from '../utils/toast';

export default function MerchantApproval() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Confirmation modal state
  const [approvalModal, setApprovalModal] = useState<{ isOpen: boolean; merchant: Merchant | null }>({
    isOpen: false,
    merchant: null,
  });
  const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean; merchant: Merchant | null; reason: string }>({
    isOpen: false,
    merchant: null,
    reason: '',
  });

  const loadPendingMerchants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await merchantService.getPending();
      setMerchants(data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load pending merchants';
      setError(errorMsg);
      showToast.error(errorMsg);
      console.error('Error loading merchants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingMerchants();
  }, []);

  const handleApprove = async () => {
    if (!approvalModal.merchant) return;

    try {
      setProcessingId(approvalModal.merchant.merchantId);
      await merchantService.approve(approvalModal.merchant.merchantId);

      // Remove from pending list
      setMerchants(merchants.filter((m) => m.merchantId !== approvalModal.merchant!.merchantId));

      showToast.success(`${approvalModal.merchant.businessName} has been approved successfully!`);
      setApprovalModal({ isOpen: false, merchant: null });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to approve merchant';
      showToast.error(errorMsg);
      console.error('Error approving merchant:', err);
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

      // Remove from pending list
      setMerchants(merchants.filter((m) => m.merchantId !== rejectionModal.merchant!.merchantId));

      showToast.success(`${rejectionModal.merchant.businessName} has been rejected`);
      setRejectionModal({ isOpen: false, merchant: null, reason: '' });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to reject merchant';
      showToast.error(errorMsg);
      console.error('Error rejecting merchant:', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading pending merchants...</p>
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
            <button
              onClick={loadPendingMerchants}
              className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline"
            >
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
        <div className="flex items-center justify-between">
          <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-semibold">
            {merchants.length} Pending
          </div>
        </div>

        {/* Merchants List */}
        {merchants.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-600">No pending merchant approvals at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {merchants.map((merchant) => (
              <div
                key={merchant.merchantId}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Merchant Info */}
                  <div className="flex-1 space-y-4">
                    {/* Business Name & Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{merchant.businessName}</h3>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium mt-1">
                            <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-pulse"></div>
                            Pending Review
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{merchant.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{merchant.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 md:col-span-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{(merchant as any).businessAddress || `${merchant.address}, ${merchant.city}, ${merchant.state}`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          Applied on {(() => {
                            const createdAt = merchant.createdAt as any;
                            if (createdAt?._seconds) {
                              return new Date(createdAt._seconds * 1000).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              });
                            }
                            return new Date(merchant.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            });
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setApprovalModal({ isOpen: true, merchant })}
                      disabled={processingId === merchant.merchantId}
                      className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg
                               font-medium transition-colors flex items-center gap-2 disabled:opacity-50
                               disabled:cursor-not-allowed shadow-sm"
                    >
                      {processingId === merchant.merchantId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => setRejectionModal({ isOpen: true, merchant, reason: '' })}
                      disabled={processingId === merchant.merchantId}
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg
                               font-medium transition-colors flex items-center gap-2 disabled:opacity-50
                               disabled:cursor-not-allowed shadow-sm"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval Confirmation Modal */}
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

      {/* Rejection Confirmation Modal */}
      {rejectionModal.isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setRejectionModal({ isOpen: false, merchant: null, reason: '' })}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 bg-red-100">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">Reject Merchant?</h3>

              {/* Message */}
              <p className="text-gray-600 mb-4">
                Please provide a reason for rejecting {rejectionModal.merchant?.businessName}. This will be sent to them via email.
              </p>

              {/* Reason Input */}
              <textarea
                value={rejectionModal.reason}
                onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
                placeholder="e.g., Incomplete documentation, Business category not supported..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2
                         focus:ring-red-500 focus:border-red-500 text-sm mb-4"
                rows={4}
                disabled={processingId === rejectionModal.merchant?.merchantId}
              />

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectionModal({ isOpen: false, merchant: null, reason: '' })}
                  disabled={processingId === rejectionModal.merchant?.merchantId}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg
                           font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processingId === rejectionModal.merchant?.merchantId || !rejectionModal.reason.trim()}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg
                           font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
    </DashboardLayout>
  );
}
