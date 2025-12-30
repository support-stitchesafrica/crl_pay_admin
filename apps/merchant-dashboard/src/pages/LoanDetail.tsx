import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { getLoan, cancelLoan, updateLoanNotes } from '../services/loan.service';
import { Loan } from '../services/types/loan.types';
import { showToast } from '../utils/toast';

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id) {
      fetchLoan();
    }
  }, [id]);

  const fetchLoan = async () => {
    try {
      setLoading(true);
      const data = await getLoan(id!);
      setLoan(data);
      setNotes(data.notes || '');
    } catch (error: any) {
      showToast.error(error.message || 'Failed to fetch loan');
      navigate('/loans');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!loan) return;

    try {
      setSavingNotes(true);
      await updateLoanNotes(loan.loanId, notes);
      showToast.success('Notes updated successfully');
      setEditingNotes(false);
      fetchLoan();
    } catch (error: any) {
      showToast.error(error.message || 'Failed to update notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelLoan = async () => {
    if (!loan) return;

    if (!confirm('Are you sure you want to cancel this loan? This action cannot be undone.')) {
      return;
    }

    try {
      setCancelling(true);
      await cancelLoan(loan.loanId);
      showToast.success('Loan cancelled successfully');
      fetchLoan();
    } catch (error: any) {
      showToast.error(error.message || 'Failed to cancel loan');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock className="w-4 h-4" /> },
      active: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <TrendingUp className="w-4 h-4" /> },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
      defaulted: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-4 h-4" /> },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <AlertTriangle className="w-4 h-4" /> },
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getPaymentStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-gray-100 text-gray-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      failed: 'bg-orange-100 text-orange-800',
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
    return new Date(dateString).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading loan details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!loan) {
    return null;
  }

  const statusBadge = getStatusBadge(loan.status);
  const progress = (loan.amountPaid / loan.configuration.totalAmount) * 100;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/loans"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Loans
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Loan Details</h1>
            <p className="text-gray-600 mt-1">ID: {loan.loanId}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${statusBadge.bg} ${statusBadge.text}`}>
              {statusBadge.icon}
              {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
            </span>
            {loan.status === 'pending' && (
              <button
                onClick={handleCancelLoan}
                disabled={cancelling}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Loan'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Loan Overview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Loan Overview</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Principal Amount</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(loan.principalAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount (with Interest)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(loan.configuration.totalAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount Paid</p>
                <p className="text-xl font-semibold text-green-600 mt-1">
                  {formatCurrency(loan.amountPaid)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount Remaining</p>
                <p className="text-xl font-semibold text-orange-600 mt-1">
                  {formatCurrency(loan.amountRemaining)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Payment Progress</span>
                <span className="text-sm font-medium text-gray-900">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {loan.currentInstallment} of {loan.configuration.numberOfInstallments} installments paid
              </p>
            </div>
          </div>

          {/* Payment Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Configuration</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 uppercase">Tenor</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {loan.configuration.tenor.value} {loan.configuration.tenor.period}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 uppercase">Frequency</p>
                <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
                  {loan.configuration.frequency.replace('-', ' ')}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 uppercase">Installments</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {loan.configuration.numberOfInstallments}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 uppercase">Interest Rate</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {loan.configuration.interestRate}%
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-blue-600 uppercase font-medium">Installment Amount</p>
                <p className="text-xl font-bold text-blue-900 mt-1">
                  {formatCurrency(loan.configuration.installmentAmount)}
                </p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-xs text-orange-600 uppercase font-medium">Total Interest</p>
                <p className="text-xl font-bold text-orange-900 mt-1">
                  {formatCurrency(loan.configuration.totalInterest)}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-xs text-red-600 uppercase font-medium">Penalty Rate</p>
                <p className="text-xl font-bold text-red-900 mt-1">
                  {loan.configuration.penaltyRate}%
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loan.paymentSchedule.map((payment) => (
                    <tr key={payment.installmentNumber} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {payment.installmentNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(payment.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusBadge(payment.status)}`}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {payment.paidAt ? formatDate(payment.paidAt) : '-'}
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
              <h2 className="text-xl font-semibold text-gray-900">Notes</h2>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add notes about this loan..."
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingNotes ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotes(false);
                      setNotes(loan.notes || '');
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
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
          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600 uppercase">Customer ID</p>
                <p className="text-sm font-medium text-gray-900 mt-1 break-all">
                  {loan.customerId}
                </p>
              </div>
              {loan.orderId && (
                <div>
                  <p className="text-xs text-gray-600 uppercase">Order ID</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{loan.orderId}</p>
                </div>
              )}
              {loan.productDescription && (
                <div>
                  <p className="text-xs text-gray-600 uppercase">Product</p>
                  <p className="text-sm text-gray-900 mt-1">{loan.productDescription}</p>
                </div>
              )}
            </div>
          </div>

          {/* Card Authorization */}
          {loan.cardAuthorization && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {loan.cardAuthorization.cardType} •••• {loan.cardAuthorization.last4}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Bank</p>
                  <p className="text-sm text-gray-900 mt-1">{loan.cardAuthorization.bank}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Expiry</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {loan.cardAuthorization.expiryMonth}/{loan.cardAuthorization.expiryYear}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-600">{formatDateTime(loan.createdAt)}</p>
                </div>
              </div>
              {loan.activatedAt && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Activated</p>
                    <p className="text-xs text-gray-600">{formatDateTime(loan.activatedAt)}</p>
                  </div>
                </div>
              )}
              {loan.firstPaymentDate && (
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">First Payment</p>
                    <p className="text-xs text-gray-600">{formatDate(loan.firstPaymentDate)}</p>
                  </div>
                </div>
              )}
              {loan.lastPaymentDate && (
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last Payment</p>
                    <p className="text-xs text-gray-600">{formatDateTime(loan.lastPaymentDate)}</p>
                  </div>
                </div>
              )}
              {loan.completedAt && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Completed</p>
                    <p className="text-xs text-gray-600">{formatDateTime(loan.completedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
