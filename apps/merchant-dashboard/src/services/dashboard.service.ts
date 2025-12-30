import { MerchantDashboardStats } from './types';
import * as merchantService from './merchant.service';
import * as customerService from './customer.service';

/**
 * Get merchant dashboard statistics
 * Aggregates data from merchant and customer services
 */
export const getStats = async (): Promise<MerchantDashboardStats> => {
  // Get merchant profile and customers using JWT token
  const merchant = await merchantService.getProfile();
  const customers = await customerService.getMyCustomers();

  // Calculate stats from available data
  return {
    totalRevenue: merchant.totalRevenue || 0,
    activeCustomers: customers.filter(c => c.status === 'active').length,
    activeLoans: customers.reduce((sum, c) => sum + c.activeLoans, 0),
    pendingLoans: 0, // Will come from loan module in Week 4
    completedLoans: customers.reduce((sum, c) => sum + c.completedLoans, 0),
    defaultedLoans: 0, // Will come from loan module in Week 4
    collectionRate: 0, // Will come from payment module
    defaultRate: merchant.defaultRate || 0,
  };
};
