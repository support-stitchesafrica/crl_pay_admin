import api from './api';
import { LoginCredentials, AuthResponse } from './types';

/**
 * Admin login
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post('/auth/admin/login', credentials);

  // Check if login was successful
  if (!response.data.success) {
    // If API returns success: false, throw an error
    throw new Error(response.data.message || 'Login failed');
  }

  // Store token and admin data
  localStorage.setItem('admin_token', response.data.data.access_token);
  localStorage.setItem('admin_data', JSON.stringify(response.data.data.user));

  return response.data;
};

/**
 * Admin logout
 */
export const logout = (): void => {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_data');
};

/**
 * Check if admin is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('admin_token');
  return !!token && token !== 'undefined' && token !== 'null';
};

/**
 * Get current admin data
 */
export const getCurrentAdmin = () => {
  const adminData = localStorage.getItem('admin_data');
  if (!adminData || adminData === 'undefined' || adminData === 'null') {
    return null;
  }
  try {
    return JSON.parse(adminData);
  } catch (error) {
    console.error('Error parsing admin data:', error);
    return null;
  }
};

/**
 * Send OTP for password reset
 */
export const forgotPassword = async (email: string): Promise<any> => {
  const response = await api.post('/auth/admin/forgot-password', { email });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to send OTP');
  }

  return response.data;
};

/**
 * Verify OTP
 */
export const verifyOTP = async (email: string, otp: string): Promise<any> => {
  const response = await api.post('/auth/admin/verify-otp', { email, otp });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to verify OTP');
  }

  return response.data;
};

/**
 * Reset password
 */
export const resetPassword = async (email: string, otp: string, newPassword: string): Promise<any> => {
  const response = await api.post('/auth/admin/reset-password', { email, otp, newPassword });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to reset password');
  }

  return response.data;
};
