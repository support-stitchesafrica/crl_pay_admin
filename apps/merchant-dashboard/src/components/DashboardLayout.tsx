import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Receipt,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  User,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Receipt, label: 'Transactions', path: '/transactions' },
  { icon: Users, label: 'Customers', path: '/customers' },
  { icon: CreditCard, label: 'Active Loans', path: '/loans' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { merchant, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-green-900 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-4 flex items-center justify-between border-b border-green-800">
          {sidebarOpen ? (
            <h1 className="text-xl font-bold">CRL Pay Merchant</h1>
          ) : (
            <h1 className="text-xl font-bold">CP</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-green-800 rounded"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 hover:bg-green-800 transition-colors ${
                  isActive ? 'bg-green-800 border-l-4 border-white' : ''
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="ml-3">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-green-800 p-4">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 hover:bg-green-800 rounded transition-colors"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                {menuItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Profile */}
              <div className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg cursor-pointer">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{merchant?.businessName || 'Merchant'}</p>
                  <p className="text-gray-500 text-xs">{merchant?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
