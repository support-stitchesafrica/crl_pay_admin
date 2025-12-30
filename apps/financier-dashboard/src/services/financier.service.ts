import api from './api';
import { Financier, FinancierAnalytics, Loan } from './types';

/**
 * Get financier profile
 */
export const getProfile = async (): Promise<Financier> => {
  const response = await api.get('/financiers/me');
  return response.data;
};

/**
 * Update financier profile
 */
export const updateProfile = async (data: Partial<Financier>): Promise<{ message: string }> => {
  const response = await api.put('/financiers/me', data);
  return response.data;
};

/**
 * Get all loans using financier's plans
 */
export const getLoans = async (): Promise<Loan[]> => {
  const response = await api.get('/financiers/me/loans');
  return response.data;
};

/**
 * Get financier analytics
 */
export const getAnalytics = async (): Promise<FinancierAnalytics> => {
  const response = await api.get('/financiers/me/analytics');
  return response.data;
};
