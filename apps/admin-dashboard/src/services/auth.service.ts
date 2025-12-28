import api from './api';
import { LoginCredentials, AuthResponse } from './types';

/**
 * Admin login
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post('/auth/admin/login', credentials);

  // Store token and admin data
  if (response.data.success) {
    localStorage.setItem('admin_token', response.data.data.access_token);
    localStorage.setItem('admin_data', JSON.stringify(response.data.data.user));
  }

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
