
import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { authenticateUser, authenticateWithClientCredentials, isRateLimited } from '../services/podioAuth';
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
  const authInProgress = useRef(false);
  const { toast } = useToast();
  const authInitialized = useRef(false);

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

  // Pre-authenticate with client credentials - with rate limit and dedupe protection
  const preAuthenticate = useCallback(async () => {
    // Skip if rate limited, authenticated recently, or auth in progress
    if (isRateLimited() || Date.now() - lastAuthAttempt < 60000 || authInProgress.current) {
      console.log('Skipping pre-authentication due to rate limit, recent attempt, or auth in progress');
      return;
    }
    
    authInProgress.current = true;
    setLastAuthAttempt(Date.now());
    
    try {
      // Try to authenticate with client credentials
      const success = await authenticateWithClientCredentials();
      
      console.log('Pre-authentication result:', success ? 'success' : 'failed');
    } catch (error) {
      console.warn('Error during pre-authentication:', error);
    } finally {
      authInProgress.current = false;
    }
  }, [lastAuthAttempt]);

  useEffect(() => {
    // Prevent multiple initializations
    if (authInitialized.current) return;
    authInitialized.current = true;
    
    // Check for saved user session
    const savedUser = localStorage.getItem('nzhg_user');
    if (savedUser && isSessionValid()) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        localStorage.setItem('user_info', JSON.stringify(userData));
        extendSession();
        
        // Pre-authenticate, but don't block loading
        setTimeout(() => preAuthenticate(), 1000);
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
    
    // Set up periodic session checks (only once every 5 minutes)
    const interval = setInterval(() => {
      if (user && !isSessionValid()) {
        logout();
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please log in again.',
        });
      }
    }, 300000); // Check every 5 minutes
    
    return () => clearInterval(interval);
  }, [toast, user, preAuthenticate]);

  const checkSession = (): boolean => {
    return isSessionValid() && !!user;
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    // Skip if already in progress to prevent duplicate API calls
    if (authInProgress.current) {
      console.log('Login already in progress, skipping duplicate call');
      return false;
    }
    
    // Add a cooldown period between login attempts to prevent hammering the API
    const now = Date.now();
    if (now - lastAuthAttempt < 5000) { // 5 second cooldown
      console.log('Login attempts too frequent, please wait');
      setError('Please wait a moment before trying again');
      return false;
    }
    
    setLoading(true);
    setError(null);
    authInProgress.current = true;
    
    try {
      // Set auth attempt timestamp to prevent duplicates
      setLastAuthAttempt(now);
      
      // Call the authenticateUser function to check if user exists in Contacts app
      const userData = await authenticateUser(username, password);
      
      setUser(userData);
      localStorage.setItem('nzhg_user', JSON.stringify(userData));
      localStorage.setItem('user_info', JSON.stringify(userData));
      extendSession();
      
      setLoading(false);
      authInProgress.current = false;
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      
      setLoading(false);
      authInProgress.current = false;
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
