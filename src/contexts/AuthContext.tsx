
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authenticateUser, isPodioConfigured } from '../services/podioApi';
import { useToast } from '@/components/ui/use-toast';

interface ContactData {
  id: number;
  name: string;
  email: string;
  username: string;
  logoUrl?: string;
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
  const { toast } = useToast();

  useEffect(() => {
    // Only try to restore the session if Podio is configured
    const podioConfigured = isPodioConfigured();
    if (!podioConfigured) {
      setLoading(false);
      return;
    }

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
    
    // Verify Podio is configured before attempting login
    if (!isPodioConfigured()) {
      setError('Podio API is not configured. Please set up Podio API first.');
      setLoading(false);
      toast({
        title: 'Podio Not Configured',
        description: 'Please set up Podio API credentials before logging in',
        variant: 'destructive',
      });
      return false;
    }
    
    try {
      const userData = await authenticateUser({ username, password });
      
      if (userData) {
        setUser(userData);
        localStorage.setItem('nzhg_user', JSON.stringify(userData));
        setLoading(false);
        return true;
      } else {
        setError('No matching contact found with these credentials');
        setLoading(false);
        return false;
      }
    } catch (err) {
      setError('An error occurred during login. Please verify Podio connection and try again.');
      console.error('Login error:', err);
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
