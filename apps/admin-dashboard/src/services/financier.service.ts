import api from './api';
import { Financier, FinancierStats, FinancingPlan, PlanMerchantMapping } from './types';

/**
 * Get all financiers
 */
export const getAll = async (status?: string): Promise<Financier[]> => {
  const url = status ? `/financiers/all?status=${status}` : '/financiers/all';
  const response = await api.get(url);
  return response.data;
};

/**
 * Get financier by ID
 */
export const getById = async (financierId: string): Promise<Financier> => {
  const response = await api.get(`/financiers/${financierId}`);
  return response.data;
};

/**
 * Get pending financiers
 */
export const getPending = async (): Promise<Financier[]> => {
  const response = await api.get('/financiers/all?status=pending');
  return response.data;
};

/**
 * Approve financier
 */
export const approve = async (financierId: string): Promise<{ message: string }> => {
  const response = await api.put(`/financiers/${financierId}/approve`);
  return response.data;
};

/**
 * Reject financier with reason
 */
export const reject = async (financierId: string, reason: string): Promise<{ message: string }> => {
  const response = await api.put(`/financiers/${financierId}/reject`, { reason });
  return response.data;
};

/**
 * Suspend financier with reason
 */
export const suspend = async (financierId: string, reason: string): Promise<{ message: string }> => {
  const response = await api.put(`/financiers/${financierId}/suspend`, { reason });
  return response.data;
};

/**
 * Approve fund allocation
 */
export const approveFunds = async (
  financierId: string,
  amount: number
): Promise<{ message: string; newBalance: number }> => {
  const response = await api.put(`/financiers/${financierId}/funds/approve`, { amount });
  return response.data;
};

/**
 * Get all financing plans
 */
export const getPlans = async (financierId?: string): Promise<FinancingPlan[]> => {
  const url = financierId ? `/financiers/${financierId}/plans` : '/financing-plans';
  const response = await api.get(url);
  return response.data.data || response.data;
};

/**
 * Get plan by ID
 */
export const getPlanById = async (planId: string): Promise<FinancingPlan> => {
  const response = await api.get(`/financing-plans/${planId}`);
  return response.data.data || response.data;
};

/**
 * Get plan-merchant mappings
 */
export const getMappings = async (filters?: {
  planId?: string;
  merchantId?: string;
  financierId?: string;
}): Promise<PlanMerchantMapping[]> => {
  const params = new URLSearchParams();
  if (filters?.planId) params.append('planId', filters.planId);
  if (filters?.merchantId) params.append('merchantId', filters.merchantId);
  if (filters?.financierId) params.append('financierId', filters.financierId);

  const url = `/plan-merchant-mappings${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await api.get(url);
  return response.data.data || response.data;
};

/**
 * Create plan-merchant mapping
 */
export const createMapping = async (data: {
  planId: string;
  merchantId: string;
  fundsAllocated: number;
  expirationDate: string;
}): Promise<{ message: string; mapping: PlanMerchantMapping }> => {
  const response = await api.post('/plan-merchant-mappings', data);
  return response.data;
};

/**
 * Update plan-merchant mapping
 */
export const updateMapping = async (
  mappingId: string,
  data: {
    status?: 'active' | 'inactive' | 'suspended';
  }
): Promise<{ message: string }> => {
  const response = await api.put(`/plan-merchant-mappings/${mappingId}`, data);
  return response.data;
};

/**
 * Delete plan-merchant mapping
 */
export const deleteMapping = async (mappingId: string): Promise<{ message: string }> => {
  const response = await api.delete(`/plan-merchant-mappings/${mappingId}`);
  return response.data;
};

/**
 * Get financier statistics
 */
export const getStats = async (): Promise<FinancierStats> => {
  const response = await api.get('/financiers/stats');
  return response.data;
};
