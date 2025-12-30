import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { CreditCard, AlertCircle, Loader2, Search, Filter } from 'lucide-react';
import * as financierService from '../services/financier.service';
import { Loan } from '../services/types';
import { showToast } from '../utils/toast';

export default function Loans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadLoans();
  }, []);

  useEffect(() => {
    filterLoans();
  }, [searchTerm, statusFilter, loans]);

  const loadLoans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await financierService.getLoans();
      setLoans(data);
      setFilteredLoans(data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load loans';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const filterLoans = () => {
    let filtered = loans;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((loan) => loan.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (loan) =>
          loan.loanId.toLowerCase().includes(term) ||
          loan.customerId.toLowerCase().includes(term) ||
          loan.merchantId.toLowerCase().includes(term)
      );
    }

    setFilteredLoans(filtered);
  };

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  const formatTimestamp = (timestamp: string | { _seconds: number; _nanoseconds: number }) => {
    if (typeof timestamp === 'object' && '_seconds' in timestamp) {
      return new Date(timestamp._seconds * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      active: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      defaulted: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading loans...</p>
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
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Loans</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={loadLoans} className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline">
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
          <h1 className="text-2xl font-bold text-gray-900">Loans</h1>
          <p className="text-gray-600">Track all loans using your financing plans</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Loans</p>
            <p className="text-2xl font-bold text-gray-900">{loans.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Active</p>
            <p className="text-2xl font-bold text-blue-600">{loans.filter((l) => l.status === 'active').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-600">{loans.filter((l) => l.status === 'completed').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Defaulted</p>
            <p className="text-2xl font-bold text-red-600">{loans.filter((l) => l.status === 'defaulted').length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by loan ID, customer, or merchant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
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
          <p className="text-sm text-gray-600 mt-3">
            Showing {filteredLoans.length} of {loans.length} loans
          </p>
        </div>

        {/* Loans Table */}
        {filteredLoans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Loans Found</h3>
            <p className="text-gray-600">
              {loans.length === 0
                ? 'No loans have been created using your plans yet'
                : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Loan ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Principal</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Paid</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Remaining</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoans.map((loan) => (
                    <tr key={loan.loanId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900 font-mono">{loan.loanId.slice(0, 10)}...</td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(loan.principalAmount)}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(loan.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-green-600 font-medium">
                        {formatCurrency(loan.amountPaid)}
                      </td>
                      <td className="py-3 px-4 text-sm text-orange-600 font-medium">
                        {formatCurrency(loan.amountRemaining)}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(loan.status)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatTimestamp(loan.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
