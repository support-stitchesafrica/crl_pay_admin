import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Plus, FileText, AlertCircle, Loader2, Trash2, X } from 'lucide-react';
import * as plansService from '../services/plans.service';
import { FinancingPlan, CreatePlanData } from '../services/types';
import { showToast } from '../utils/toast';

export default function Plans() {
  const [plans, setPlans] = useState<FinancingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreatePlanData>({
    name: '',
    description: '',
    tenor: { value: '' as any, period: 'MONTHS' },
    interestRate: '' as any,
    minimumAmount: '' as any,
    maximumAmount: '' as any,
    gracePeriod: { value: '' as any, period: 'DAYS' },
    lateFee: { type: 'percentage', amount: '' as any },
    allowEarlyRepayment: true,
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await plansService.getPlans();
      setPlans(data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load plans';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast.warning('Plan name is required');
      return;
    }

    // Convert empty strings to numbers for validation and submission
    const tenorValue = typeof formData.tenor.value === 'string' ? parseInt(formData.tenor.value) || 0 : formData.tenor.value;
    const interestRate = typeof formData.interestRate === 'string' ? parseFloat(formData.interestRate) || 0 : formData.interestRate;
    const minimumAmount = typeof formData.minimumAmount === 'string' ? parseFloat(formData.minimumAmount) || 0 : formData.minimumAmount;
    const maximumAmount = typeof formData.maximumAmount === 'string' ? parseFloat(formData.maximumAmount) || 0 : formData.maximumAmount;
    const gracePeriodValue = typeof formData.gracePeriod.value === 'string' ? parseInt(formData.gracePeriod.value) || 0 : formData.gracePeriod.value;
    const lateFeeAmount = typeof formData.lateFee.amount === 'string' ? parseFloat(formData.lateFee.amount) || 0 : formData.lateFee.amount;

    if (minimumAmount >= maximumAmount) {
      showToast.warning('Minimum amount must be less than maximum amount');
      return;
    }

    try {
      setProcessingId('creating');

      // Create payload with converted numbers
      const payload: CreatePlanData = {
        ...formData,
        tenor: { value: tenorValue, period: formData.tenor.period },
        interestRate,
        minimumAmount,
        maximumAmount,
        gracePeriod: { value: gracePeriodValue, period: formData.gracePeriod.period },
        lateFee: { type: formData.lateFee.type, amount: lateFeeAmount },
      };

      await plansService.createPlan(payload);
      showToast.success('Plan created successfully!');
      setCreateModalOpen(false);
      resetForm();
      loadPlans();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create plan';
      showToast.error(errorMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeactivatePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to deactivate this plan?')) return;

    try {
      setProcessingId(planId);
      await plansService.deactivatePlan(planId);
      showToast.success('Plan deactivated successfully');
      loadPlans();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to deactivate plan';
      showToast.error(errorMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      tenor: { value: '' as any, period: 'MONTHS' },
      interestRate: '' as any,
      minimumAmount: '' as any,
      maximumAmount: '' as any,
      gracePeriod: { value: '' as any, period: 'DAYS' },
      lateFee: { type: 'percentage', amount: '' as any },
      allowEarlyRepayment: true,
    });
  };

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  const getStatusBadge = (status: string, isActive: boolean) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700',
      inactive: 'bg-gray-100 text-gray-700',
    };
    const displayStatus = status === 'approved' ? (isActive ? 'Active' : 'Inactive') : status.charAt(0).toUpperCase() + status.slice(1);
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
        {displayStatus}
      </span>
    );
  };

  const formatTenor = (tenor: { value: number; period: string }) => {
    const periodName = tenor.period.toLowerCase();
    return `${tenor.value} ${periodName === 'days' ? 'day' : periodName === 'weeks' ? 'week' : periodName === 'months' ? 'month' : 'year'}${tenor.value > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading plans...</p>
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
            <button onClick={loadPlans} className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline">
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
            <p className="text-gray-600">Create and manage your financing offerings</p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Plan
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Plans Yet</h3>
            <p className="text-gray-600 mb-4">Create your first financing plan to start offering BNPL to merchants</p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Plan
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {plans.map((plan) => (
              <div key={plan.planId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    {plan.description && <p className="text-sm text-gray-600 mt-1">{plan.description}</p>}
                  </div>
                  {getStatusBadge(plan.status, plan.isActive)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Interest Rate</p>
                    <p className="text-sm font-semibold text-gray-900">{plan.interestRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tenor</p>
                    <p className="text-sm font-semibold text-gray-900">{formatTenor(plan.tenor)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Min Amount</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(plan.minimumAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Max Amount</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(plan.maximumAmount)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Funds</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(plan.totalFundsAllocated)}</p>
                    <p className="text-xs text-gray-500">From financier</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Allocated to Merchants</p>
                    <p className="text-lg font-bold text-orange-600">{formatCurrency(plan.fundsAllocatedToMerchants || 0)}</p>
                    <p className="text-xs text-gray-500">Via mappings</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Available Funds</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(plan.totalFundsAllocated - (plan.fundsAllocatedToMerchants || 0))}</p>
                    <p className="text-xs text-gray-500">For new mappings</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Loans</p>
                    <p className="text-lg font-bold text-purple-600">{plan.totalLoansCreated}</p>
                    <p className="text-xs text-gray-500">Created</p>
                  </div>
                </div>

                {plan.status === 'pending' && (
                  <div className="flex gap-2 items-center justify-end mt-4">
                    <button
                      onClick={() => handleDeactivatePlan(plan.planId)}
                      disabled={processingId === plan.planId}
                      className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {processingId === plan.planId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Plan Modal */}
      {createModalOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => !processingId && setCreateModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Create Financing Plan</h3>
                <button onClick={() => !processingId && setCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Plan Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 6-Month Standard"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      rows={2}
                      placeholder="Brief description of this plan"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tenor Value *</label>
                    <input
                      type="number"
                      value={formData.tenor.value}
                      onChange={(e) => setFormData({ ...formData, tenor: { ...formData.tenor, value: e.target.value === '' ? '' as any : parseInt(e.target.value) } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 6"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tenor Period *</label>
                    <select
                      value={formData.tenor.period}
                      onChange={(e) => setFormData({ ...formData, tenor: { ...formData.tenor, period: e.target.value as any } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="DAYS">Days</option>
                      <option value="WEEKS">Weeks</option>
                      <option value="MONTHS">Months</option>
                      <option value="YEARS">Years</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%) *</label>
                    <input
                      type="number"
                      value={formData.interestRate}
                      onChange={(e) => setFormData({ ...formData, interestRate: e.target.value === '' ? '' as any : parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 5.5"
                      min="0"
                      step="0.1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grace Period Value *</label>
                    <input
                      type="number"
                      value={formData.gracePeriod.value}
                      onChange={(e) => setFormData({ ...formData, gracePeriod: { ...formData.gracePeriod, value: e.target.value === '' ? '' as any : parseInt(e.target.value) } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 3"
                      min="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grace Period *</label>
                    <select
                      value={formData.gracePeriod.period}
                      onChange={(e) => setFormData({ ...formData, gracePeriod: { ...formData.gracePeriod, period: e.target.value as any } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="DAYS">Days</option>
                      <option value="WEEKS">Weeks</option>
                      <option value="MONTHS">Months</option>
                      <option value="YEARS">Years</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Amount (₦) *</label>
                    <input
                      type="number"
                      value={formData.minimumAmount}
                      onChange={(e) => setFormData({ ...formData, minimumAmount: e.target.value === '' ? '' as any : parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 10000"
                      min="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Amount (₦) *</label>
                    <input
                      type="number"
                      value={formData.maximumAmount}
                      onChange={(e) => setFormData({ ...formData, maximumAmount: e.target.value === '' ? '' as any : parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 500000"
                      min="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Late Fee Type *</label>
                    <select
                      value={formData.lateFee.type}
                      onChange={(e) => setFormData({ ...formData, lateFee: { ...formData.lateFee, type: e.target.value as 'fixed' | 'percentage' } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Late Fee {formData.lateFee.type === 'percentage' ? '(%)' : '(₦)'} *
                    </label>
                    <input
                      type="number"
                      value={formData.lateFee.amount}
                      onChange={(e) => setFormData({ ...formData, lateFee: { ...formData.lateFee, amount: e.target.value === '' ? '' as any : parseFloat(e.target.value) } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 5"
                      min="0"
                      step="0.1"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.allowEarlyRepayment}
                        onChange={(e) => setFormData({ ...formData, allowEarlyRepayment: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Allow early repayment</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    disabled={processingId === 'creating'}
                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingId === 'creating'}
                    className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingId === 'creating' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Plan'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
