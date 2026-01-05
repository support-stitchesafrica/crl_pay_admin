import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import FinancingPlans from './pages/FinancingPlans';
import Transactions from './pages/Transactions';
import Customers from './pages/Customers';
import Loans from './pages/Loans';
import LoanDetail from './pages/LoanDetail';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import CustomerLookup from './pages/CustomerLookup';
import LoanLiquidation from './pages/LoanLiquidation';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
              path="/financing-plans"
              element={
                <ProtectedRoute>
                  <FinancingPlans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <Transactions />
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
              path="/loans/:id"
              element={
                <ProtectedRoute>
                  <LoanDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loans/:id/liquidate"
              element={
                <ProtectedRoute>
                  <LoanLiquidation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer-lookup"
              element={
                <ProtectedRoute>
                  <CustomerLookup />
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
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
