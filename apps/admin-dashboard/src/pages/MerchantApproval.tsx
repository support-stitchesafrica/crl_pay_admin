import DashboardLayout from '../components/DashboardLayout';
import { Check, X } from 'lucide-react';

const mockMerchants = [
  {
    id: '1',
    businessName: 'Acme Electronics',
    email: 'contact@acme.com',
    phone: '+2348012345678',
    appliedDate: '2025-12-20',
  },
  {
    id: '2',
    businessName: 'Fashion Hub Nigeria',
    email: 'info@fashionhub.ng',
    phone: '+2348087654321',
    appliedDate: '2025-12-22',
  },
];

export default function MerchantApproval() {
  const handleApprove = (merchantId: string) => {
    console.log('Approving merchant:', merchantId);
    alert('Merchant approved!');
  };

  const handleReject = (merchantId: string) => {
    console.log('Rejecting merchant:', merchantId);
    alert('Merchant rejected');
  };

  return (
    <DashboardLayout>
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Pending Approvals ({mockMerchants.length})</h2>
        </div>

        <div className="divide-y">
          {mockMerchants.map((merchant) => (
            <div key={merchant.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{merchant.businessName}</h3>
                  <p className="text-sm text-gray-600">{merchant.email}</p>
                  <p className="text-sm text-gray-600">{merchant.phone}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Applied: {new Date(merchant.appliedDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(merchant.id)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded flex items-center gap-1"
                  >
                    <Check className="w-5 h-5" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleReject(merchant.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded flex items-center gap-1"
                  >
                    <X className="w-5 h-5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
