
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
        const userData = JSON.parse(savedUser);
        setUser(userData);
        
        // Also store user info in a consistent location for components to access
        localStorage.setItem('user_info', JSON.stringify(userData));
      } catch (e) {
        localStorage.removeItem('nzhg_user');
        localStorage.removeItem('user_info');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    // Verify Podio is configured before attempting login
    if (!isPodioConfigured()) {
      const errorMsg = 'Podio API is not configured. Please set up Podio API first.';
      setError(errorMsg);
      setLoading(false);
      toast({
        title: 'Podio Not Configured',
        description: 'Please set up Podio API credentials before logging in',
        variant: 'destructive',
      });
      console.error(errorMsg);
      return false;
    }
    
    try {
      console.log('Login attempt for:', username);
      const userData = await authenticateUser({ username, password });
      
      if (userData) {
        console.log('Authentication successful, user data:', userData);
        setUser(userData);
        
        // Store in both locations for consistency
        localStorage.setItem('nzhg_user', JSON.stringify(userData));
        localStorage.setItem('user_info', JSON.stringify(userData));
        
        setLoading(false);
        return true;
      } else {
        const errorMsg = 'No matching contact found with these credentials in Podio';
        setError(errorMsg);
        setLoading(false);
        console.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error 
        ? `Login error: ${err.message}` 
        : 'An unknown error occurred during login';
      
      console.error(errorMsg, err);
      setError(errorMsg);
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nzhg_user');
    localStorage.removeItem('user_info');
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
