import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Building2,
  DollarSign,
} from 'lucide-react';
import * as plansService from '../services/plans.service';
import * as financierService from '../services/financier.service';
import { FinancingPlan } from '../services/types';
import { showToast } from '../utils/toast';

export default function FinancingPlans() {
  const [plans, setPlans] = useState<FinancingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<FinancingPlan | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAllocateFundsModal, setShowAllocateFundsModal] = useState(false);
  const [fundsAllocated, setFundsAllocated] = useState<number>(0);
  const [additionalFunds, setAdditionalFunds] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [plansData, financiersData] = await Promise.all([
        plansService.getAllPlans(),
        financierService.getAll(),
      ]);

      // Enrich plans with financier names
      const enrichedPlans = plansData.map((plan) => {
        const financier = financiersData.find((f) => f.financierId === plan.financierId);
        return {
          ...plan,
          financierName: financier?.companyName || 'Unknown',
        };
      });

      setPlans(enrichedPlans);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load plans';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApproveModal = (plan: FinancingPlan) => {
    setSelectedPlan(plan);
    setFundsAllocated(0);
    setShowApproveModal(true);
  };

  const handleOpenStatusModal = (plan: FinancingPlan) => {
    setSelectedPlan(plan);
    setShowStatusModal(true);
  };

  const handleOpenAllocateFundsModal = (plan: FinancingPlan) => {
    setSelectedPlan(plan);
    setAdditionalFunds(0);
    setShowAllocateFundsModal(true);
  };

  const handleApprovePlan = async () => {
    if (!selectedPlan) return;

    if (fundsAllocated <= 0) {
      showToast.warning('Funds allocated must be greater than 0');
      return;
    }

    try {
      setProcessingId(selectedPlan.planId);
      await plansService.approvePlan(selectedPlan.planId, fundsAllocated);
      showToast.success('Plan approved successfully and funds allocated!');
      setShowApproveModal(false);
      loadData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to approve plan';
      showToast.error(errorMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAllocateFunds = async () => {
    if (!selectedPlan) return;

    if (additionalFunds <= 0) {
      showToast.warning('Additional funds must be greater than 0');
      return;
    }

    const newTotal = selectedPlan.totalFundsAllocated + additionalFunds;
    if (newTotal > selectedPlan.maximumAmount) {
      showToast.error(`Total funds cannot exceed plan maximum of ₦${selectedPlan.maximumAmount.toLocaleString()}`);
      return;
    }

    try {
      setProcessingId(selectedPlan.planId);
      const result = await plansService.allocateFunds(selectedPlan.planId, additionalFunds);
      showToast.success(result.message);
      setShowAllocateFundsModal(false);
      loadData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to allocate funds';
      showToast.error(errorMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateStatus = async (isActive: boolean) => {
    if (!selectedPlan) return;

    try {
      setProcessingId(selectedPlan.planId);
      await plansService.updatePlanStatus(selectedPlan.planId, isActive);
      showToast.success(`Plan ${isActive ? 'enabled' : 'disabled'} successfully!`);
      setShowStatusModal(false);
      loadData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update plan status';
      showToast.error(errorMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp._seconds
      ? new Date(timestamp._seconds * 1000)
      : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTenor = (tenor: { value: number; period: string }) => {
    const periodName = tenor.period.toLowerCase();
    return `${tenor.value} ${periodName === 'days' ? 'day' : periodName === 'weeks' ? 'week' : periodName === 'months' ? 'month' : 'year'}${tenor.value > 1 ? 's' : ''}`;
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700',
      inactive: 'bg-gray-100 text-gray-700',
    };
    const displayStatus =
      status === 'approved'
        ? isActive
          ? 'Active'
          : 'Inactive'
        : status.charAt(0).toUpperCase() + status.slice(1);
    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}
      >
        {displayStatus}
      </span>
    );
  };

  const filteredPlans = plans.filter((plan) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return plan.status === 'pending';
    if (filterStatus === 'active') return plan.status === 'approved' && plan.isActive;
    if (filterStatus === 'inactive')
      return plan.status === 'approved' && !plan.isActive;
    return true;
  });

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
            <button
              onClick={loadData}
              className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline"
            >
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financing Plans</h1>
            <p className="text-gray-600">Manage and approve financing plans from financiers</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Plans</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Plans</p>
            <p className="text-2xl font-bold text-gray-900">{plans.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Pending Approval</p>
            <p className="text-2xl font-bold text-yellow-600">
              {plans.filter((p) => p.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {plans.filter((p) => p.status === 'approved' && p.isActive).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Inactive</p>
            <p className="text-2xl font-bold text-gray-600">
              {plans.filter((p) => p.status === 'approved' && !p.isActive).length}
            </p>
          </div>
        </div>

        {filteredPlans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Plans Found</h3>
            <p className="text-gray-600">
              {filterStatus === 'all'
                ? 'No financing plans have been created yet'
                : `No ${filterStatus} plans found`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPlans.map((plan) => (
              <div
                key={plan.planId}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                      {getStatusBadge(plan.status, plan.isActive)}
                    </div>
                    {plan.description && (
                      <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span className="font-medium">{plan.financierName}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {plan.status === 'pending' && (
                      <button
                        onClick={() => handleOpenApproveModal(plan)}
                        disabled={processingId === plan.planId}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {processingId === plan.planId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                    )}
                    {plan.status === 'approved' && (
                      <>
                        {plan.totalFundsAllocated < plan.maximumAmount && (
                          <button
                            onClick={() => handleOpenAllocateFundsModal(plan)}
                            disabled={processingId === plan.planId}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {processingId === plan.planId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <DollarSign className="w-4 h-4" />
                            )}
                            Add Funds
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenStatusModal(plan)}
                          disabled={processingId === plan.planId}
                          className={`px-4 py-2 ${plan.isActive ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2`}
                        >
                          {processingId === plan.planId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : plan.isActive ? (
                            <ToggleLeft className="w-4 h-4" />
                          ) : (
                            <ToggleRight className="w-4 h-4" />
                          )}
                          {plan.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Interest Rate</p>
                    <p className="text-sm font-semibold text-gray-900">{plan.interestRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tenor</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatTenor(plan.tenor)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Min Amount</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(plan.minimumAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Max Amount</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(plan.maximumAmount)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Funds</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(plan.totalFundsAllocated)}
                    </p>
                    <p className="text-xs text-gray-500">From financier</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Allocated to Merchants</p>
                    <p className="text-lg font-bold text-orange-600">
                      {formatCurrency(plan.fundsAllocatedToMerchants || 0)}
                    </p>
                    <p className="text-xs text-gray-500">Via mappings</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Available Funds</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(plan.totalFundsAllocated - (plan.fundsAllocatedToMerchants || 0))}
                    </p>
                    <p className="text-xs text-gray-500">For new mappings</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Loans</p>
                    <p className="text-lg font-bold text-purple-600">{plan.totalLoansCreated}</p>
                    <p className="text-xs text-gray-500">Created</p>
                  </div>
                </div>

                {plan.expiresAt && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Expires: <span className="font-medium">{formatTimestamp(plan.expiresAt)}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve Plan Modal */}
      {showApproveModal && selectedPlan && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => !processingId && setShowApproveModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Approve Plan</h3>
                  <p className="text-sm text-gray-600">{selectedPlan.name}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900 mb-2">
                    <span className="font-medium">Loan Limits:</span> ₦{selectedPlan.minimumAmount.toLocaleString()} - ₦{selectedPlan.maximumAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-700">
                    These are per-customer loan limits. The total funds can be any amount.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Funds Received from Financier (₦) *
                  </label>
                  <input
                    type="number"
                    value={fundsAllocated || ''}
                    onChange={(e) => setFundsAllocated(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., 10000000"
                    min="0"
                    step="1000"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This is the total pool available for merchant mappings. Can be any amount.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowApproveModal(false)}
                  disabled={!!processingId}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprovePlan}
                  disabled={!!processingId}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Approve Plan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Update Status Modal */}
      {showStatusModal && selectedPlan && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => !processingId && setShowStatusModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={`w-12 h-12 ${selectedPlan.isActive ? 'bg-gray-100' : 'bg-blue-100'} rounded-lg flex items-center justify-center`}
                >
                  {selectedPlan.isActive ? (
                    <ToggleLeft className="w-6 h-6 text-gray-600" />
                  ) : (
                    <ToggleRight className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedPlan.isActive ? 'Disable' : 'Enable'} Plan
                  </h3>
                  <p className="text-sm text-gray-600">{selectedPlan.name}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                {selectedPlan.isActive
                  ? 'Disabling this plan will prevent merchants from accessing it for new loans. Existing merchant mappings will remain but will be inactive.'
                  : 'Enabling this plan will allow it to be mapped to merchants. Expiration dates are set per merchant during mapping.'}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  disabled={!!processingId}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStatus(!selectedPlan.isActive)}
                  disabled={!!processingId}
                  className={`flex-1 px-4 py-2.5 ${selectedPlan.isActive ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {processingId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {selectedPlan.isActive ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      {selectedPlan.isActive ? 'Disable' : 'Enable'} Plan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Allocate Funds Modal */}
      {showAllocateFundsModal && selectedPlan && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => !processingId && setShowAllocateFundsModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Add Funds</h3>
                  <p className="text-sm text-gray-600">{selectedPlan.name}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <p className="text-xs text-blue-700">Current Total</p>
                      <p className="text-sm font-bold text-blue-900">
                        ₦{selectedPlan.totalFundsAllocated.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700">Plan Maximum</p>
                      <p className="text-sm font-bold text-blue-900">
                        ₦{selectedPlan.maximumAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700">
                    Remaining capacity: ₦{(selectedPlan.maximumAmount - selectedPlan.totalFundsAllocated).toLocaleString()}
                  </p>
                </div>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Funds (₦) *
                </label>
                <input
                  type="number"
                  value={additionalFunds || ''}
                  onChange={(e) => setAdditionalFunds(parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 100000"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={!!processingId}
                  min="0"
                  max={selectedPlan.maximumAmount - selectedPlan.totalFundsAllocated}
                  step="1000"
                />
                <p className="text-xs text-gray-500 mt-2">
                  New total will be: ₦{(selectedPlan.totalFundsAllocated + (additionalFunds || 0)).toLocaleString()}
                  {(selectedPlan.totalFundsAllocated + (additionalFunds || 0)) > selectedPlan.maximumAmount && (
                    <span className="text-red-600 font-medium"> - Exceeds maximum!</span>
                  )}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAllocateFundsModal(false)}
                  disabled={!!processingId}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAllocateFunds}
                  disabled={!!processingId || additionalFunds <= 0}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      Add Funds
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
