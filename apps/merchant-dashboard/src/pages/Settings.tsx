import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Building2, Phone as PhoneIcon, MapPin, Mail, AlertCircle, Loader2, CheckCircle, Globe, Edit2, X, CreditCard, Key, Copy, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Input, PhoneInput } from '../components/ui';

interface SettlementAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankCode?: string;
}

interface MerchantProfile {
  merchantId: string;
  businessName: string;
  email: string;
  phone: string;
  businessAddress: string;
  businessCategory: string;
  websiteUrl?: string;
  cacNumber?: string;
  status: string;
  settlementAccount?: SettlementAccount;
  apiKey?: string;
  apiSecret?: string;
}

export default function Settings() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);

  const [formData, setFormData] = useState({
    phone: '',
    businessAddress: '',
    websiteUrl: '',
    businessCategory: '',
    cacNumber: '',
    settlementAccount: {
      bankName: '',
      accountNumber: '',
      accountName: '',
      bankCode: '',
    },
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/merchants/me');

      const data = response.data.data || response.data;
      setProfile(data);
      setFormData({
        phone: data.phone || '',
        businessAddress: data.businessAddress || '',
        websiteUrl: data.websiteUrl || '',
        businessCategory: data.businessCategory || '',
        cacNumber: data.cacNumber || '',
        settlementAccount: {
          bankName: data.settlementAccount?.bankName || '',
          accountNumber: data.settlementAccount?.accountNumber || '',
          accountName: data.settlementAccount?.accountName || '',
          bankCode: data.settlementAccount?.bankCode || '',
        },
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load profile';
      setError(errorMsg);
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    // Reset form data to current profile values
    setFormData({
      phone: profile?.phone || '',
      businessAddress: profile?.businessAddress || '',
      websiteUrl: profile?.websiteUrl || '',
      businessCategory: profile?.businessCategory || '',
      cacNumber: profile?.cacNumber || '',
      settlementAccount: {
        bankName: profile?.settlementAccount?.bankName || '',
        accountNumber: profile?.settlementAccount?.accountNumber || '',
        accountName: profile?.settlementAccount?.accountName || '',
        bankCode: profile?.settlementAccount?.bankCode || '',
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

      // Build payload with only non-empty values
      const payload: any = {};

      if (formData.phone) payload.phone = formData.phone;
      if (formData.businessAddress) payload.businessAddress = formData.businessAddress;
      if (formData.websiteUrl) payload.websiteUrl = formData.websiteUrl;
      if (formData.businessCategory) payload.businessCategory = formData.businessCategory;
      if (formData.cacNumber) payload.cacNumber = formData.cacNumber;

      // Only include settlement account if at least one field is filled
      if (
        formData.settlementAccount.bankName ||
        formData.settlementAccount.accountNumber ||
        formData.settlementAccount.accountName ||
        formData.settlementAccount.bankCode
      ) {
        payload.settlementAccount = {};
        if (formData.settlementAccount.bankName)
          payload.settlementAccount.bankName = formData.settlementAccount.bankName;
        if (formData.settlementAccount.accountNumber)
          payload.settlementAccount.accountNumber = formData.settlementAccount.accountNumber;
        if (formData.settlementAccount.accountName)
          payload.settlementAccount.accountName = formData.settlementAccount.accountName;
        if (formData.settlementAccount.bankCode)
          payload.settlementAccount.bankCode = formData.settlementAccount.bankCode;
      }

      await api.patch('/merchants/me', payload);

      toast.success('Profile updated successfully!');
      setShowEditModal(false);
      loadProfile();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update profile';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
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
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">Business Name</label>
                <p className="text-gray-900 mt-1">{profile?.businessName}</p>
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
              <PhoneIcon className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <p className="text-gray-900 mt-1">{profile?.phone || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">Website URL</label>
                <p className="text-gray-900 mt-1">{profile?.websiteUrl || 'Not provided'}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Business Category</label>
              <p className="text-gray-900 mt-1">{profile?.businessCategory}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">CAC Number</label>
              <p className="text-gray-900 mt-1">{profile?.cacNumber || 'Not provided'}</p>
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

        {/* Settlement Account */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">Settlement Account</h3>
              <p className="text-sm text-gray-600 mt-1">
                When a loan is disbursed, funds will be sent to this account for merchant purchases.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Bank Name</label>
              <p className="text-gray-900 mt-1">{profile?.settlementAccount?.bankName || 'Not configured'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Account Number</label>
              <p className="text-gray-900 mt-1">{profile?.settlementAccount?.accountNumber || 'Not configured'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Account Name</label>
              <p className="text-gray-900 mt-1">{profile?.settlementAccount?.accountName || 'Not configured'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Bank Code</label>
              <p className="text-gray-900 mt-1">{profile?.settlementAccount?.bankCode || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* API Credentials */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-3 mb-4">
            <Key className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">API Credentials</h3>
              <p className="text-sm text-gray-600 mt-1">
                Use these credentials to integrate our BNPL service into your application.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Public Key */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Public Key</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm text-gray-900 flex items-center justify-between">
                  <span className="truncate">
                    {showApiKey ? profile?.apiKey || 'Not generated' : '••••••••••••••••••••••••••••••••'}
                  </span>
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                    title={showApiKey ? 'Hide' : 'Show'}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (profile?.apiKey) {
                      navigator.clipboard.writeText(profile.apiKey);
                      toast.success('Public key copied to clipboard!');
                    }
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Secret Key */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Secret Key</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm text-gray-900 flex items-center justify-between">
                  <span className="truncate">
                    {showApiSecret ? profile?.apiSecret || 'Not generated' : '••••••••••••••••••••••••••••••••'}
                  </span>
                  <button
                    onClick={() => setShowApiSecret(!showApiSecret)}
                    className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                    title={showApiSecret ? 'Hide' : 'Show'}
                  >
                    {showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (profile?.apiSecret) {
                      navigator.clipboard.writeText(profile.apiSecret);
                      toast.success('Secret key copied to clipboard!');
                    }
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-2 text-xs text-amber-600 flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>Keep your secret key secure. Never share it publicly or commit it to version control.</span>
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
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Edit2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Edit Profile</h3>
                    <p className="text-green-100 text-sm">Update your business information</p>
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
                  <PhoneIcon className="w-5 h-5 text-gray-600" />
                  Contact Information
                </h4>
                <div className="space-y-4">
                  <PhoneInput
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="800 000 0000"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Business Address
                    </label>
                    <textarea
                      value={formData.businessAddress}
                      onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:border-blue-500 focus:outline-none transition-colors text-sm"
                      rows={3}
                      placeholder="Enter your business address"
                    />
                  </div>

                  <Input
                    label="Website URL (Optional)"
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="https://example.com"
                    icon={<Globe className="w-4 h-4" />}
                  />
                </div>
              </div>

              {/* Business Information - Only show if not already provided */}
              {(!profile?.businessCategory || !profile?.cacNumber) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-gray-600" />
                    Business Information
                  </h4>
                  <div className="space-y-4">
                    {!profile?.businessCategory && (
                      <Input
                        label="Business Category"
                        type="text"
                        value={formData.businessCategory}
                        onChange={(e) => setFormData({ ...formData, businessCategory: e.target.value })}
                        placeholder="e.g., Electronics, Fashion, etc."
                      />
                    )}

                    {!profile?.cacNumber && (
                      <Input
                        label="CAC Number (Optional)"
                        type="text"
                        value={formData.cacNumber}
                        onChange={(e) => setFormData({ ...formData, cacNumber: e.target.value })}
                        placeholder="e.g., RC123456"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Settlement Account */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                  Settlement Account
                </h4>
                <div className="space-y-4">
                  <Input
                    label="Bank Name"
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
                    placeholder="e.g., First Bank of Nigeria"
                  />

                  <Input
                    label="Account Number"
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
                    placeholder="1234567890"
                  />

                  <Input
                    label="Account Name"
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
                    placeholder="Business Account Name"
                  />

                  <Input
                    label="Bank Code (Optional)"
                    type="text"
                    value={formData.settlementAccount.bankCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        settlementAccount: {
                          ...formData.settlementAccount,
                          bankCode: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g., 011"
                  />
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
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
