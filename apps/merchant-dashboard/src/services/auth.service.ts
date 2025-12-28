import api from './api';
import { LoginCredentials, RegisterData, AuthResponse } from './types';

/**
 * Merchant login
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post('/auth/merchant/login', credentials);

  // Store token and merchant data
  if (response.data.success) {
    localStorage.setItem('merchant_token', response.data.data.access_token);
    localStorage.setItem('merchant_data', JSON.stringify(response.data.data.user));
  }

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
