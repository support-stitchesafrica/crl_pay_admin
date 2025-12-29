import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  DollarSign,
  User,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Edit2,
  Save,
  X,
  ShoppingCart,
} from 'lucide-react';
import { getLoan, updateLoanStatus, updateLoanNotes } from '../services/loan.service';
import { Loan } from '../services/types/loan.types';
import { showToast } from '../utils/toast';

export default function LoanDetail() {
  const { loanId } = useParams<{ loanId: string }>();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  useEffect(() => {
    if (loanId) {
      fetchLoan();
    }
  }, [loanId]);

  const fetchLoan = async () => {
    try {
      setLoading(true);
      const loanData = await getLoan(loanId!);
      setLoan(loanData);
      setNotes(loanData.notes || '');
    } catch (error: any) {
      showToast.error(error.message || 'Failed to fetch loan details');
      navigate('/loans');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      const updatedLoan = await updateLoanNotes(loanId!, notes);
      setLoan(updatedLoan);
      setEditingNotes(false);
      showToast.success('Notes updated successfully');
    } catch (error: any) {
      showToast.error(error.message || 'Failed to update notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) {
      showToast.error('Please select a status');
      return;
    }

    try {
      setUpdatingStatus(true);
      const updatedLoan = await updateLoanStatus(loanId!, newStatus, statusNotes);
      setLoan(updatedLoan);
      setShowStatusModal(false);
      setNewStatus('');
      setStatusNotes('');
      showToast.success('Loan status updated successfully');
    } catch (error: any) {
      showToast.error(error.message || 'Failed to update loan status');
    } finally {
      setUpdatingStatus(false);
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

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="w-5 h-5" />,
      active: <TrendingUp className="w-5 h-5" />,
      completed: <CheckCircle className="w-5 h-5" />,
      defaulted: <XCircle className="w-5 h-5" />,
      cancelled: <AlertTriangle className="w-5 h-5" />,
    };
    return icons[status as keyof typeof icons] || <Clock className="w-5 h-5" />;
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading loan details...</p>
        </div>
      </div>
    );
  }

  if (!loan) {
    return null;
  }

  const progressPercentage = (loan.amountPaid / loan.configuration.totalAmount) * 100;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/loans" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Loans
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Loan Details</h1>
            <p className="text-gray-600 mt-1">Loan ID: {loan.loanId}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusBadge(loan.status)}`}
            >
              {getStatusIcon(loan.status)}
              {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
            </span>
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update Status
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Loan Overview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Loan Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Principal Amount</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(loan.principalAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(loan.configuration.totalAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount Paid</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(loan.amountPaid)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount Remaining</p>
                <p className="text-lg font-semibold text-orange-600">
                  {formatCurrency(loan.amountRemaining)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Payment Progress</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Payment Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Configuration</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Tenor</p>
                <p className="text-base font-medium text-gray-900">
                  {loan.configuration.tenor.value} {loan.configuration.tenor.period}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Frequency</p>
                <p className="text-base font-medium text-gray-900 capitalize">
                  {loan.configuration.frequency.replace('-', ' ')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Installments</p>
                <p className="text-base font-medium text-gray-900">
                  {loan.configuration.numberOfInstallments}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Interest Rate</p>
                <p className="text-base font-medium text-gray-900">
                  {loan.configuration.interestRate}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Penalty Rate</p>
                <p className="text-base font-medium text-gray-900">
                  {loan.configuration.penaltyRate}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Installment Amount</p>
                <p className="text-base font-medium text-gray-900">
                  {formatCurrency(loan.configuration.installmentAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Interest</p>
                <p className="text-base font-medium text-gray-900">
                  {formatCurrency(loan.configuration.totalInterest)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Schedule</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Principal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Interest
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Paid At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loan.paymentSchedule.map((payment) => (
                    <tr key={payment.installmentNumber} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {payment.installmentNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(payment.dueDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatCurrency(payment.principalAmount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatCurrency(payment.interestAmount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusBadge(payment.status)}`}
                        >
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {payment.paidAt ? formatDateTime(payment.paidAt) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Admin Notes</h2>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>

            {editingNotes ? (
              <div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Add notes about this loan..."
                />
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {savingNotes ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotes(false);
                      setNotes(loan.notes || '');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">
                {loan.notes || 'No notes added yet.'}
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Merchant Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Merchant Information</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Merchant ID</p>
                  <p className="text-sm font-medium text-gray-900 break-all">
                    {loan.merchantId}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Customer ID</p>
                  <p className="text-sm font-medium text-gray-900 break-all">{loan.customerId}</p>
                </div>
              </div>
              {loan.orderId && (
                <div className="flex items-start gap-2">
                  <ShoppingCart className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Order ID</p>
                    <p className="text-sm font-medium text-gray-900">{loan.orderId}</p>
                  </div>
                </div>
              )}
              {loan.productDescription && (
                <div className="flex items-start gap-2">
                  <ShoppingCart className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Product</p>
                    <p className="text-sm font-medium text-gray-900">{loan.productDescription}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card Authorization */}
          {loan.cardAuthorization && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Authorization</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <CreditCard className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Card</p>
                    <p className="text-sm font-medium text-gray-900">
                      {loan.cardAuthorization.cardType} •••• {loan.cardAuthorization.last4}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Bank</p>
                    <p className="text-sm font-medium text-gray-900">{loan.cardAuthorization.bank}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Expires</p>
                    <p className="text-sm font-medium text-gray-900">
                      {loan.cardAuthorization.expiryMonth}/{loan.cardAuthorization.expiryYear}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-600">{formatDateTime(loan.createdAt)}</p>
                </div>
              </div>
              {loan.activatedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Activated</p>
                    <p className="text-xs text-gray-600">{formatDateTime(loan.activatedAt)}</p>
                  </div>
                </div>
              )}
              {loan.firstPaymentDate && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">First Payment</p>
                    <p className="text-xs text-gray-600">{formatDateTime(loan.firstPaymentDate)}</p>
                  </div>
                </div>
              )}
              {loan.lastPaymentDate && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last Payment</p>
                    <p className="text-xs text-gray-600">{formatDateTime(loan.lastPaymentDate)}</p>
                  </div>
                </div>
              )}
              {loan.completedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Completed</p>
                    <p className="text-xs text-gray-600">{formatDateTime(loan.completedAt)}</p>
                  </div>
                </div>
              )}
              {loan.defaultedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Defaulted</p>
                    <p className="text-xs text-gray-600">{formatDateTime(loan.defaultedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Overdue Information */}
          {loan.daysOverdue && loan.daysOverdue > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-4">Overdue Information</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-red-600">Days Overdue</p>
                  <p className="text-xl font-bold text-red-900">{loan.daysOverdue} days</p>
                </div>
                {loan.overdueAmount && (
                  <div>
                    <p className="text-sm text-red-600">Overdue Amount</p>
                    <p className="text-xl font-bold text-red-900">
                      {formatCurrency(loan.overdueAmount)}
                    </p>
                  </div>
                )}
                {loan.lateFees && (
                  <div>
                    <p className="text-sm text-red-600">Late Fees</p>
                    <p className="text-xl font-bold text-red-900">
                      {formatCurrency(loan.lateFees)}
                    </p>
                  </div>
                )}
                {loan.escalationLevel && (
                  <div>
                    <p className="text-sm text-red-600">Escalation Level</p>
                    <p className="text-base font-medium text-red-900 uppercase">
                      {loan.escalationLevel}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Loan Status</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select status...</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="defaulted">Defaulted</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Add reason for status change..."
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleUpdateStatus}
                disabled={updatingStatus || !newStatus}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {updatingStatus ? 'Updating...' : 'Update Status'}
              </button>
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setNewStatus('');
                  setStatusNotes('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
