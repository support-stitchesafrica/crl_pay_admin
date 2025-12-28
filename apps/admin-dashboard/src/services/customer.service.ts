import api from './api';
import { Customer, CustomerStats } from './types';

/**
 * Get all customers
 */
export const getAll = async (): Promise<Customer[]> => {
  const response = await api.get('/customers');
  return response.data.data;
};

/**
 * Get customer by ID
 */
export const getById = async (customerId: string): Promise<Customer> => {
  const response = await api.get(`/customers/${customerId}`);
  return response.data.data;
};

/**
 * Get customer statistics
 */
export const getStats = async (): Promise<CustomerStats> => {
  const response = await api.get('/customers/stats');
  return response.data.data;
};

/**
 * Get customers by merchant
 */
export const getByMerchant = async (merchantId: string): Promise<Customer[]> => {
  const response = await api.get(`/customers/merchant/${merchantId}`);
  return response.data.data;
};

/**
 * Update customer information
 */
export const update = async (customerId: string, data: Partial<Customer>): Promise<Customer> => {
  const response = await api.patch(`/customers/${customerId}`, data);
  return response.data.data;
};

/**
 * Blacklist customer with reason
 */
export const blacklist = async (customerId: string, reason: string): Promise<Customer> => {
  const response = await api.patch(`/customers/${customerId}/blacklist`, { reason });
  return response.data.data;
};

/**
 * Delete customer
 */
export const deleteCustomer = async (customerId: string): Promise<void> => {
  await api.delete(`/customers/${customerId}`);
};
