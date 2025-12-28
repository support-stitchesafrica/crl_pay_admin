import api from './api';
import { Merchant } from './types';

/**
 * Get own merchant profile
 */
export const getProfile = async (): Promise<Merchant> => {
  const response = await api.get('/merchants/me');
  return response.data.data;
};

/**
 * Update own merchant profile
 */
export const updateProfile = async (data: Partial<Merchant>): Promise<Merchant> => {
  const response = await api.patch('/merchants/me', data);
  return response.data.data;
};
