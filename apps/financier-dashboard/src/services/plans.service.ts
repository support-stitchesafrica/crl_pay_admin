import api from './api';
import { FinancingPlan, CreatePlanData, UpdatePlanData } from './types';

/**
 * Get all plans for logged-in financier
 */
export const getPlans = async (): Promise<FinancingPlan[]> => {
  const response = await api.get('/financiers/me/plans');
  return response.data.data || response.data;
};

/**
 * Get plan by ID
 */
export const getPlanById = async (planId: string): Promise<FinancingPlan> => {
  const response = await api.get(`/financiers/me/plans/${planId}`);
  return response.data.data || response.data;
};

/**
 * Create new financing plan
 */
export const createPlan = async (data: CreatePlanData): Promise<{ message: string; plan: FinancingPlan }> => {
  const response = await api.post('/financiers/me/plans', data);
  return response.data;
};

/**
 * Update financing plan
 */
export const updatePlan = async (planId: string, data: UpdatePlanData): Promise<{ message: string }> => {
  const response = await api.put(`/financiers/me/plans/${planId}`, data);
  return response.data;
};

/**
 * Deactivate financing plan
 */
export const deactivatePlan = async (planId: string): Promise<{ message: string }> => {
  const response = await api.delete(`/financiers/me/plans/${planId}`);
  return response.data;
};
