import api from './api';
import { LoginCredentials, AuthResponse } from './types';

/**
 * Financier login
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post('/financiers/login', credentials);

  // Store token and financier data
  localStorage.setItem('financier_token', response.data.access_token);
  localStorage.setItem('financier_data', JSON.stringify(response.data.user));

  return response.data;
};

/**
 * Financier logout
 */
export const logout = (): void => {
  localStorage.removeItem('financier_token');
  localStorage.removeItem('financier_data');
};

/**
 * Check if financier is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('financier_token');
  return !!token && token !== 'undefined' && token !== 'null';
};

/**
 * Get current financier data
 */
export const getCurrentFinancier = () => {
  const financierData = localStorage.getItem('financier_data');
  if (!financierData || financierData === 'undefined' || financierData === 'null') {
    return null;
  }
  try {
    return JSON.parse(financierData);
  } catch (error) {
    console.error('Error parsing financier data:', error);
    return null;
  }
};
