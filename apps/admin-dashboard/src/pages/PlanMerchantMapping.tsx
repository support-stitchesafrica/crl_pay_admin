import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  AlertCircle,
  Loader2,
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Link as LinkIcon,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import * as financierService from '../services/financier.service';
import * as merchantService from '../services/merchant.service';
import { FinancingPlan, PlanMerchantMapping, Merchant, Financier } from '../services/types';
import { showToast } from '../utils/toast';

export default function PlanMerchantMappingPage() {
  const [mappings, setMappings] = useState<PlanMerchantMapping[]>([]);
  const [plans, setPlans] = useState<FinancingPlan[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [financiers, setFinanciers] = useState<Financier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Create mapping modal
  const [createModal, setCreateModal] = useState<{
    isOpen: boolean;
    planId: string;
    merchantId: string;
    fundsAllocated: string;
    expirationDate: string;
    processing: boolean;
  }>({
    isOpen: false,
    planId: '',
    merchantId: '',
    fundsAllocated: '',
    expirationDate: '',
    processing: false,
  });

  // Edit mapping modal
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    mapping: PlanMerchantMapping | null;
    fundsAllocated: string;
    processing: boolean;
  }>({
    isOpen: false,
    mapping: null,
    fundsAllocated: '',
    processing: false,
  });

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    mapping: PlanMerchantMapping | null;
    processing: boolean;
  }>({
    isOpen: false,
    mapping: null,
    processing: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [mappingsData, plansData, merchantsData, financiersData] = await Promise.all([
        financierService.getMappings(),
        financierService.getPlans(),
        merchantService.getAll(),
        financierService.getAll('approved'),
      ]);

      setMappings(Array.isArray(mappingsData) ? mappingsData : []);
      setPlans(Array.isArray(plansData) ? plansData.filter((p) => p.status === 'approved' && p.isActive) : []);
      setMerchants(Array.isArray(merchantsData) ? merchantsData.filter((m) => m.status === 'approved') : []);
      setFinanciers(Array.isArray(financiersData) ? financiersData : []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load data';
      setError(errorMsg);
      showToast.error(errorMsg);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMapping = async () => {
    if (!createModal.planId || !createModal.merchantId) {
      showToast.warning('Please select both a plan and a merchant');
      return;
    }

    // Validate plan is enabled
    const selectedPlan = plans.find(p => p.planId === createModal.planId);
    if (!selectedPlan) {
      showToast.error('Selected plan not found');
      return;
    }

    if (!selectedPlan.isActive) {
      showToast.error('Plan must be enabled before mapping to merchants');
      return;
    }

    // Validate funds allocated
    const fundsToAllocate = parseFloat(createModal.fundsAllocated);
    if (!createModal.fundsAllocated || fundsToAllocate <= 0) {
      showToast.warning('Funds allocated must be greater than 0');
      return;
    }

    // Get financier and calculate available funds
    const financier = financiers.find(f => f.financierId === selectedPlan.financierId);
    if (!financier) {
      showToast.error('Financier not found');
      return;
    }

    // Calculate already allocated funds for this plan
    const totalAllocatedForPlan = mappings
      .filter(m => m.planId === selectedPlan.planId)
      .reduce((sum, m) => sum + m.fundsAllocated, 0);

    const availableFunds = selectedPlan.totalFundsAllocated - totalAllocatedForPlan;

    if (fundsToAllocate > availableFunds) {
      showToast.error(`Insufficient funds. Only ₦${availableFunds.toLocaleString()} available for allocation (₦${totalAllocatedForPlan.toLocaleString()} already allocated out of ₦${selectedPlan.totalFundsAllocated.toLocaleString()})`);
      return;
    }

    // Validate expiration date
    if (!createModal.expirationDate) {
      showToast.warning('Expiration date is required');
      return;
    }

    // Calculate minimum expiration based on plan tenor
    const now = new Date();
    const minExpiration = new Date(now);

    if (selectedPlan.tenor.period === 'DAYS') {
      minExpiration.setDate(minExpiration.getDate() + selectedPlan.tenor.value);
    } else if (selectedPlan.tenor.period === 'WEEKS') {
      minExpiration.setDate(minExpiration.getDate() + (selectedPlan.tenor.value * 7));
    } else if (selectedPlan.tenor.period === 'MONTHS') {
      minExpiration.setMonth(minExpiration.getMonth() + selectedPlan.tenor.value);
    } else if (selectedPlan.tenor.period === 'YEARS') {
      minExpiration.setFullYear(minExpiration.getFullYear() + selectedPlan.tenor.value);
    }

    const expirationDate = new Date(createModal.expirationDate);
    if (expirationDate <= minExpiration) {
      showToast.error(`Expiration date must be after ${minExpiration.toLocaleDateString()} (allocation date + plan tenor)`);
      return;
    }

    try {
      setCreateModal({ ...createModal, processing: true });

      const data = {
        planId: createModal.planId,
        merchantId: createModal.merchantId,
        fundsAllocated: parseFloat(createModal.fundsAllocated),
        expirationDate: expirationDate.toISOString(),
      };

      const result = await financierService.createMapping(data);
      setMappings([...mappings, result.mapping]);

      showToast.success(result.message);
      setCreateModal({ isOpen: false, planId: '', merchantId: '', fundsAllocated: '', expirationDate: '', processing: false });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create mapping';
      showToast.error(errorMsg);
      setCreateModal({ ...createModal, processing: false });
    }
  };

  const handleUpdateMapping = async () => {
    if (!editModal.mapping) return;

    const currentUsage = editModal.mapping.currentAllocation || 0;
    const newAllocation = parseFloat(editModal.fundsAllocated);

    // Validate funds allocated
    if (editModal.fundsAllocated && (isNaN(newAllocation) || newAllocation <= 0)) {
      showToast.warning('Funds allocated must be a valid positive number');
      return;
    }

    // Validate not below current usage
    if (editModal.fundsAllocated && newAllocation < currentUsage) {
      showToast.error(`Cannot reduce allocation below current usage of ₦${currentUsage.toLocaleString()}`);
      return;
    }

    try {
      setEditModal({ ...editModal, processing: true });

      const data: any = {
        status: editModal.mapping.status,
      };

      if (editModal.fundsAllocated && newAllocation !== editModal.mapping.fundsAllocated) {
        data.fundsAllocated = newAllocation;
      }

      await financierService.updateMapping(editModal.mapping.mappingId, data);

      // Update in the list
      setMappings(
        mappings.map((m) =>
          m.mappingId === editModal.mapping!.mappingId
            ? { ...m, ...data }
            : m
        )
      );

      showToast.success('Mapping updated successfully');
      setEditModal({ isOpen: false, mapping: null, fundsAllocated: '', processing: false });
      loadData(); // Reload to get updated data
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update mapping';
      showToast.error(errorMsg);
      setEditModal({ ...editModal, processing: false });
    }
  };

  const handleDeleteMapping = async () => {
    if (!deleteModal.mapping) return;

    try {
      setDeleteModal({ ...deleteModal, processing: true });
      await financierService.deleteMapping(deleteModal.mapping.mappingId);

      // Remove from list
      setMappings(mappings.filter((m) => m.mappingId !== deleteModal.mapping!.mappingId));

      showToast.success('Mapping deleted successfully');
      setDeleteModal({ isOpen: false, mapping: null, processing: false });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to delete mapping';
      showToast.error(errorMsg);
      setDeleteModal({ ...deleteModal, processing: false });
    }
  };

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

  const getPlanName = (planId: string) => {
    const plan = plans.find((p) => p.planId === planId);
    return plan?.name || 'Unknown Plan';
  };

  const getMerchantName = (merchantId: string) => {
    const merchant = merchants.find((m) => m.merchantId === merchantId);
    return merchant?.businessName || 'Unknown Merchant';
  };

  const getFinancierName = (financierId: string) => {
    const financier = financiers.find((f) => f.financierId === financierId);
    return financier?.companyName || 'Unknown Financier';
  };

  const getPlanDetails = (planId: string) => {
    return plans.find((p) => p.planId === planId);
  };

  const getAvailableFunds = (planId: string) => {
    const plan = plans.find(p => p.planId === planId);
    if (!plan) return 0;

    const allocatedToMerchants = plan.fundsAllocatedToMerchants || 0;
    return plan.totalFundsAllocated - allocatedToMerchants;
  };

  const getAllocatedFunds = (planId: string) => {
    const plan = plans.find(p => p.planId === planId);
    if (!plan) return 0;
    return plan.fundsAllocatedToMerchants || 0;
  };

  const filteredMappings = mappings.filter((mapping) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      getPlanName(mapping.planId).toLowerCase().includes(term) ||
      getMerchantName(mapping.merchantId).toLowerCase().includes(term) ||
      getFinancierName(mapping.financierId).toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading plan mappings...</p>
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
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Data</h3>
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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Mappings</p>
                <p className="text-2xl font-bold text-gray-900">{mappings.length}</p>
              </div>
              <LinkIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Plans</p>
                <p className="text-2xl font-bold text-green-600">{plans.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Merchants</p>
                <p className="text-2xl font-bold text-purple-600">{merchants.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Disbursed</p>
                <p className="text-2xl font-bold text-orange-600">
                  ₦{mappings.reduce((sum, m) => sum + m.totalDisbursed, 0).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Search & Create */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by plan, merchant, or financier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={() =>
              setCreateModal({ isOpen: true, planId: '', merchantId: '', fundsAllocated: '', expirationDate: '', processing: false })
            }
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium
                     transition-colors flex items-center gap-2 justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Create Mapping</span>
          </button>
        </div>

        {/* Mappings List */}
        {filteredMappings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Mappings Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search' : 'Create your first plan-merchant mapping'}
            </p>
            {!searchTerm && (
              <button
                onClick={() =>
                  setCreateModal({
                    isOpen: true,
                    planId: '',
                    merchantId: '',
                    fundsAllocated: '',
                    expirationDate: '',
                    processing: false,
                  })
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Create Mapping
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredMappings.map((mapping) => {
              const plan = getPlanDetails(mapping.planId);
              return (
                <div
                  key={mapping.mappingId}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <LinkIcon className="w-5 h-5 text-blue-600" />
                          <h3 className="text-lg font-bold text-gray-900">{getPlanName(mapping.planId)}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span>{getMerchantName(mapping.merchantId)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">by {getFinancierName(mapping.financierId)}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          mapping.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {mapping.status}
                      </span>
                    </div>

                    {/* Plan Details */}
                    {plan && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500">Interest Rate</p>
                          <p className="text-sm font-semibold text-gray-900">{plan.interestRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tenor</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {plan.tenor.value} {plan.tenor.period.toLowerCase()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Min Amount</p>
                          <p className="text-sm font-semibold text-gray-900">
                            ₦{plan.minimumAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Max Amount</p>
                          <p className="text-sm font-semibold text-gray-900">
                            ₦{plan.maximumAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Mapping Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Funds Allocated</p>
                        <p className="text-sm font-bold text-blue-600">
                          ₦{mapping.fundsAllocated.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Current Usage</p>
                        <p className="text-sm font-bold text-orange-600">
                          ₦{mapping.currentAllocation.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Loans</p>
                        <p className="text-sm font-bold text-purple-600">{mapping.totalLoans}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Disbursed</p>
                        <p className="text-sm font-bold text-green-600">
                          ₦{mapping.totalDisbursed.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Default Rate</p>
                        <p className="text-sm font-bold text-red-600">{mapping.defaultRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Expires</p>
                        <p className="text-sm font-bold text-gray-900">{formatTimestamp(mapping.expirationDate)}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() =>
                          setEditModal({
                            isOpen: true,
                            mapping,
                            fundsAllocated: mapping.fundsAllocated.toString(),
                            processing: false,
                          })
                        }
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                                 text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, mapping, processing: false })}
                        disabled={(mapping.currentAllocation || 0) > 0 || (mapping.totalLoans || 0) > 0}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg
                                 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={(mapping.currentAllocation || 0) > 0 || (mapping.totalLoans || 0) > 0 ? 'Cannot delete mapping with active usage or loans. Disable it instead.' : ''}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Mapping Modal */}
      {createModal.isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() =>
              !createModal.processing &&
              setCreateModal({ isOpen: false, planId: '', merchantId: '', fundsAllocated: '', expirationDate: '', processing: false })
            }
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 bg-blue-100">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">Create Plan-Merchant Mapping</h3>
              <p className="text-gray-600 mb-4">Map a financing plan to a merchant to enable BNPL for their customers.</p>

              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Financing Plan</label>
                  <select
                    value={createModal.planId}
                    onChange={(e) => setCreateModal({ ...createModal, planId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={createModal.processing}
                  >
                    <option value="">Select a plan</option>
                    {plans.map((plan) => (
                      <option key={plan.planId} value={plan.planId}>
                        {plan.name} ({getFinancierName(plan.financierId)})
                      </option>
                    ))}
                  </select>
                  {createModal.planId && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">
                        Available Funds: ₦{getAvailableFunds(createModal.planId).toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Total: ₦{plans.find(p => p.planId === createModal.planId)?.totalFundsAllocated.toLocaleString()} |
                        Already Allocated: ₦{getAllocatedFunds(createModal.planId).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Merchant</label>
                  <select
                    value={createModal.merchantId}
                    onChange={(e) => setCreateModal({ ...createModal, merchantId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={createModal.processing}
                  >
                    <option value="">Select a merchant</option>
                    {merchants.map((merchant) => (
                      <option key={merchant.merchantId} value={merchant.merchantId}>
                        {merchant.businessName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Funds Allocated (₦) *
                  </label>
                  <input
                    type="number"
                    value={createModal.fundsAllocated}
                    onChange={(e) => setCreateModal({ ...createModal, fundsAllocated: e.target.value })}
                    placeholder="e.g., 5000000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={createModal.processing}
                    min="0"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Amount allocated from plan's pool. This is the maximum this merchant can use.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiration Date *
                  </label>
                  <input
                    type="date"
                    value={createModal.expirationDate}
                    onChange={(e) => setCreateModal({ ...createModal, expirationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={createModal.processing}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must be greater than plan tenor from allocation date
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setCreateModal({
                      isOpen: false,
                      planId: '',
                      merchantId: '',
                      fundsAllocated: '',
                      expirationDate: '',
                      processing: false,
                    })
                  }
                  disabled={createModal.processing}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMapping}
                  disabled={createModal.processing || !createModal.planId || !createModal.merchantId}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium
                           disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createModal.processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Mapping'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Mapping Modal */}
      {editModal.isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() =>
              !editModal.processing && setEditModal({ isOpen: false, mapping: null, fundsAllocated: '', processing: false })
            }
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 bg-blue-100">
                <Edit className="w-6 h-6 text-blue-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">Edit Mapping</h3>
              <p className="text-gray-600 mb-4">
                {getPlanName(editModal.mapping?.planId || '')} →{' '}
                {getMerchantName(editModal.mapping?.merchantId || '')}
              </p>

              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Funds Allocated (₦) *
                  </label>
                  <input
                    type="number"
                    value={editModal.fundsAllocated}
                    onChange={(e) => setEditModal({ ...editModal, fundsAllocated: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={editModal.processing}
                    min={editModal.mapping?.currentAllocation || 0}
                    step="1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Current usage: ₦{(editModal.mapping?.currentAllocation || 0).toLocaleString()}
                    {editModal.fundsAllocated && parseFloat(editModal.fundsAllocated) < (editModal.mapping?.currentAllocation || 0) && (
                      <span className="text-red-600 font-medium"> - Cannot be less than current usage!</span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={editModal.mapping?.status || 'active'}
                    onChange={(e) => setEditModal({ ...editModal, mapping: editModal.mapping ? { ...editModal.mapping, status: e.target.value as any } : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={editModal.processing}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Inactive/Suspended prevents new loans but keeps existing data
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditModal({ isOpen: false, mapping: null, fundsAllocated: '', processing: false })}
                  disabled={editModal.processing}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateMapping}
                  disabled={editModal.processing}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium
                           disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {editModal.processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    'Update Mapping'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => !deleteModal.processing && setDeleteModal({ isOpen: false, mapping: null, processing: false })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 bg-red-100">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Mapping?</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete the mapping between {getPlanName(deleteModal.mapping?.planId || '')} and{' '}
                {getMerchantName(deleteModal.mapping?.merchantId || '')}? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, mapping: null, processing: false })}
                  disabled={deleteModal.processing}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteMapping}
                  disabled={deleteModal.processing}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium
                           disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteModal.processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    'Delete Mapping'
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
