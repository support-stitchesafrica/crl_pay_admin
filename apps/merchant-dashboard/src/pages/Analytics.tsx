import DashboardLayout from '../components/DashboardLayout';
import { BarChart3 } from 'lucide-react';

export default function Analytics() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">View business insights and reports</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Business Analytics</h3>
          <p className="text-gray-600 mb-4">
            Track your BNPL performance, loan statistics, and revenue insights.
          </p>
          <p className="text-sm text-gray-500">
            This feature is coming soon.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
