import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as authService from '../services/auth.service';

interface Financier {
  financierId: string;
  companyName: string;
  email: string;
  status: string;
}

interface AuthContextType {
  financier: Financier | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [financier, setFinancier] = useState<Financier | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated on mount
    const checkAuth = () => {
      const isAuth = authService.isAuthenticated();
      if (isAuth) {
        const financierData = authService.getCurrentFinancier();
        setFinancier(financierData);
        setIsAuthenticated(true);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await authService.login({ email, password });
      const financierData = authService.getCurrentFinancier();
      setFinancier(financierData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setFinancier(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ financier, login, logout, isAuthenticated, loading }}>
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
