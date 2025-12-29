import api from './api';
import { LoginCredentials, RegisterData, AuthResponse } from './types';

/**
 * Merchant login
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post('/auth/merchant/login', credentials);

  // Check if login was successful
  if (!response.data.success) {
    // If API returns success: false, throw an error
    throw new Error(response.data.message || 'Login failed');
  }

  // Store token and merchant data
  localStorage.setItem('merchant_token', response.data.data.access_token);
  localStorage.setItem('merchant_data', JSON.stringify(response.data.data.user));

  return response.data;
};

/**
 * Merchant registration
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await api.post('/merchants/register', data);
  return response.data;
};

/**
 * Merchant logout
 */
export const logout = (): void => {
  localStorage.removeItem('merchant_token');
  localStorage.removeItem('merchant_data');
};

/**
 * Check if merchant is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('merchant_token');
  return !!token && token !== 'undefined' && token !== 'null';
};

/**
 * Get current merchant data
 */
export const getCurrentMerchant = () => {
  const merchantData = localStorage.getItem('merchant_data');
  if (!merchantData || merchantData === 'undefined' || merchantData === 'null') {
    return null;
  }
  try {
    return JSON.parse(merchantData);
  } catch (error) {
    console.error('Error parsing merchant data:', error);
    return null;
  }
};

/**
 * Send OTP for password reset
 */
export const forgotPassword = async (email: string): Promise<any> => {
  const response = await api.post('/auth/merchant/forgot-password', { email });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to send OTP');
  }

  return response.data;
};

/**
 * Verify OTP
 */
export const verifyOTP = async (email: string, otp: string): Promise<any> => {
  const response = await api.post('/auth/merchant/verify-otp', { email, otp });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to verify OTP');
  }

  return response.data;
};

/**
 * Reset password
 */
export const resetPassword = async (email: string, otp: string, newPassword: string): Promise<any> => {
  const response = await api.post('/auth/merchant/reset-password', { email, otp, newPassword });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to reset password');
  }

  return response.data;
};
