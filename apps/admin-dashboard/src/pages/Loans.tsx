import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Users,
  Loader2,
  X,
  Calendar,
} from 'lucide-react';
import { getLoans, triggerInterestAccrualForAll } from '../services/loan.service';
import { Loan } from '../services/types/loan.types';
import { showToast } from '../utils/toast';
import DashboardLayout from '../components/DashboardLayout';

export default function Loans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [merchantFilter, setMerchantFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [triggeringBulkAccrual, setTriggeringBulkAccrual] = useState(false);
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    loan: Loan | null;
  }>({
    isOpen: false,
    loan: null,
  });

  useEffect(() => {
    fetchData();
  }, [statusFilter, merchantFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (merchantFilter) filters.merchantId = merchantFilter;

      const data = await getLoans(filters);
      setLoans(data);
    } catch (error: any) {
      showToast.error(error.message || 'Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAccrualTrigger = async () => {
    try {
      setTriggeringBulkAccrual(true);
      await triggerInterestAccrualForAll();
      showToast.success('Interest accrual triggered for all active loans');
      await fetchData(); // Refresh loan data
    } catch (error: any) {
      showToast.error(error.message || 'Failed to trigger bulk interest accrual');
    } finally {
      setTriggeringBulkAccrual(false);
    }
  };


  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      defaulted: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="w-4 h-4" />,
      active: <TrendingUp className="w-4 h-4" />,
      completed: <CheckCircle className="w-4 h-4" />,
      defaulted: <XCircle className="w-4 h-4" />,
      cancelled: <AlertTriangle className="w-4 h-4" />,
    };
    return icons[status as keyof typeof icons] || <Clock className="w-4 h-4" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredLoans = loans.filter((loan) => {
    if (!searchTerm) return true;
    return (
      loan.loanId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.merchantId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.orderId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Calculate stats from filtered loans
  const stats = {
    totalLoans: filteredLoans.length,
    activeLoans: filteredLoans.filter((l) => l.status === 'active').length,
    completedLoans: filteredLoans.filter((l) => l.status === 'completed').length,
    defaultedLoans: filteredLoans.filter((l) => l.status === 'defaulted').length,
    totalDisbursed: filteredLoans.reduce((sum, l) => sum + l.principalAmount, 0),
    totalCollected: filteredLoans.reduce((sum, l) => sum + l.amountPaid, 0),
    totalOutstanding: filteredLoans.reduce((sum, l) => sum + l.amountRemaining, 0),
    totalAccruedInterest: filteredLoans.reduce((sum, l) => 
      sum + (l.paymentSchedule?.reduce((schedSum, p) => schedSum + (p.accruedInterest || 0), 0) || 0), 0
    ),
    totalLateFees: filteredLoans.reduce((sum, l) => 
      sum + (l.paymentSchedule?.reduce((schedSum, p) => schedSum + (p.lateFee || 0), 0) || 0), 0
    ),
  };

  // Get unique merchant IDs for filter dropdown
  const uniqueMerchants = Array.from(new Set(loans.map((l) => l.merchantId)));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading loans...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loans</h1>
          <p className="text-gray-600 mt-1">Monitor and manage all loans across all merchants</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBulkAccrualTrigger}
            disabled={triggeringBulkAccrual}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {triggeringBulkAccrual ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                Trigger Accrual (All Loans)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Loans</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalLoans}</p>
            </div>
            <CreditCard className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Loans</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{stats.activeLoans}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Disbursed</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {formatCurrency(stats.totalDisbursed)}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Outstanding</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">
                {formatCurrency(stats.totalOutstanding)}
              </p>
            </div>
            <Clock className="w-10 h-10 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed Loans</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{stats.completedLoans}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Defaulted Loans</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{stats.defaultedLoans}</p>
            </div>
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Collected</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {formatCurrency(stats.totalCollected)}
              </p>
            </div>
            <Users className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-2 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Accrued Interest</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">
                {formatCurrency(stats.totalAccruedInterest)}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-2 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Late Fees</p>
              <p className="text-2xl font-bold text-red-900 mt-1">
                {formatCurrency(stats.totalLateFees)}
              </p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by Loan ID, Customer ID, Merchant ID, or Order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Merchant Filter */}
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            <select
              value={merchantFilter}
              onChange={(e) => setMerchantFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Merchants</option>
              {uniqueMerchants.map((merchantId) => (
                <option key={merchantId} value={merchantId}>
                  {merchantId.substring(0, 12)}...
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="defaulted">Defaulted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loan Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Merchant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Accrued / Fees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No loans found
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => {
                  const totalAccrued = loan.paymentSchedule?.reduce((sum, p) => sum + (p.accruedInterest || 0), 0) || 0;
                  const totalLateFees = loan.paymentSchedule?.reduce((sum, p) => sum + (p.lateFee || 0), 0) || 0;
                  
                  return (
                  <tr key={loan.loanId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {loan.loanAccountNumber && (
                          <div className="font-mono font-semibold text-blue-600 text-xs mb-1">
                            {loan.loanAccountNumber}
                          </div>
                        )}
                        <div className="font-medium text-gray-900">
                          {loan.loanId.substring(0, 8)}...
                        </div>
                        <div className="text-gray-500">
                          {loan.configuration.tenor.value} {loan.configuration.tenor.period}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {loan.merchantId.substring(0, 12)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {loan.customerId.substring(0, 12)}...
                      </div>
                      {loan.orderId && (
                        <div className="text-xs text-gray-500">Order: {loan.orderId}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(loan.principalAmount)}
                        </div>
                        <div className="text-gray-500 text-xs">
                          Total: {formatCurrency(loan.configuration.totalAmount)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-orange-600">
                          {formatCurrency(totalAccrued)}
                        </div>
                        {totalLateFees > 0 && (
                          <div className="text-red-600 text-xs">
                            Fees: {formatCurrency(totalLateFees)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${loan.status === 'completed' ? 100 : loan.status === 'expired' ? 0 : (loan.amountPaid / (loan.amountPaid + loan.amountRemaining)) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">
                            {loan.status === 'completed' ? 100 : loan.status === 'expired' ? 0 : Math.round((loan.amountPaid / (loan.amountPaid + loan.amountRemaining)) * 100)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {loan.currentInstallment}/{loan.configuration.numberOfInstallments}{' '}
                          payments
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(loan.status)}`}
                      >
                        {getStatusIcon(loan.status)}
                        {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(loan.bookingDate || loan.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white">
                      <button
                        onClick={() => setViewModal({ isOpen: true, loan })}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Loan Details Modal */}
      {viewModal.isOpen && viewModal.loan && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setViewModal({ isOpen: false, loan: null })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full my-8">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {viewModal.loan.loanAccountNumber || viewModal.loan.loanId.substring(0, 12)}
                    </h3>
                    <p className="text-blue-100 text-sm">Loan Details & Repayment Schedule</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewModal({ isOpen: false, loan: null })}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
                {/* Status and Basic Info */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusBadge(viewModal.loan.status)}`}
                  >
                    {getStatusIcon(viewModal.loan.status)}
                    {viewModal.loan.status.charAt(0).toUpperCase() + viewModal.loan.status.slice(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    Loan ID: {viewModal.loan.loanId.substring(0, 16)}...
                  </span>
                  <span className="text-sm text-gray-500">
                    {viewModal.loan.configuration.tenor.value} {viewModal.loan.configuration.tenor.period} • {viewModal.loan.configuration.frequency}
                  </span>
                </div>

                {/* Loan Overview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    Loan Overview
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Principal</label>
                      <p className="text-gray-900 font-semibold mt-1">{formatCurrency(viewModal.loan.principalAmount)}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Total Amount</label>
                      <p className="text-gray-900 font-semibold mt-1">{formatCurrency(viewModal.loan.configuration.totalAmount)}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Amount Paid</label>
                      <p className="text-green-600 font-semibold mt-1">{formatCurrency(viewModal.loan.amountPaid)}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Remaining</label>
                      <p className="text-orange-600 font-semibold mt-1">{formatCurrency(viewModal.loan.amountRemaining)}</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600">Payment Progress</span>
                      <span className="text-xs font-medium text-gray-900">
                        {viewModal.loan.status === 'completed' ? 100 : viewModal.loan.status === 'expired' ? 0 : Math.round((viewModal.loan.amountPaid / (viewModal.loan.amountPaid + viewModal.loan.amountRemaining)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${viewModal.loan.status === 'completed' ? 100 : viewModal.loan.status === 'expired' ? 0 : (viewModal.loan.amountPaid / (viewModal.loan.amountPaid + viewModal.loan.amountRemaining)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Accrual Summary */}
                {(() => {
                  const totalAccrued = viewModal.loan.paymentSchedule?.reduce((sum, p) => sum + (p.accruedInterest || 0), 0) || 0;
                  const totalLateFees = viewModal.loan.paymentSchedule?.reduce((sum, p) => sum + (p.lateFee || 0), 0) || 0;
                  const unpaidPrincipal = viewModal.loan.paymentSchedule
                    ?.filter(p => p.status === 'pending')
                    .reduce((sum, p) => sum + (p.remainingPrincipal || p.principalAmount), 0) || 0;
                  
                  return (totalAccrued > 0 || totalLateFees > 0 || unpaidPrincipal > 0) && (
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                        Accrual & Liquidation Summary
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600 uppercase">Unpaid Principal</label>
                          <p className="text-gray-900 font-bold mt-1">{formatCurrency(unpaidPrincipal)}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 uppercase">Accrued Interest</label>
                          <p className="text-orange-600 font-bold mt-1">{formatCurrency(totalAccrued)}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 uppercase">Late Fees</label>
                          <p className="text-red-600 font-bold mt-1">{formatCurrency(totalLateFees)}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 uppercase">Total Liquidation</label>
                          <p className="text-green-700 font-bold mt-1">{formatCurrency(unpaidPrincipal + totalAccrued + totalLateFees)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Repayment Schedule */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      Repayment Schedule ({viewModal.loan.paymentSchedule?.length || 0} installments)
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Principal</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Interest</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Accrued</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Late Fee</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {viewModal.loan.paymentSchedule?.map((payment) => (
                          <tr key={payment.installmentNumber} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                              {payment.installmentNumber}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(payment.dueDate)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(payment.principalAmount)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-blue-600">
                              {formatCurrency(payment.remainingPrincipal || payment.principalAmount)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                              {formatCurrency(payment.interestAmount)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-orange-600">
                              {formatCurrency(payment.accruedInterest || 0)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-red-600">
                              {payment.lateFee ? formatCurrency(payment.lateFee) : '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">
                              {payment.paidAmount ? formatCurrency(payment.paidAmount) : '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusBadge(payment.status)}`}
                              >
                                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Configuration Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Loan Configuration</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Interest Rate</label>
                      <p className="text-gray-900 mt-1">{viewModal.loan.configuration.interestRate}% annual</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Penalty Rate</label>
                      <p className="text-gray-900 mt-1">{viewModal.loan.configuration.penaltyRate}%</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Installments</label>
                      <p className="text-gray-900 mt-1">{viewModal.loan.configuration.numberOfInstallments}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Per Installment</label>
                      <p className="text-gray-900 mt-1">{formatCurrency(viewModal.loan.configuration.installmentAmount)}</p>
                    </div>
                  </div>
                </div>

                {/* IDs */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Identifiers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Merchant ID</label>
                      <p className="text-gray-900 text-xs mt-1 font-mono break-all">{viewModal.loan.merchantId}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Customer ID</label>
                      <p className="text-gray-900 text-xs mt-1 font-mono break-all">{viewModal.loan.customerId}</p>
                    </div>
                    {viewModal.loan.orderId && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Order ID</label>
                        <p className="text-gray-900 text-xs mt-1 font-mono break-all">{viewModal.loan.orderId}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-between items-center">
                <Link
                  to={`/loans/${viewModal.loan.loanId}`}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  View Full Details Page →
                </Link>
                <button
                  onClick={() => setViewModal({ isOpen: false, loan: null })}
                  className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
