import api from './api';
import { Merchant, MerchantStats } from './types';

/**
 * Get all merchants
 */
export const getAll = async (): Promise<Merchant[]> => {
  const response = await api.get('/merchants');
  return response.data.data;
};

/**
 * Get merchant by ID
 */
export const getById = async (merchantId: string): Promise<Merchant> => {
  const response = await api.get(`/merchants/${merchantId}`);
  return response.data.data;
};

/**
 * Get pending merchants
 */
export const getPending = async (): Promise<Merchant[]> => {
  const response = await api.get('/merchants?status=pending');
  return response.data.data;
};

/**
 * Get merchant statistics
 */
export const getStats = async (): Promise<MerchantStats> => {
  const response = await api.get('/merchants/stats');
  return response.data.data;
};

/**
 * Approve merchant
 */
export const approve = async (merchantId: string, notes?: string): Promise<Merchant> => {
  const response = await api.patch(`/merchants/${merchantId}/approve`, {
    status: 'approved',
    notes,
  });
  return response.data.data;
};

/**
 * Reject merchant with reason
 */
export const reject = async (merchantId: string, reason: string): Promise<Merchant> => {
  const response = await api.patch(`/merchants/${merchantId}/approve`, {
    status: 'rejected',
    notes: reason,
  });
  return response.data.data;
};

/**
 * Suspend merchant with reason
 */
export const suspend = async (merchantId: string, reason: string): Promise<Merchant> => {
  const response = await api.patch(`/merchants/${merchantId}/approve`, {
    status: 'suspended',
    notes: reason,
  });
  return response.data.data;
};

/**
 * Activate suspended merchant
 */
export const activate = async (merchantId: string): Promise<Merchant> => {
  const response = await api.patch(`/merchants/${merchantId}/approve`, {
    status: 'approved',
  });
  return response.data.data;
};

/**
 * Delete merchant
 */
export const deleteMerchant = async (merchantId: string): Promise<void> => {
  await api.delete(`/merchants/${merchantId}`);
};
