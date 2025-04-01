
import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { authenticateUser, authenticateWithContactsAppToken, authenticateWithPackingSpecAppToken, isRateLimited } from '../services/podioAuth';
import { useToast } from '@/hooks/use-toast';

// Session duration (4 hours)
const SESSION_DURATION = 4 * 60 * 60 * 1000;

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
  checkSession: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAuthAttempt, setLastAuthAttempt] = useState(0);
  const { toast } = useToast();

  // Check session validity
  const isSessionValid = (): boolean => {
    const sessionExpiry = localStorage.getItem('nzhg_session_expiry');
    if (!sessionExpiry) return false;
    
    return parseInt(sessionExpiry, 10) > Date.now();
  };

  // Extend session
  const extendSession = (): void => {
    const expiry = Date.now() + SESSION_DURATION;
    localStorage.setItem('nzhg_session_expiry', expiry.toString());
  };

  // Pre-authenticate with apps - with rate limit and dedupe protection
  const preAuthenticateApps = useCallback(async () => {
    // Skip if rate limited or authenticated recently
    if (isRateLimited() || Date.now() - lastAuthAttempt < 60000) {
      return;
    }
    
    setLastAuthAttempt(Date.now());
    
    try {
      // Try authenticating with both apps, but don't block on failures
      await Promise.allSettled([
        authenticateWithContactsAppToken(),
        authenticateWithPackingSpecAppToken()
      ]);
    } catch (error) {
      console.warn('Error during pre-authentication:', error);
    }
  }, [lastAuthAttempt]);

  useEffect(() => {
    // Check for saved user session
    const savedUser = localStorage.getItem('nzhg_user');
    if (savedUser && isSessionValid()) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        localStorage.setItem('user_info', JSON.stringify(userData));
        extendSession();
        
        // Pre-authenticate, but don't block loading
        preAuthenticateApps();
      } catch (e) {
        // Invalid stored data
        localStorage.removeItem('nzhg_user');
        localStorage.removeItem('user_info');
        localStorage.removeItem('nzhg_session_expiry');
      }
    } else if (savedUser && !isSessionValid()) {
      // Session expired
      localStorage.removeItem('nzhg_user');
      localStorage.removeItem('user_info');
      localStorage.removeItem('nzhg_session_expiry');
      
      toast({
        title: 'Session Expired',
        description: 'Your session has expired. Please log in again.',
      });
    }
    
    setLoading(false);
    
    // Set up periodic session checks
    const interval = setInterval(() => {
      if (user && !isSessionValid()) {
        logout();
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please log in again.',
        });
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [toast, user, preAuthenticateApps]);

  const checkSession = (): boolean => {
    return isSessionValid() && !!user;
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Set auth attempt timestamp to prevent duplicates
      setLastAuthAttempt(Date.now());
      
      // Try to authenticate with Contacts app token (contacts app needs to be authenticated first)
      const contactsAppAuthSuccess = await authenticateWithContactsAppToken();
      
      if (!contactsAppAuthSuccess) {
        throw new Error('Failed to authenticate with Podio Contacts app');
      }
      
      // Call the authenticateUser function to check if user exists in Contacts app
      const userData = await authenticateUser(username, password);
      
      // Pre-authenticate with Packing Spec app to avoid issues later
      // This doesn't block login flow
      authenticateWithPackingSpecAppToken().catch(() => {
        // Silently handle failure, will retry when needed
      });
      
      setUser(userData);
      localStorage.setItem('nzhg_user', JSON.stringify(userData));
      localStorage.setItem('user_info', JSON.stringify(userData));
      extendSession();
      
      setLoading(false);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nzhg_user');
    localStorage.removeItem('user_info');
    localStorage.removeItem('nzhg_session_expiry');
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, checkSession }}>
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
