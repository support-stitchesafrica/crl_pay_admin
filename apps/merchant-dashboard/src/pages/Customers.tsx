import DashboardLayout from '../components/DashboardLayout';
import { Users } from 'lucide-react';

export default function Customers() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your customer base</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Management</h3>
          <p className="text-gray-600 mb-4">
            View and manage all customers who have used BNPL services at your business.
          </p>
          <p className="text-sm text-gray-500">
            This feature is coming soon.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
