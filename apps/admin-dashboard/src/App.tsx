import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Merchants from './pages/Merchants';
import Customers from './pages/Customers';
import Loans from './pages/Loans';
import LoanDetail from './pages/LoanDetail';
import Financiers from './pages/Financiers';
import FinancingPlans from './pages/FinancingPlans';
import PlanMerchantMapping from './pages/PlanMerchantMapping';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import Integrations from './pages/Integrations';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/merchants"
              element={
                <ProtectedRoute>
                  <Merchants />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <Customers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loans"
              element={
                <ProtectedRoute>
                  <Loans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loans/:loanId"
              element={
                <ProtectedRoute>
                  <LoanDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/integrations"
              element={
                <ProtectedRoute>
                  <Integrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financiers"
              element={
                <ProtectedRoute>
                  <Financiers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financing-plans"
              element={
                <ProtectedRoute>
                  <FinancingPlans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plan-mappings"
              element={
                <ProtectedRoute>
                  <PlanMerchantMapping />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
