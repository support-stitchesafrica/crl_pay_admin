import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { User, Ban, Trash2, AlertCircle, Loader2, Award } from 'lucide-react';
import * as customerService from '../services/customer.service';
import { Customer } from '../services/types';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await customerService.getAll();
      setCustomers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load customers');
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleBlacklist = async (customerId: string, currentStatus: string) => {
    if (currentStatus === 'blacklisted') {
      alert('Customer is already blacklisted');
      return;
    }

    const reason = prompt('Please provide a reason for blacklisting this customer:');
    if (!reason) return;

    if (!confirm('Are you sure you want to blacklist this customer?')) return;

    try {
      setProcessingId(customerId);
      await customerService.blacklist(customerId, reason);
      // Refresh list
      await loadCustomers();
      alert('Customer blacklisted successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to blacklist customer');
      console.error('Error blacklisting customer:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (customerId: string, activeLoans: number) => {
    if (activeLoans > 0) {
      alert('Cannot delete customer with active loans');
      return;
    }

    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return;

    try {
      setProcessingId(customerId);
      await customerService.deleteCustomer(customerId);
      // Remove from list
      setCustomers(customers.filter((c) => c.customerId !== customerId));
      alert('Customer deleted successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete customer');
      console.error('Error deleting customer:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      blacklisted: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getTierBadge = (tier?: string) => {
    if (!tier) return null;
    const styles = {
      bronze: 'bg-orange-100 text-orange-800',
      silver: 'bg-gray-100 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[tier as keyof typeof styles]} flex items-center gap-1`}>
        <Award className="w-3 h-3" />
        {tier.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Customers</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">All Customers ({customers.length})</h2>
        </div>

        {customers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No customers registered yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loans</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.customerId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {customer.city}, {customer.state}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.email}</div>
                      <div className="text-xs text-gray-500">{customer.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        Score: {customer.creditScore || 0}
                      </div>
                      <div className="mt-1">{getTierBadge(customer.creditTier)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Active: {customer.activeLoans}
                      </div>
                      <div className="text-xs text-gray-500">
                        Completed: {customer.completedLoans}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(customer.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBlacklist(customer.customerId, customer.status)}
                          disabled={processingId === customer.customerId || customer.status === 'blacklisted'}
                          className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Blacklist customer"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.customerId, customer.activeLoans)}
                          disabled={processingId === customer.customerId || customer.activeLoans > 0}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={customer.activeLoans > 0 ? 'Cannot delete with active loans' : 'Delete customer'}
                        >
                          {processingId === customer.customerId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
