import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Check, X, AlertCircle, Loader2 } from 'lucide-react';
import * as merchantService from '../services/merchant.service';
import { Merchant } from '../services/types';

export default function MerchantApproval() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadPendingMerchants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await merchantService.getPending();
      setMerchants(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load pending merchants');
      console.error('Error loading merchants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingMerchants();
  }, []);

  const handleApprove = async (merchantId: string) => {
    if (!confirm('Are you sure you want to approve this merchant?')) return;

    try {
      setProcessingId(merchantId);
      await merchantService.approve(merchantId);
      // Remove from pending list
      setMerchants(merchants.filter((m) => m.merchantId !== merchantId));
      alert('Merchant approved successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve merchant');
      console.error('Error approving merchant:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (merchantId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      setProcessingId(merchantId);
      await merchantService.reject(merchantId, reason);
      // Remove from pending list
      setMerchants(merchants.filter((m) => m.merchantId !== merchantId));
      alert('Merchant rejected successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject merchant');
      console.error('Error rejecting merchant:', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Merchants</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Pending Approvals ({merchants.length})</h2>
        </div>

        {merchants.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No pending merchant approvals</p>
          </div>
        ) : (
          <div className="divide-y">
            {merchants.map((merchant) => (
              <div key={merchant.merchantId} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{merchant.businessName}</h3>
                    <p className="text-sm text-gray-600">{merchant.email}</p>
                    <p className="text-sm text-gray-600">{merchant.phone}</p>
                    <p className="text-sm text-gray-600">
                      {merchant.address}, {merchant.city}, {merchant.state}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Applied: {new Date(merchant.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(merchant.merchantId)}
                      disabled={processingId === merchant.merchantId}
                      className="p-2 text-green-600 hover:bg-green-50 rounded flex items-center gap-1 disabled:opacity-50"
                    >
                      {processingId === merchant.merchantId ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(merchant.merchantId)}
                      disabled={processingId === merchant.merchantId}
                      className="p-2 text-red-600 hover:bg-red-50 rounded flex items-center gap-1 disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
