import { ReactNode } from 'react';
import { Shield, Users, BarChart3, Settings } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 overflow-y-auto bg-white">
        <div className="min-h-full flex items-center justify-center p-8">
          <div className="w-full max-w-md py-8">
            {children}
          </div>
        </div>
      </div>

      {/* Right Side - Background */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-12 items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-white max-w-lg">
          <div className="mb-8">
            <Shield className="w-16 h-16 mb-6 opacity-90" />
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Admin Dashboard
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              Manage your BNPL platform with powerful admin tools. Monitor merchants, approve applications, and oversee all operations.
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-4 mt-12">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Merchant Management</h3>
                <p className="text-gray-300 text-sm">Approve and manage merchant applications efficiently</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Analytics & Reporting</h3>
                <p className="text-gray-300 text-sm">Track platform performance and generate insights</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Platform Control</h3>
                <p className="text-gray-300 text-sm">Configure settings and manage system-wide operations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
