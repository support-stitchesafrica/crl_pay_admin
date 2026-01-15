import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  Receipt,
  Loader2,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  X,
  Filter,
} from 'lucide-react';
import * as transactionsService from '../services/transactions.service';
import { Transaction } from '../services/transactions.service';
import { showToast } from '../utils/toast';

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [requeryingId, setRequeryingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
    setCurrentPage(1); // Reset to first page when filters change
  }, [transactions, searchTerm, typeFilter, statusFilter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await transactionsService.getAllTransactions();
      setTransactions(data);
    } catch (err: any) {
      showToast.error(err.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (txn) =>
          txn.transactionId.toLowerCase().includes(term) ||
          txn.reference?.toLowerCase().includes(term) ||
          txn.merchantId?.toLowerCase().includes(term) ||
          txn.loanId?.toLowerCase().includes(term)
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((txn) => txn.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((txn) => txn.status === statusFilter);
    }

    setFilteredTransactions(filtered);
  };

  const handleRequery = async (transactionId: string) => {
    try {
      setRequeryingId(transactionId);
      const result = await transactionsService.requeryTransaction(transactionId);
      
      if (result.updated) {
        showToast.success('Transaction status updated successfully');
        loadTransactions();
      } else {
        showToast.info('Transaction status is up to date');
      }
    } catch (err: any) {
      showToast.error(err.response?.data?.message || 'Failed to requery transaction');
    } finally {
      setRequeryingId(null);
    }
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  const formatTimestamp = (timestamp: string | { _seconds: number; _nanoseconds: number }) => {
    if (typeof timestamp === 'object' && '_seconds' in timestamp) {
      return new Date(timestamp._seconds * 1000).toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      success: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
    };
    const icons = {
      success: <CheckCircle className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />,
      failed: <XCircle className="w-3 h-3" />,
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      LOAN_CREATED: 'bg-blue-100 text-blue-700',
      DISBURSEMENT_SUCCESS: 'bg-green-100 text-green-700',
      DISBURSEMENT_FAILED: 'bg-red-100 text-red-700',
      REPAYMENT_SUCCESS: 'bg-purple-100 text-purple-700',
      ALLOCATION_RESERVED: 'bg-orange-100 text-orange-700',
      ALLOCATION_RELEASED: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
        {type.replace(/_/g, ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading transactions...</p>
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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-7 h-7" />
              Transactions
            </h1>
            <p className="text-gray-600">Monitor all system transactions and payment flows</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Successful</p>
            <p className="text-2xl font-bold text-green-600">
              {transactions.filter((t) => t.status === 'success').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {transactions.filter((t) => t.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-600">
              {transactions.filter((t) => t.status === 'failed').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by ID, reference, merchant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="LOAN_CREATED">Loan Created</option>
                <option value="DISBURSEMENT_SUCCESS">Disbursement Success</option>
                <option value="DISBURSEMENT_FAILED">Disbursement Failed</option>
                <option value="REPAYMENT_SUCCESS">Repayment Success</option>
                <option value="ALLOCATION_RESERVED">Allocation Reserved</option>
                <option value="ALLOCATION_RELEASED">Allocation Released</option>
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No transactions found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Transaction ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Provider</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map((txn) => (
                    <tr key={txn.transactionId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900 font-mono">
                        {txn.transactionId.slice(0, 12)}...
                      </td>
                      <td className="py-3 px-4">{getTypeBadge(txn.type)}</td>
                      <td className="py-3 px-4">{getStatusBadge(txn.status)}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(txn.amount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 capitalize">{txn.provider}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatTimestamp(txn.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(txn)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {txn.providerReference && (
                            <button
                              onClick={() => handleRequery(txn.transactionId)}
                              disabled={requeryingId === txn.transactionId}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Requery Transaction"
                            >
                              {requeryingId === txn.transactionId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, filteredTransactions.length)}</span> of{' '}
                  <span className="font-medium">{filteredTransactions.length}</span> transactions
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 text-sm font-medium rounded-md ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {showDetailModal && selectedTransaction && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowDetailModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 my-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Transaction Details</h3>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Transaction ID</p>
                    <p className="text-sm font-mono font-semibold text-gray-900">{selectedTransaction.transactionId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Reference</p>
                    <p className="text-sm font-mono font-semibold text-gray-900">{selectedTransaction.reference}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Type</p>
                    {getTypeBadge(selectedTransaction.type)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    {getStatusBadge(selectedTransaction.status)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Amount</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedTransaction.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Provider</p>
                    <p className="text-sm font-semibold text-gray-900 capitalize">{selectedTransaction.provider}</p>
                  </div>
                </div>

                {/* Related Entities */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Related Entities</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedTransaction.merchantId && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Merchant ID</p>
                        <p className="text-sm font-mono text-gray-900">{selectedTransaction.merchantId}</p>
                      </div>
                    )}
                    {selectedTransaction.loanId && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Loan ID</p>
                        <p className="text-sm font-mono text-gray-900">{selectedTransaction.loanId}</p>
                      </div>
                    )}
                    {selectedTransaction.financierId && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Financier ID</p>
                        <p className="text-sm font-mono text-gray-900">{selectedTransaction.financierId}</p>
                      </div>
                    )}
                    {selectedTransaction.planId && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Plan ID</p>
                        <p className="text-sm font-mono text-gray-900">{selectedTransaction.planId}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Provider Info */}
                {selectedTransaction.providerReference && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Provider Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Provider Reference</p>
                        <p className="text-sm font-mono text-gray-900">{selectedTransaction.providerReference}</p>
                      </div>
                      {selectedTransaction.integrationId && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Integration ID</p>
                          <p className="text-sm font-mono text-gray-900">{selectedTransaction.integrationId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Timestamps</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Created At</p>
                      <p className="text-sm text-gray-900">{formatTimestamp(selectedTransaction.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Updated At</p>
                      <p className="text-sm text-gray-900">{formatTimestamp(selectedTransaction.updatedAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                {selectedTransaction.metadata && Object.keys(selectedTransaction.metadata).length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Metadata</h4>
                    <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedTransaction.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {selectedTransaction.providerReference && (
                  <button
                    onClick={() => {
                      handleRequery(selectedTransaction.transactionId);
                      setShowDetailModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Requery Transaction
                  </button>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
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
