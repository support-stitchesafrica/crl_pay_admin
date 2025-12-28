import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, AlertCircle, CheckCircle, ArrowRight, Lock, TrendingUp, Zap, CreditCard } from 'lucide-react';
import { Input, EmailInput, PasswordInput, PhoneInput, Select, Button } from '../components/ui';
import * as authService from '../services/auth.service';

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

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    city: '',
    state: '',
  });

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
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);

      const response = await authService.register({
        businessName: formData.businessName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span>Redirecting to login page...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-8">
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
                required
                disabled={loading}
              />
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">Business Location</h3>

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
        </div>
      </div>

      {/* Right Side - Background */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 p-12 items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-white max-w-lg">
          <div className="mb-8">
            <Store className="w-16 h-16 mb-6 opacity-90" />
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Join Thousands of Merchants
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              Transform your business with Buy Now, Pay Later. Increase sales, attract more customers, and grow revenue.
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-4 mt-12">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Increase Sales by 30%</h3>
                <p className="text-gray-300 text-sm">Customers spend more with flexible payment options</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Get Paid Instantly</h3>
                <p className="text-gray-300 text-sm">Receive full payment upfront, no waiting for installments</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Zero Credit Risk</h3>
                <p className="text-gray-300 text-sm">We handle credit checks, approvals, and collections</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
