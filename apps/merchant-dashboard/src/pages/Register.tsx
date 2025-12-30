import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, AlertCircle, CheckCircle, ArrowRight, Lock } from 'lucide-react';
import { Input, EmailInput, PasswordInput, PhoneInput, Select, Button } from '../components/ui';
import * as authService from '../services/auth.service';
import { showToast } from '../utils/toast';
import AuthLayout from '../components/AuthLayout';

const countries = [
  { value: 'Nigeria', label: 'Nigeria' },
  { value: 'Ghana', label: 'Ghana' },
  { value: 'Kenya', label: 'Kenya' },
  { value: 'South Africa', label: 'South Africa' },
];

const nigerianStates = [
  { value: '', label: 'Select State' },
  { value: 'Abia', label: 'Abia' },
  { value: 'Adamawa', label: 'Adamawa' },
  { value: 'Akwa Ibom', label: 'Akwa Ibom' },
  { value: 'Anambra', label: 'Anambra' },
  { value: 'Bauchi', label: 'Bauchi' },
  { value: 'Bayelsa', label: 'Bayelsa' },
  { value: 'Benue', label: 'Benue' },
  { value: 'Borno', label: 'Borno' },
  { value: 'Cross River', label: 'Cross River' },
  { value: 'Delta', label: 'Delta' },
  { value: 'Ebonyi', label: 'Ebonyi' },
  { value: 'Edo', label: 'Edo' },
  { value: 'Ekiti', label: 'Ekiti' },
  { value: 'Enugu', label: 'Enugu' },
  { value: 'FCT', label: 'FCT' },
  { value: 'Gombe', label: 'Gombe' },
  { value: 'Imo', label: 'Imo' },
  { value: 'Jigawa', label: 'Jigawa' },
  { value: 'Kaduna', label: 'Kaduna' },
  { value: 'Kano', label: 'Kano' },
  { value: 'Katsina', label: 'Katsina' },
  { value: 'Kebbi', label: 'Kebbi' },
  { value: 'Kogi', label: 'Kogi' },
  { value: 'Kwara', label: 'Kwara' },
  { value: 'Lagos', label: 'Lagos' },
  { value: 'Nasarawa', label: 'Nasarawa' },
  { value: 'Niger', label: 'Niger' },
  { value: 'Ogun', label: 'Ogun' },
  { value: 'Ondo', label: 'Ondo' },
  { value: 'Osun', label: 'Osun' },
  { value: 'Oyo', label: 'Oyo' },
  { value: 'Plateau', label: 'Plateau' },
  { value: 'Rivers', label: 'Rivers' },
  { value: 'Sokoto', label: 'Sokoto' },
  { value: 'Taraba', label: 'Taraba' },
  { value: 'Yobe', label: 'Yobe' },
  { value: 'Zamfara', label: 'Zamfara' },
];

const businessCategories = [
  { value: '', label: 'Select Category' },
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Fashion & Clothing', label: 'Fashion & Clothing' },
  { value: 'Home & Furniture', label: 'Home & Furniture' },
  { value: 'Health & Beauty', label: 'Health & Beauty' },
  { value: 'Groceries & Food', label: 'Groceries & Food' },
  { value: 'Sports & Fitness', label: 'Sports & Fitness' },
  { value: 'Automotive', label: 'Automotive' },
  { value: 'Education', label: 'Education' },
  { value: 'Other', label: 'Other' },
];

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    businessCategory: '',
    cacNumber: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
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
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      const errorMsg = 'Passwords do not match';
      setError(errorMsg);
      showToast.error(errorMsg);
      return;
    }

    if (formData.password.length < 6) {
      const errorMsg = 'Password must be at least 6 characters';
      setError(errorMsg);
      showToast.error(errorMsg);
      return;
    }

    try {
      setLoading(true);

      const registrationData: any = {
        businessName: formData.businessName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        businessCategory: formData.businessCategory,
      };

      // Add optional fields if provided
      if (formData.cacNumber) {
        registrationData.cacNumber = formData.cacNumber;
      }

      if (formData.bankName || formData.accountNumber || formData.accountName) {
        registrationData.settlementAccount = {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountName: formData.accountName,
        };
      }

      const response = await authService.register(registrationData);

      if (response.success) {
        setSuccess(true);
        showToast.success('Registration successful! Your application is pending approval.');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Registration Successful!</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Your application is pending approval. You will be notified via email once your account is activated.
            </p>

            {/* Manual Login Button */}
            <Button
              onClick={() => navigate('/login')}
              fullWidth
              size="lg"
              className="mb-4"
              icon={<ArrowRight className="w-5 h-5" />}
            >
              Go to Login
            </Button>

            {/* Auto-redirect countdown */}
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span>Auto-redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout>
      {/* Logo and Header */}
      <div className="mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-6">
          <Store className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create Merchant Account
        </h1>
        <p className="text-gray-600">
          Start accepting BNPL payments in minutes
        </p>
      </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Business Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">Business Information</h3>

              <Input
                label="Business Name"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Enter your business name"
                required
                disabled={loading}
              />

              <EmailInput
                label="Email Address"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="business@example.com"
                required
                disabled={loading}
              />

              <PhoneInput
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+234 801 234 5678"
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

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">Business Location</h3>

              <Select
                label="Country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                options={countries}
                required
                disabled={loading}
              />

              <Input
                label="Business Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Business Street"
                required
                disabled={loading}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Lagos"
                  required
                  disabled={loading}
                />

                <Select
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  options={nigerianStates}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Settlement Account */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">Settlement Account (Optional)</h3>

              <Input
                label="CAC Number"
                name="cacNumber"
                value={formData.cacNumber}
                onChange={handleChange}
                placeholder="RC1234567"
                disabled={loading}
              />

              <Input
                label="Bank Name"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                placeholder="e.g., Access Bank"
                disabled={loading}
              />

              <Input
                label="Account Number"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                placeholder="0123456789"
                disabled={loading}
                maxLength={10}
              />

              <Input
                label="Account Name"
                name="accountName"
                value={formData.accountName}
                onChange={handleChange}
                placeholder="Business Account Name"
                disabled={loading}
              />
            </div>

            {/* Security */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">Security</h3>

              <PasswordInput
                label="Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                required
                disabled={loading}
                helperText="Use a strong password with letters and numbers"
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
              {loading ? 'Creating Account...' : 'Create Merchant Account'}
            </Button>
          </form>

          {/* Login Link */}
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
            <span>Your information is secure and encrypted</span>
          </div>

      {/* Terms */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          By registering, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </AuthLayout>
  );
}
