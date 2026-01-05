import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { customerLookupService, CustomerLoan } from '../services/customer-lookup.service';

export default function CustomerLookup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loans, setLoans] = useState<CustomerLoan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setSearched(true);
    try {
      const customerLoans = await customerLookupService.getCustomerLoansByEmail(email);
      setLoans(customerLoans);
      
      if (customerLoans.length === 0) {
        toast.success('No loans found for this customer');
      } else {
        toast.success(`Found ${customerLoans.length} loan(s)`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch customer loans');
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'defaulted':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Loan Lookup</h1>
          <p className="text-gray-600 mt-1">Search for customer loans by email address</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Results */}
        {searched && (
          <div className="space-y-4">
            {loans.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No loans found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  This customer doesn't have any loans with your store yet.
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Found {loans.length} loan(s) for {email}
                  </h2>
                </div>

                <div className="grid gap-4">
                  {loans.map((loan) => (
                    <div
                      key={loan.loanId}
                      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {loan.loanAccountNumber}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Created {new Date(loan.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                            {loan.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">Principal</p>
                            <p className="text-lg font-semibold">
                              ₦{loan.principalAmount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Total Amount</p>
                            <p className="text-lg font-semibold">
                              ₦{loan.configuration.totalAmount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Amount Paid</p>
                            <p className="text-lg font-semibold text-green-600">
                              ₦{loan.amountPaid.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Remaining</p>
                            <p className="text-lg font-semibold text-orange-600">
                              ₦{loan.amountRemaining.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                          <span>
                            Frequency: <span className="font-medium capitalize">{loan.configuration.frequency}</span>
                          </span>
                          <span>•</span>
                          <span>
                            Tenor: <span className="font-medium">{loan.configuration.tenor.value} {loan.configuration.tenor.period.toLowerCase()}</span>
                          </span>
                          <span>•</span>
                          <span>
                            Interest: <span className="font-medium">{loan.configuration.interestRate}%</span>
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/loans/${loan.loanId}`)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            View Details
                          </button>
                          {loan.status === 'active' && loan.amountRemaining > 0 && (
                            <button
                              onClick={() => navigate(`/loans/${loan.loanId}/liquidate`)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                            >
                              Liquidate Loan
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
