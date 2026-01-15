import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  Receipt,
  Loader2,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  TrendingUp,
  Eye,
  X,
} from 'lucide-react';
import * as loanService from '../services/loan.service';
import { Loan } from '../services/types/loan.types';
import { showToast } from '../utils/toast';

export default function Transactions() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    loan: Loan | null;
  }>({
    isOpen: false,
    loan: null,
  });

  useEffect(() => {
    loadLoans();
  }, []);

  useEffect(() => {
    let filtered = loans;
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((loan) => loan.status === statusFilter);
    }
    
    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (loan) =>
          (loan as any).loanAccountNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          loan.loanId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredLoans(filtered);
  }, [loans, searchTerm, statusFilter]);

  const loadLoans = async () => {
    try {
      setLoading(true);
      const data = await loanService.getLoans();
      setLoans(data);
    } catch (error: any) {
      showToast.error(error.message || 'Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      active: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
      completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      defaulted: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle },
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const totalDisbursed = loans.reduce((sum, loan) => sum + loan.principalAmount, 0);
  const totalCollected = loans.reduce((sum, loan) => sum + loan.amountPaid, 0);
  const totalOutstanding = loans.reduce((sum, loan) => sum + loan.amountRemaining, 0);
  
  // Calculate total accrued interest from all loans (same as admin dashboard)
  const totalAccruedInterest = loans.reduce((sum, loan) => 
    sum + (loan.paymentSchedule?.reduce((schedSum: number, p: any) => schedSum + (p.accruedInterest || 0), 0) || 0), 0
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loans</h1>
          <p className="text-gray-600">View and manage all loans</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Disbursed</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalDisbursed)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Collected</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCollected)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Accrued Interest</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAccruedInterest)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalOutstanding)}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by loan ID or account number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="defaulted">Defaulted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Transactions Table */}
        {filteredLoans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Loans Found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'No loans yet'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loan Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Accrued Interest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLoans.map((loan) => {
                    const statusBadge = getStatusBadge(loan.status);
                    const StatusIcon = statusBadge.icon;
                    // Completed loans should always show 100% progress
                    const paymentProgress = loan.status === 'completed' 
                      ? 100 
                      : loan.configuration?.totalAmount > 0 
                        ? (loan.amountPaid / loan.configuration.totalAmount) * 100 
                        : 0;

                    // Get accrued interest from payment schedule (same as admin dashboard)
                    const accruedInterest = loan.paymentSchedule?.reduce((sum: number, p: any) => 
                      sum + (p.accruedInterest || 0), 0
                    ) || 0;

                    return (
                      <tr key={loan.loanId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <Receipt className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {(loan as any).loanAccountNumber || 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">ID: {loan.loanId.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(loan.principalAmount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Total: {formatCurrency(loan.configuration?.totalAmount || 0)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-purple-600">
                            {formatCurrency(accruedInterest)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Paid: {formatCurrency(loan.amountPaid)}</span>
                              <span className="text-gray-600">{paymentProgress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500">
                              Remaining: {formatCurrency(loan.amountRemaining)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="flex items-center gap-1 text-gray-900">
                              <Calendar className="w-3 h-3" />
                              {formatTimestamp(loan.createdAt)}
                            </div>
                            {loan.completedAt && (
                              <div className="text-xs text-green-600 mt-1">
                                Completed: {formatTimestamp(loan.completedAt)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setViewModal({ isOpen: true, loan })}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Loan Details Modal */}
      {viewModal.isOpen && viewModal.loan && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setViewModal({ isOpen: false, loan: null })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {(viewModal.loan as any).loanAccountNumber || viewModal.loan.loanId.substring(0, 12)}
                    </h3>
                    <p className="text-green-100 text-sm">Loan Details & Repayment Schedule</p>
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
              <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Status and Basic Info */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusBadge(viewModal.loan.status).bg} ${getStatusBadge(viewModal.loan.status).text}`}
                  >
                    {viewModal.loan.status.charAt(0).toUpperCase() + viewModal.loan.status.slice(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {viewModal.loan.configuration.tenor.value} {viewModal.loan.configuration.tenor.period} • {viewModal.loan.configuration.frequency}
                  </span>
                </div>

                {/* Loan Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Loan Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Principal</label>
                      <p className="text-gray-900 font-semibold mt-1">{formatCurrency(viewModal.loan.principalAmount)}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Total Amount</label>
                      <p className="text-gray-900 font-semibold mt-1">{formatCurrency(viewModal.loan.configuration?.totalAmount || 0)}</p>
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
                        {viewModal.loan.status === 'completed' ? 100 : Math.round((viewModal.loan.amountPaid / (viewModal.loan.configuration?.totalAmount || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${viewModal.loan.status === 'completed' ? 100 : (viewModal.loan.amountPaid / (viewModal.loan.configuration?.totalAmount || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

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
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Principal</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Interest</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {viewModal.loan.paymentSchedule?.map((payment: any) => (
                          <tr key={payment.installmentNumber} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                              {payment.installmentNumber}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {new Date(payment.dueDate._seconds ? payment.dueDate._seconds * 1000 : payment.dueDate).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(payment.principalAmount)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(payment.interestAmount)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  payment.status === 'paid'
                                    ? 'bg-green-100 text-green-700'
                                    : payment.status === 'overdue'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {payment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Loan Configuration */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Loan Configuration</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Interest Rate</label>
                      <p className="text-gray-900 mt-1">{viewModal.loan.configuration.interestRate}% annual</p>
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
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end">
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
