import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowRight, ArrowLeft, Lock, Mail, CheckCircle } from 'lucide-react';
import { EmailInput, OTPInput, PasswordInput, Button } from '../components/ui';
import { showToast } from '../utils/toast';
import * as authService from '../services/auth.service';
import AuthLayout from '../components/AuthLayout';

type Step = 'email' | 'otp' | 'reset';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      showToast.success('OTP sent to your email address');
      setCurrentStep('otp');
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      showToast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      await authService.verifyOTP(email, otp);
      showToast.success('OTP verified successfully');
      setCurrentStep('reset');
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      showToast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(email, otp, newPassword);
      showToast.success('Password reset successfully! You can now login.');
      navigate('/login');
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Logo and Header */}
      <div className="mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-6">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {currentStep === 'email' && 'Admin Password Reset'}
          {currentStep === 'otp' && 'Verify OTP'}
          {currentStep === 'reset' && 'Create New Password'}
        </h1>
        <p className="text-gray-600">
          {currentStep === 'email' && "Enter your admin email to receive an OTP"}
          {currentStep === 'otp' && 'Enter the 6-digit code sent to your email'}
          {currentStep === 'reset' && 'Create a new password for your admin account'}
        </p>
      </div>

          {/* Step 1: Email */}
          {currentStep === 'email' && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <EmailInput
                label="Admin Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@crlpay.com"
                required
                disabled={loading}
              />

              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="lg"
                icon={!loading && <Mail className="w-5 h-5" />}
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {currentStep === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP
                </label>
                <OTPInput
                  length={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Code sent to {email}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setCurrentStep('email')}
                  variant="secondary"
                  fullWidth
                  disabled={loading}
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  fullWidth
                  size="lg"
                  icon={!loading && <CheckCircle className="w-5 h-5" />}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Button>
              </div>

              <button
                type="button"
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                Resend OTP
              </button>
            </form>
          )}

          {/* Step 3: Reset Password */}
          {currentStep === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <PasswordInput
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                disabled={loading}
                helperText="Use a strong password with letters and numbers"
              />

              <PasswordInput
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                disabled={loading}
              />

              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="lg"
                icon={!loading && <ArrowRight className="w-5 h-5" />}
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </form>
          )}

      {/* Back to Login Link */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <Link
          to="/login"
          className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>

      {/* Security Badge */}
      <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-xs">
        <Lock className="w-3 h-3" />
        <span>Protected with enterprise-grade encryption</span>
      </div>
    </AuthLayout>
  );
}
