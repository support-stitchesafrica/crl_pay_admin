import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { LayoutDashboard, Users, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  return (
    <DashboardLayout>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Merchants</p>
              <p className="text-3xl font-bold">24</p>
            </div>
            <Users className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Approvals</p>
              <p className="text-3xl font-bold">5</p>
            </div>
            <LayoutDashboard className="w-12 h-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Loans</p>
              <p className="text-3xl font-bold">142</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-600" />
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/approvals"
            className="p-4 border rounded hover:bg-gray-50 flex items-center gap-3"
          >
            <Users className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-medium">Merchant Approvals</h3>
              <p className="text-sm text-gray-600">Review pending merchant applications</p>
            </div>
          </Link>

          <Link
            to="/analytics"
            className="p-4 border rounded hover:bg-gray-50 flex items-center gap-3"
          >
            <TrendingUp className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-medium">System Analytics</h3>
              <p className="text-sm text-gray-600">View system-wide performance</p>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
