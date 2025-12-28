import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as authService from '../services/auth.service';

interface Merchant {
  merchantId: string;
  businessName: string;
  email: string;
  phone: string;
  status: string;
  businessCategory?: string;
  apiKey?: string;
}

interface AuthContextType {
  merchant: Merchant | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated on mount
    const checkAuth = () => {
      const isAuth = authService.isAuthenticated();
      if (isAuth) {
        const merchantData = authService.getCurrentMerchant();
        setMerchant(merchantData);
        setIsAuthenticated(true);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });

      if (response.success) {
        const merchantData = authService.getCurrentMerchant();
        setMerchant(merchantData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setMerchant(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ merchant, login, logout, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
