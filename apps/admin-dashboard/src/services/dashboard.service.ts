import { DashboardStats } from './types';
import * as merchantService from './merchant.service';
import * as customerService from './customer.service';
import api from './api';

/**
 * Get dashboard statistics
 * Aggregates data from merchant and customer services
 */
export const getStats = async (): Promise<DashboardStats> => {
  const merchantStats = await merchantService.getStats();
  const customerStats = await customerService.getStats();
  
  // Fetch loan stats from backend
  let loanStats = { activeLoans: 0, totalLoans: 0, totalValue: 0 };
  try {
    const loanResponse = await api.get('/loans/stats');
    loanStats = loanResponse.data.data;
  } catch (error) {
    console.error('Error fetching loan stats:', error);
  }

  return {
    totalMerchants: merchantStats.total,
    activeMerchants: merchantStats.active,
    pendingApprovals: merchantStats.pending,
    totalCustomers: customerStats.total,
    activeLoans: loanStats.activeLoans,
    totalLoansValue: loanStats.totalValue,
    defaultRate: 0, // Will come from loan module in Week 4
    collectionRate: 0, // Will come from payment module
  };
};
