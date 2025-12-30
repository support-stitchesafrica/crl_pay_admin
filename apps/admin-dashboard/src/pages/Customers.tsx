import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  User,
  Ban,
  Trash2,
  AlertCircle,
  Loader2,
  Award,
  Search,
  Eye,
  Mail,
  Calendar,
  CreditCard,
  X,
  CheckCircle,
} from 'lucide-react';
import * as customerService from '../services/customer.service';
import { Customer } from '../services/types';
import { showToast } from '../utils/toast';
import ConfirmModal from '../components/ConfirmModal';

const ITEMS_PER_PAGE = 10;

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [blacklistModal, setBlacklistModal] = useState<{
    isOpen: boolean;
    customer: Customer | null;
    reason: string;
  }>({
    isOpen: false,
    customer: null,
    reason: '',
  });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    customer: Customer | null;
  }>({
    isOpen: false,
    customer: null,
  });

  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    customer: Customer | null;
  }>({
    isOpen: false,
    customer: null,
  });

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await customerService.getAll();
      setCustomers(data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load customers';
      setError(errorMsg);
      showToast.error(errorMsg);
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter customers by search term
  useEffect(() => {
    let filtered = customers;
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (c) =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.phone.includes(searchTerm)
      );
    }
    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }, [customers, searchTerm]);

  const handleBlacklist = async () => {
    if (!blacklistModal.customer || !blacklistModal.reason.trim()) {
      showToast.warning('Please provide a reason for blacklisting');
      return;
    }

    try {
      setProcessingId(blacklistModal.customer.customerId);
      await customerService.blacklist(blacklistModal.customer.customerId, blacklistModal.reason);
      await loadCustomers();
      showToast.success('Customer blacklisted successfully');
      setBlacklistModal({ isOpen: false, customer: null, reason: '' });
    } catch (err: any) {
      showToast.error(err.response?.data?.message || 'Failed to blacklist customer');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.customer) return;

    try {
      setProcessingId(deleteModal.customer.customerId);
      await customerService.deleteCustomer(deleteModal.customer.customerId);
      setCustomers(customers.filter((c) => c.customerId !== deleteModal.customer!.customerId));
      showToast.success('Customer deleted successfully');
      setDeleteModal({ isOpen: false, customer: null });
    } catch (err: any) {
      showToast.error(err.response?.data?.message || 'Failed to delete customer');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-yellow-100 text-yellow-700',
      blacklisted: 'bg-red-100 text-red-700',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  };

  const getTierBadge = (tier?: string) => {
    if (!tier) return null;
    const styles = {
      bronze: 'bg-orange-100 text-orange-700',
      silver: 'bg-gray-100 text-gray-700',
      gold: 'bg-yellow-100 text-yellow-700',
      platinum: 'bg-purple-100 text-purple-700',
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${styles[tier as keyof typeof styles]}`}
      >
        <Award className="w-3 h-3" />
        {tier.toUpperCase()}
      </span>
    );
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.status === 'active').length,
    suspended: customers.filter((c) => c.status === 'suspended').length,
    blacklisted: customers.filter((c) => c.status === 'blacklisted').length,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Loading customers...</p>
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
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Customers</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={loadCustomers}
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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage all registered customers</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <User className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Suspended</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.suspended}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Blacklisted</p>
                <p className="text-2xl font-bold text-red-600">{stats.blacklisted}</p>
              </div>
              <Ban className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Customers Table */}
        {filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Customers Found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search' : 'No customers registered yet'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loans
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
                  {paginatedCustomers.map((customer) => (
                    <tr key={customer.customerId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {customer.firstName} {customer.lastName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {customer.city}, {customer.state}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{customer.email}</div>
                        <div className="text-xs text-gray-500">{customer.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {customer.creditScore || 0}
                        </div>
                        <div className="mt-1">{getTierBadge(customer.creditTier)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900">Active: {customer.activeLoans}</div>
                          <div className="text-xs text-gray-500">
                            Completed: {customer.completedLoans}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(customer.status)}`}
                        >
                          {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* View button */}
                          <button
                            onClick={() => setViewModal({ isOpen: true, customer })}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Blacklist button */}
                          <button
                            onClick={() =>
                              setBlacklistModal({ isOpen: true, customer, reason: '' })
                            }
                            disabled={
                              processingId === customer.customerId ||
                              customer.status === 'blacklisted'
                            }
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Blacklist Customer"
                          >
                            <Ban className="w-4 h-4" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, customer })}
                            disabled={
                              processingId === customer.customerId || customer.activeLoans > 0
                            }
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title={
                              customer.activeLoans > 0
                                ? 'Cannot delete with active loans'
                                : 'Delete Customer'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)} of{' '}
                  {filteredCustomers.length} customers
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm rounded-lg ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Blacklist Modal */}
      {blacklistModal.isOpen && blacklistModal.customer && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setBlacklistModal({ isOpen: false, customer: null, reason: '' })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 bg-yellow-100">
                <Ban className="w-6 h-6 text-yellow-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">Blacklist Customer?</h3>
              <p className="text-gray-600 mb-4">
                You are about to blacklist{' '}
                <strong>
                  {blacklistModal.customer.firstName} {blacklistModal.customer.lastName}
                </strong>
                . This will prevent them from taking new loans.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for blacklisting <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={blacklistModal.reason}
                  onChange={(e) =>
                    setBlacklistModal({ ...blacklistModal, reason: e.target.value })
                  }
                  placeholder="Enter reason..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  disabled={processingId === blacklistModal.customer.customerId}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setBlacklistModal({ isOpen: false, customer: null, reason: '' })}
                  disabled={processingId === blacklistModal.customer.customerId}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlacklist}
                  disabled={
                    processingId === blacklistModal.customer.customerId ||
                    !blacklistModal.reason.trim()
                  }
                  className="flex-1 px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === blacklistModal.customer.customerId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Blacklisting...</span>
                    </>
                  ) : (
                    'Blacklist Customer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen && !!deleteModal.customer}
        onClose={() => setDeleteModal({ isOpen: false, customer: null })}
        onConfirm={handleDelete}
        title="Delete Customer?"
        message={
          deleteModal.customer
            ? `Are you sure you want to delete ${deleteModal.customer.firstName} ${deleteModal.customer.lastName}? This action cannot be undone.`
            : ''
        }
        confirmText="Yes, Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        loading={processingId === deleteModal.customer?.customerId}
        icon={<Trash2 className="w-6 h-6 text-red-600" />}
      />

      {/* View Details Modal */}
      {viewModal.isOpen && viewModal.customer && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setViewModal({ isOpen: false, customer: null })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {viewModal.customer.firstName} {viewModal.customer.lastName}
                    </h3>
                    <p className="text-blue-100 text-sm">Customer Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewModal({ isOpen: false, customer: null })}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusBadge(viewModal.customer.status)}`}
                  >
                    {viewModal.customer.status.charAt(0).toUpperCase() +
                      viewModal.customer.status.slice(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ID: {viewModal.customer.customerId}
                  </span>
                  {viewModal.customer.creditTier && (
                    <span>{getTierBadge(viewModal.customer.creditTier)}</span>
                  )}
                </div>

                {/* Personal Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-600" />
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">
                        Full Name
                      </label>
                      <p className="text-gray-900 mt-1">
                        {viewModal.customer.firstName} {viewModal.customer.lastName}
                      </p>
                    </div>
                    {(viewModal.customer as any).dateOfBirth && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">
                          Date of Birth
                        </label>
                        <p className="text-gray-900 mt-1">
                          {(viewModal.customer as any).dateOfBirth}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-gray-600" />
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                      <p className="text-gray-900 mt-1">{viewModal.customer.email}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Phone</label>
                      <p className="text-gray-900 mt-1">{viewModal.customer.phone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">
                        Address
                      </label>
                      <p className="text-gray-900 mt-1">
                        {viewModal.customer.city}, {viewModal.customer.state}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Credit Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    Credit Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">
                        Credit Score
                      </label>
                      <p className="text-blue-600 text-lg font-semibold mt-1">
                        {viewModal.customer.creditScore || 0}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">
                        Active Loans
                      </label>
                      <p className="text-orange-600 text-lg font-semibold mt-1">
                        {viewModal.customer.activeLoans}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">
                        Completed Loans
                      </label>
                      <p className="text-green-600 text-lg font-semibold mt-1">
                        {viewModal.customer.completedLoans}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                {(viewModal.customer as any).createdAt && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      Timeline
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">
                          Registered At
                        </label>
                        <p className="text-gray-900 mt-1">
                          {formatTimestamp((viewModal.customer as any).createdAt)}
                        </p>
                      </div>
                      {(viewModal.customer as any).updatedAt && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase">
                            Last Updated
                          </label>
                          <p className="text-gray-900 mt-1">
                            {formatTimestamp((viewModal.customer as any).updatedAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Blacklist Info */}
                {viewModal.customer.status === 'blacklisted' &&
                  (viewModal.customer as any).blacklistReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Blacklist Reason</h4>
                      <p className="text-gray-700 text-sm">
                        {(viewModal.customer as any).blacklistReason}
                      </p>
                    </div>
                  )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end">
                <button
                  onClick={() => setViewModal({ isOpen: false, customer: null })}
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
