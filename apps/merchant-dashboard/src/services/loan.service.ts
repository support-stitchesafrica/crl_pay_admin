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
 * Get all loans for a merchant
 */
export const getLoans = async (filters?: {
  customerId?: string;
  status?: string;
  limit?: number;
}): Promise<Loan[]> => {
  const params = new URLSearchParams();

  // Get merchant ID from localStorage
  const merchantData = localStorage.getItem('merchant_data');
  if (merchantData) {
    const merchant = JSON.parse(merchantData);
    params.append('merchantId', merchant.merchantId);
  }

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
 * Get loan statistics for merchant
 */
export const getMerchantLoanStats = async (): Promise<LoanStats> => {
  const merchantData = localStorage.getItem('merchant_data');
  if (!merchantData) {
    throw new Error('Merchant data not found');
  }

  const merchant = JSON.parse(merchantData);
  const response = await api.get<LoanStatsResponse>(
    `/loans/merchant/${merchant.merchantId}/stats`
  );

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
