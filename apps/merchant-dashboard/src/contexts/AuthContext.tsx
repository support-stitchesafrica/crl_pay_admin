import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  merchant: any | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<any | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('merchant_token');
    const merchantData = localStorage.getItem('merchant_data');

    if (token && merchantData) {
      setMerchant(JSON.parse(merchantData));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Simulated login - replace with actual API call
    const mockMerchant = { email, businessName: 'Sample Merchant Store' };
    const mockToken = 'mock-jwt-token';

    localStorage.setItem('merchant_token', mockToken);
    localStorage.setItem('merchant_data', JSON.stringify(mockMerchant));

    setMerchant(mockMerchant);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('merchant_token');
    localStorage.removeItem('merchant_data');
    setMerchant(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ merchant, login, logout, isAuthenticated }}>
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
