import { DashboardStats } from './types';
import * as merchantService from './merchant.service';
import * as customerService from './customer.service';

/**
 * Get dashboard statistics
 * Aggregates data from merchant and customer services
 */
export const getStats = async (): Promise<DashboardStats> => {
  const merchantStats = await merchantService.getStats();
  const customerStats = await customerService.getStats();

  return {
    totalMerchants: merchantStats.total,
    activeMerchants: merchantStats.active,
    pendingApprovals: merchantStats.pending,
    totalCustomers: customerStats.total,
    activeLoans: customerStats.withActiveLoans,
    totalLoansValue: 0, // Will come from loan module in Week 4
    defaultRate: 0, // Will come from loan module in Week 4
    collectionRate: 0, // Will come from payment module
  };
};
