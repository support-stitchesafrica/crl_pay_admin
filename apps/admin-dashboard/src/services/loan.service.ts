import api from './api';
import { Loan, LoanStats } from './types/loan.types';

export interface LoansResponse {
  success: boolean;
  message: string;
  data: Loan[];
}

export interface LoanResponse {
  success: boolean;
  message: string;
  data: Loan;
}

export interface LoanStatsResponse {
  success: boolean;
  message: string;
  data: LoanStats;
}

/**
 * Get all loans (admin can see all)
 */
export const getLoans = async (filters?: {
  merchantId?: string;
  customerId?: string;
  status?: string;
  limit?: number;
}): Promise<Loan[]> => {
  const params = new URLSearchParams();

  if (filters?.merchantId) params.append('merchantId', filters.merchantId);
  if (filters?.customerId) params.append('customerId', filters.customerId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const response = await api.get<LoansResponse>(`/loans?${params.toString()}`);

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch loans');
  }

  return response.data.data;
};

/**
 * Get a single loan by ID
 */
export const getLoan = async (loanId: string): Promise<Loan> => {
  const response = await api.get<LoanResponse>(`/loans/${loanId}`);

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch loan');
  }

  return response.data.data;
};

/**
 * Get loan statistics for a merchant
 */
export const getMerchantLoanStats = async (merchantId: string): Promise<LoanStats> => {
  const response = await api.get<LoanStatsResponse>(`/loans/merchant/${merchantId}/stats`);

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch statistics');
  }

  return response.data.data;
};

/**
 * Update loan status (admin only)
 */
export const updateLoanStatus = async (
  loanId: string,
  status: string,
  notes?: string
): Promise<Loan> => {
  const response = await api.put<LoanResponse>(`/loans/${loanId}`, { status, notes });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to update loan');
  }

  return response.data.data;
};

/**
 * Update loan notes
 */
export const updateLoanNotes = async (loanId: string, notes: string): Promise<Loan> => {
  const response = await api.put<LoanResponse>(`/loans/${loanId}`, { notes });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to update loan');
  }

  return response.data.data;
};
