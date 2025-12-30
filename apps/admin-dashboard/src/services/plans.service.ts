import api from './api';
import { FinancingPlan } from './types';

export const getAllPlans = async (): Promise<FinancingPlan[]> => {
  const response = await api.get('/financing-plans');
  return response.data.data || response.data;
};

export const approvePlan = async (planId: string, fundsAllocated: number) => {
  const response = await api.post(`/admin/financing-plans/${planId}/approve`, {
    fundsAllocated,
  });
  return response.data;
};

export const allocateFunds = async (
  planId: string,
  additionalFunds: number,
) => {
  const response = await api.post(`/admin/financing-plans/${planId}/allocate-funds`, {
    additionalFunds,
  });
  return response.data;
};

export const updatePlanStatus = async (
  planId: string,
  isActive: boolean,
) => {
  const response = await api.put(`/admin/financing-plans/${planId}/status`, {
    isActive,
  });
  return response.data;
};
