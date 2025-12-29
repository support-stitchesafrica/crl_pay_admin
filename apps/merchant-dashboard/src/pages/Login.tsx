import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Store, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { EmailInput, PasswordInput, Button } from '../components/ui';
import { showToast } from '../utils/toast';
import AuthLayout from '../components/AuthLayout';

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
      showToast.success('Login successful! Welcome back.');
      navigate('/');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Invalid email or password';
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
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

        {/* Forgot Password Link */}
        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Forgot Password?
          </Link>
        </div>

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
    </AuthLayout>
  );
}
