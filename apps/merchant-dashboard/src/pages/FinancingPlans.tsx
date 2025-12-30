import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { CreditCard, AlertCircle, Loader2, TrendingUp, Calendar } from 'lucide-react';
import * as plansService from '../services/plans.service';
import { PlanMerchantMapping, FinancingPlan } from '../services/plans.service';
import * as financiersService from '../services/financiers.service';
import { showToast } from '../utils/toast';

interface EnrichedMapping extends PlanMerchantMapping {
  planDetails?: FinancingPlan;
  financierName?: string;
}

export default function FinancingPlans() {
  const [mappings, setMappings] = useState<EnrichedMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch mappings
      const mappingsData = await plansService.getMappedPlans();

      // Fetch plan details and financiers for each mapping
      const planIds = [...new Set(mappingsData.map((m) => m.planId))];

      const [plans, financiers] = await Promise.all([
        plansService.getMultiplePlanDetails(planIds),
        financiersService.getFinanciers('approved').catch(() => []),
      ]);

      // Enrich mappings with plan and financier details
      const enrichedMappings = mappingsData.map((mapping) => {
        const planDetails = plans.find((p) => p.planId === mapping.planId);
        const financier = financiers.find((f) => f.financierId === mapping.financierId);
        return {
          ...mapping,
          planDetails,
          financierName: financier?.companyName || 'Unknown Financier',
        };
      });

      setMappings(enrichedMappings);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load financing plans';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  const formatTimestamp = (timestamp: string | { _seconds: number; _nanoseconds: number }) => {
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleDateString();
    }
    return new Date(timestamp._seconds * 1000).toLocaleDateString();
  };

  const formatTenor = (tenor: { value: number; period: string }) => {
    const periodName = tenor.period.toLowerCase();
    return `${tenor.value} ${periodName === 'days' ? 'day' : periodName === 'weeks' ? 'week' : periodName === 'months' ? 'month' : 'year'}${tenor.value > 1 ? 's' : ''}`;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      suspended: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getUtilizationPercentage = (current: number, allocated: number) => {
    if (allocated === 0) return 0;
    return Math.round((current / allocated) * 100);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading financing plans...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Plans</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={loadMappings} className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline">
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financing Plans</h1>
          <p className="text-gray-600">View BNPL plans available for your customers</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Available Plans</p>
            <p className="text-2xl font-bold text-gray-900">{mappings.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {mappings.filter((m) => m.status === 'active').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Allocated</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(mappings.reduce((sum, m) => sum + m.fundsAllocated, 0))}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Loans</p>
            <p className="text-2xl font-bold text-purple-600">
              {mappings.reduce((sum, m) => sum + m.totalLoans, 0)}
            </p>
          </div>
        </div>

        {mappings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Financing Plans Yet</h3>
            <p className="text-gray-600 mb-4">
              No BNPL plans have been mapped to your business yet.
            </p>
            <p className="text-sm text-gray-500">
              Contact CRL Pay administrators to get financing plans mapped to your business.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {mappings.map((mapping) => (
              <div key={mapping.mappingId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {mapping.planDetails?.name || 'Plan Details Loading...'}
                      </h3>
                      <p className="text-sm text-gray-600">By {mapping.financierName}</p>
                    </div>
                  </div>
                  {getStatusBadge(mapping.status)}
                </div>

                {mapping.planDetails && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Interest Rate</p>
                        <p className="text-sm font-semibold text-gray-900">{mapping.planDetails.interestRate}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Tenor</p>
                        <p className="text-sm font-semibold text-gray-900">{formatTenor(mapping.planDetails.tenor)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Loan Range</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(mapping.planDetails.minimumAmount)} - {formatCurrency(mapping.planDetails.maximumAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Grace Period</p>
                        <p className="text-sm font-semibold text-gray-900">{formatTenor(mapping.planDetails.gracePeriod)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Funds Allocated</p>
                        <p className="text-lg font-bold text-blue-600">{formatCurrency(mapping.fundsAllocated)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Current Usage</p>
                        <p className="text-lg font-bold text-orange-600">{formatCurrency(mapping.currentAllocation)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Available</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(mapping.fundsAllocated - mapping.currentAllocation)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Utilization</p>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-purple-600" />
                          <p className="text-lg font-bold text-purple-600">
                            {getUtilizationPercentage(mapping.currentAllocation, mapping.fundsAllocated)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Loans</p>
                    <p className="text-sm font-semibold text-gray-900">{mapping.totalLoans}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Disbursed</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(mapping.totalDisbursed)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Repaid</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(mapping.totalRepaid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Expires</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-500" />
                      <p className="text-sm font-semibold text-gray-900">{formatTimestamp(mapping.expirationDate)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
