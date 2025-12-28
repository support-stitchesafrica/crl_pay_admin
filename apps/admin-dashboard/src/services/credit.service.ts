import api from './api';
import { CreditAssessment, CreditStats } from './types';

/**
 * Credit assessment request payload
 */
export interface CreditAssessmentRequest {
  customerId: string;
  merchantId: string;
  requestedAmount: number;
  requestedTenure: number;
  purpose?: string;
  deviceFingerprint?: string;
  ipAddress?: string;
}

/**
 * Perform credit assessment for a customer
 */
export const assessCredit = async (data: CreditAssessmentRequest): Promise<CreditAssessment> => {
  const response = await api.post('/credit/assess', data);
  return response.data.data;
};

/**
 * Get credit assessment by ID
 */
export const getById = async (assessmentId: string): Promise<CreditAssessment> => {
  const response = await api.get(`/credit/${assessmentId}`);
  return response.data.data;
};

/**
 * Get credit assessments by customer
 */
export const getByCustomer = async (customerId: string): Promise<CreditAssessment[]> => {
  const response = await api.get(`/credit/customer/${customerId}`);
  return response.data.data;
};

/**
 * Get credit assessments by merchant
 */
export const getByMerchant = async (merchantId: string): Promise<CreditAssessment[]> => {
  const response = await api.get(`/credit/merchant/${merchantId}`);
  return response.data.data;
};

/**
 * Get credit statistics
 */
export const getStats = async (): Promise<CreditStats> => {
  const response = await api.get('/credit/stats/overview');
  return response.data.data;
};
