import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { LayoutDashboard, Users, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import * as dashboardService from '../services/dashboard.service';
import { DashboardStats } from '../services/types';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard statistics');
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

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
            <h3 className="font-semibold text-red-900">Error Loading Dashboard</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Merchants</p>
              <p className="text-3xl font-bold">{stats?.totalMerchants || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.activeMerchants || 0} active
              </p>
            </div>
            <Users className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Approvals</p>
              <p className="text-3xl font-bold">{stats?.pendingApprovals || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                Requires review
              </p>
            </div>
            <LayoutDashboard className="w-12 h-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-center">
            <div>
              <p className="text-sm text-gray-600">Active Loans</p>
              <p className="text-3xl font-bold">{stats?.activeLoans || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                Coming in Week 3
              </p>
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
            className="p-4 border rounded hover:bg-gray-50 flex items-center gap-3 transition-colors"
          >
            <Users className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-medium">Merchant Approvals</h3>
              <p className="text-sm text-gray-600">
                Review {stats?.pendingApprovals || 0} pending merchant applications
              </p>
            </div>
          </Link>

          <Link
            to="/analytics"
            className="p-4 border rounded hover:bg-gray-50 flex items-center gap-3 transition-colors"
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
