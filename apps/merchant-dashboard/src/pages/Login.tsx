import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Store, AlertCircle, ArrowRight, Lock, TrendingUp, Zap, CreditCard } from 'lucide-react';
import { EmailInput, PasswordInput, Button } from '../components/ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo and Header */}
          <div className="mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-6">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Merchant Login
            </h1>
            <p className="text-gray-600">
              Access your business dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Email Input */}
            <EmailInput
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="merchant@business.com"
              required
              disabled={isLoading}
            />

            {/* Password Input */}
            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              loading={isLoading}
              fullWidth
              size="lg"
              className="mt-6"
              icon={!isLoading && <ArrowRight className="w-5 h-5" />}
            >
              {isLoading ? 'Signing In...' : 'Sign In to Dashboard'}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              New to CRL Pay?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                Create Account
              </Link>
            </p>
          </div>

          {/* Security Badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-xs">
            <Lock className="w-3 h-3" />
            <span>Bank-grade security & encryption</span>
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
              Grow Your Business with BNPL
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              Accept Buy Now, Pay Later payments and increase your sales. Let your customers shop now and pay in installments.
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-4 mt-12">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Increase Sales</h3>
                <p className="text-gray-300 text-sm">Boost revenue by up to 30% with flexible payment options</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Instant Settlements</h3>
                <p className="text-gray-300 text-sm">Get paid upfront while customers pay over time</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">No Risk for You</h3>
                <p className="text-gray-300 text-sm">We handle all credit risk and collections</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
