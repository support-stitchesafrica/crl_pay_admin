import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  admin: any | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<any | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const adminData = localStorage.getItem('admin_data');

    if (token && adminData) {
      setAdmin(JSON.parse(adminData));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Simulated login - replace with actual API call
    const mockAdmin = { email, name: 'Admin User' };
    const mockToken = 'mock-jwt-token';

    localStorage.setItem('admin_token', mockToken);
    localStorage.setItem('admin_data', JSON.stringify(mockAdmin));

    setAdmin(mockAdmin);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    setAdmin(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, isAuthenticated }}>
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
