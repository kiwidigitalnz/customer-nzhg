
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authenticateUser } from '../services/podioApi';

interface ContactData {
  id: number;
  name: string;
  email: string;
  username: string;
}

interface AuthContextType {
  user: ContactData | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for saved user session
    const savedUser = localStorage.getItem('nzhg_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('nzhg_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const userData = await authenticateUser({ username, password });
      
      if (userData) {
        setUser(userData);
        localStorage.setItem('nzhg_user', JSON.stringify(userData));
        setLoading(false);
        return true;
      } else {
        setError('Invalid username or password');
        setLoading(false);
        return false;
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nzhg_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
