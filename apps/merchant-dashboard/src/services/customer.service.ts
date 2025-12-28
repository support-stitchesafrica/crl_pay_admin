import api from './api';
import { Customer } from './types';

/**
 * Get customers registered via this merchant
 */
export const getByMerchant = async (merchantId: string): Promise<Customer[]> => {
  const response = await api.get(`/customers/merchant/${merchantId}`);
  return response.data.data;
};

/**
 * Get customer by ID
 */
export const getById = async (customerId: string): Promise<Customer> => {
  const response = await api.get(`/customers/${customerId}`);
  return response.data.data;
};
