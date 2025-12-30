import api from './api';
import { Loan, LoanStats, CreateLoanData } from './types/loan.types';

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
 * Get all loans for authenticated merchant (uses JWT token)
 */
export const getLoans = async (filters?: {
  customerId?: string;
  status?: string;
  limit?: number;
}): Promise<Loan[]> => {
  const params = new URLSearchParams();

  if (filters?.customerId) params.append('customerId', filters.customerId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const queryString = params.toString();
  const url = queryString ? `/loans/me?${queryString}` : '/loans/me';

  const response = await api.get<LoansResponse>(url);

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
 * Create a new loan
 */
export const createLoan = async (
  loanData: CreateLoanData,
  merchantInterestRate: number = 15
): Promise<Loan> => {
  const response = await api.post<LoanResponse>(
    `/loans?merchantInterestRate=${merchantInterestRate}`,
    loanData
  );

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to create loan');
  }

  return response.data.data;
};

/**
 * Get loan statistics for authenticated merchant (uses JWT token)
 */
export const getMerchantLoanStats = async (): Promise<LoanStats> => {
  const response = await api.get<LoanStatsResponse>('/loans/me/stats');

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch statistics');
  }

  return response.data.data;
};

/**
 * Cancel a pending loan
 */
export const cancelLoan = async (loanId: string): Promise<Loan> => {
  const response = await api.post<LoanResponse>(`/loans/${loanId}/cancel`);

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to cancel loan');
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
