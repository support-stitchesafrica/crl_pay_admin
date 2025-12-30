import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, AlertCircle, CheckCircle, ArrowRight, Lock } from 'lucide-react';
import { Input, EmailInput, PasswordInput, PhoneInput, Select, Button } from '../components/ui';
import { showToast } from '../utils/toast';
import AuthLayout from '../components/AuthLayout';
import api from '../services/api';

const businessCategories = [
  { value: '', label: 'Select Category' },
  { value: 'Microfinance', label: 'Microfinance' },
  { value: 'Commercial Bank', label: 'Commercial Bank' },
  { value: 'Investment Fund', label: 'Investment Fund' },
  { value: 'Venture Capital', label: 'Venture Capital' },
  { value: 'Private Equity', label: 'Private Equity' },
  { value: 'Credit Union', label: 'Credit Union' },
  { value: 'Other Financial Institution', label: 'Other Financial Institution' },
];

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    businessAddress: '',
    businessCategory: '',
    registrationNumber: '',
    taxId: '',
    settlementAccount: {
      bankName: '',
      accountNumber: '',
      accountName: '',
    },
  });

  // Countdown timer for auto-redirect
  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      navigate('/login');
    }
  }, [success, countdown, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSettlementAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      settlementAccount: {
        ...formData.settlementAccount,
        [e.target.name]: e.target.value,
      },
    });
  };

  const validateForm = () => {
    if (!formData.companyName.trim()) {
      setError('Company name is required');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }

    if (!formData.businessAddress.trim()) {
      setError('Business address is required');
      return false;
    }

    if (!formData.businessCategory) {
      setError('Business category is required');
      return false;
    }

    if (!formData.registrationNumber.trim()) {
      setError('Registration number is required');
      return false;
    }

    if (!formData.taxId.trim()) {
      setError('Tax ID is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        companyName: formData.companyName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        businessAddress: formData.businessAddress,
        businessCategory: formData.businessCategory,
        registrationNumber: formData.registrationNumber,
        taxId: formData.taxId,
      };

      // Only include settlement account if at least one field is filled
      const hasSettlementData = formData.settlementAccount.bankName ||
                                 formData.settlementAccount.accountNumber ||
                                 formData.settlementAccount.accountName;
      if (hasSettlementData) {
        payload.settlementAccount = formData.settlementAccount;
      }

      await api.post('/financiers/register', payload);

      setSuccess(true);
      showToast.success('Registration successful! Please wait for admin approval.');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Registration Successful!</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Your financier account has been created successfully. Our admin team will review your application
            and notify you via email once approved.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              Redirecting to login in <span className="font-bold">{countdown}</span> seconds...
            </p>
          </div>
          <Button onClick={() => navigate('/login')} fullWidth>
            Go to Login Now
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {/* Logo and Header */}
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-xl mb-6">
          <Store className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Financier Account</h1>
        <p className="text-gray-600">
          Join our platform and start funding merchant loans
        </p>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Company Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Company Information
          </h3>

          <Input
            label="Company Name"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="ABC Microfinance Bank"
            required
            disabled={loading}
          />

          <EmailInput
            label="Company Email Address"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="finance@company.com"
            required
            disabled={loading}
          />

          <PhoneInput
            label="Company Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="800 000 0000"
            required
            disabled={loading}
          />

          <Input
            label="Business Address"
            name="businessAddress"
            value={formData.businessAddress}
            onChange={handleChange}
            placeholder="123 Finance Street, Lagos"
            required
            disabled={loading}
          />

          <Select
            label="Business Category"
            name="businessCategory"
            value={formData.businessCategory}
            onChange={handleChange}
            options={businessCategories}
            required
            disabled={loading}
          />
        </div>

        {/* Registration Details */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Registration Details
          </h3>

          <Input
            label="Registration Number (CAC/RC)"
            name="registrationNumber"
            value={formData.registrationNumber}
            onChange={handleChange}
            placeholder="RC123456"
            required
            disabled={loading}
            helperText="Corporate Affairs Commission registration number"
          />

          <Input
            label="Tax ID (TIN)"
            name="taxId"
            value={formData.taxId}
            onChange={handleChange}
            placeholder="TAX123456"
            required
            disabled={loading}
            helperText="Tax Identification Number"
          />
        </div>

        {/* Settlement Account (Optional) */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Settlement Account (Optional)
            </h3>
            <p className="text-xs text-gray-500 mt-1">You can configure this later in settings</p>
          </div>

          <Input
            label="Bank Name"
            name="bankName"
            value={formData.settlementAccount.bankName}
            onChange={handleSettlementAccountChange}
            placeholder="First Bank of Nigeria"
            disabled={loading}
          />

          <Input
            label="Account Number"
            name="accountNumber"
            value={formData.settlementAccount.accountNumber}
            onChange={handleSettlementAccountChange}
            placeholder="0123456789"
            disabled={loading}
          />

          <Input
            label="Account Name"
            name="accountName"
            value={formData.settlementAccount.accountName}
            onChange={handleSettlementAccountChange}
            placeholder="ABC Microfinance Bank Ltd"
            disabled={loading}
          />
        </div>

        {/* Security */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Security
          </h3>

          <PasswordInput
            label="Password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Minimum 8 characters"
            required
            disabled={loading}
          />

          <PasswordInput
            label="Confirm Password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter your password"
            required
            disabled={loading}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          loading={loading}
          fullWidth
          size="lg"
          className="mt-6"
          icon={!loading && <ArrowRight className="w-5 h-5" />}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      {/* Footer Links */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            Sign In
          </Link>
        </p>
      </div>

      {/* Security Badge */}
      <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-xs">
        <Lock className="w-3 h-3" />
        <span>Bank-grade security & encryption</span>
      </div>
    </AuthLayout>
  );
}
