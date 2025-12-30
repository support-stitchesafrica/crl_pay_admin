import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Building2, Phone, MapPin, Mail, AlertCircle, Loader2, CheckCircle, Edit2, X, CreditCard } from 'lucide-react';
import * as financierService from '../services/financier.service';
import { Financier } from '../services/types';
import { showToast } from '../utils/toast';

export default function Settings() {
  const [profile, setProfile] = useState<Financier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    phone: '',
    businessAddress: '',
    settlementAccount: {
      bankName: '',
      accountNumber: '',
      accountName: '',
    },
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await financierService.getProfile();
      setProfile(data);
      setFormData({
        phone: data.phone,
        businessAddress: data.businessAddress,
        settlementAccount: {
          bankName: data.settlementAccount?.bankName || '',
          accountNumber: data.settlementAccount?.accountNumber || '',
          accountName: data.settlementAccount?.accountName || '',
        },
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load profile';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    // Reset form data to current profile values
    setFormData({
      phone: profile?.phone || '',
      businessAddress: profile?.businessAddress || '',
      settlementAccount: {
        bankName: profile?.settlementAccount?.bankName || '',
        accountNumber: profile?.settlementAccount?.accountNumber || '',
        accountName: profile?.settlementAccount?.accountName || '',
      },
    });
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await financierService.updateProfile(formData);
      showToast.success('Profile updated successfully!');
      setShowEditModal(false);
      loadProfile();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update profile';
      showToast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading settings...</p>
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
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Profile</h3>
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
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your profile and account settings</p>
        </div>

        {/* Profile Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Profile Information</h3>
            <button
              onClick={handleOpenModal}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">Company Name</label>
                <p className="text-gray-900 mt-1">{profile?.companyName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900 mt-1">{profile?.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <p className="text-gray-900 mt-1">{profile?.phone || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 md:col-span-2">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">Business Address</label>
                <p className="text-gray-900 mt-1">{profile?.businessAddress || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Business Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Business Category</label>
              <p className="text-gray-900 mt-1">{profile?.businessCategory}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Registration Number</label>
              <p className="text-gray-900 mt-1">{profile?.registrationNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tax ID</label>
              <p className="text-gray-900 mt-1">{profile?.taxId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <p className="mt-1">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    profile?.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : profile?.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {profile?.status.charAt(0).toUpperCase()}
                  {profile?.status.slice(1)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Fund Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">$</span> Fund Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 uppercase tracking-wide">Available Funds</label>
              <p className="text-2xl font-bold text-green-600 mt-1">
                ₦{(profile?.availableFunds || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 uppercase tracking-wide">Allocated Funds</label>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                ₦{(profile?.allocatedFunds || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Funds</label>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                ₦{((profile?.availableFunds || 0) + (profile?.allocatedFunds || 0)).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 uppercase tracking-wide">Utilization Rate</label>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(() => {
                  const available = profile?.availableFunds || 0;
                  const allocated = profile?.allocatedFunds || 0;
                  const total = available + allocated;
                  if (total === 0) return '0%';
                  const rate = (allocated / total) * 100;
                  return `${rate.toFixed(1)}%`;
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* Settlement Account */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">Settlement Account</h3>
              <p className="text-sm text-gray-600 mt-1">
                Account where repayments and settlements will be sent.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Bank Name</label>
              <p className="text-gray-900 mt-1">
                {profile?.settlementAccount?.bankName || 'Not configured'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Account Number</label>
              <p className="text-gray-900 mt-1">
                {profile?.settlementAccount?.accountNumber || 'Not configured'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Account Name</label>
              <p className="text-gray-900 mt-1">
                {profile?.settlementAccount?.accountName || 'Not configured'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={handleCloseModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 rounded-t-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Edit2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Edit Profile</h3>
                    <p className="text-purple-100 text-sm">Update your business information</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
                {/* Contact Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-gray-600" />
                    Contact Information
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 focus:border-purple-500 focus:outline-none transition-colors text-sm"
                        placeholder="+234 800 000 0000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Business Address
                      </label>
                      <textarea
                        value={formData.businessAddress}
                        onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 focus:border-purple-500 focus:outline-none transition-colors text-sm"
                        rows={3}
                        placeholder="Enter your business address"
                      />
                    </div>
                  </div>
                </div>

                {/* Settlement Account */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    Settlement Account
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={formData.settlementAccount.bankName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            settlementAccount: {
                              ...formData.settlementAccount,
                              bankName: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 focus:border-purple-500 focus:outline-none transition-colors text-sm"
                        placeholder="e.g., First Bank of Nigeria"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={formData.settlementAccount.accountNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            settlementAccount: {
                              ...formData.settlementAccount,
                              accountNumber: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 focus:border-purple-500 focus:outline-none transition-colors text-sm"
                        placeholder="1234567890"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Account Name
                      </label>
                      <input
                        type="text"
                        value={formData.settlementAccount.accountName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            settlementAccount: {
                              ...formData.settlementAccount,
                              accountName: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20 focus:border-purple-500 focus:outline-none transition-colors text-sm"
                        placeholder="Business Account Name"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200 rounded-b-xl">
                <button
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
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
