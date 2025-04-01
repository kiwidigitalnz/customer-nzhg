
import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { authenticateUser, authenticateWithClientCredentials, authenticateWithPasswordFlow, isRateLimited, validateContactsAppAccess } from '../services/podioAuth';
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
  forceReauthenticate: () => Promise<boolean>;
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
  const [permissionError, setPermissionError] = useState(false);

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

  // Force reauthenticate with Podio - useful when credentials have changed
  const forceReauthenticate = async (): Promise<boolean> => {
    // Clear all Podio-related tokens and state
    logout();
    
    // Clear all Podio auth tokens
    localStorage.removeItem('podio_access_token');
    localStorage.removeItem('podio_refresh_token');
    localStorage.removeItem('podio_token_expiry');
    localStorage.removeItem('podio_app_access_token');
    localStorage.removeItem('podio_app_token_expiry');
    localStorage.removeItem('podio_current_app_context');
    localStorage.removeItem('podio_rate_limit_info');
    
    // Reset permission error state
    setPermissionError(false);
    
    // Try to authenticate with client credentials first
    try {
      setLoading(true);
      // First try client credentials
      const clientSuccess = await authenticateWithClientCredentials();
      
      if (!clientSuccess) {
        toast({
          title: 'Podio Authentication Failed',
          description: 'Could not authenticate with Podio API using client credentials',
          variant: 'destructive',
        });
        setLoading(false);
        return false;
      }
      
      // Then try app authentication
      const appSuccess = await authenticateWithPasswordFlow();
      
      setLoading(false);
      
      if (appSuccess) {
        toast({
          title: 'Podio Authentication Successful',
          description: 'Successfully authenticated with Podio API',
        });
      } else {
        toast({
          title: 'Podio App Authentication Limited',
          description: 'Authenticated with client credentials but could not get app-specific access',
          variant: 'default',
        });
      }
      
      // Check if we can access the Contacts app
      const hasAccess = await validateContactsAppAccess();
      if (!hasAccess) {
        toast({
          title: 'Permission Issue',
          description: 'Could not access the Contacts app. Please check Podio API permissions.',
          variant: 'destructive',
        });
        setPermissionError(true);
        return false;
      }
      
      // Reset permission error state since we have access
      setPermissionError(false);
      return true;
    } catch (error) {
      setLoading(false);
      toast({
        title: 'Podio Authentication Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Pre-authenticate with client credentials - with rate limit and dedupe protection
  const preAuthenticate = useCallback(async () => {
    // Skip if rate limited, authenticated recently, or auth in progress
    if (isRateLimited() || Date.now() - lastAuthAttempt < 60000 || authInProgress.current) {
      console.log('Skipping pre-authentication due to rate limit, recent attempt, or auth in progress');
      return;
    }
    
    // Skip pre-authentication if we know there's a permission issue
    if (permissionError) {
      console.log('Skipping pre-authentication due to known permission issues');
      return;
    }
    
    authInProgress.current = true;
    setLastAuthAttempt(Date.now());
    
    try {
      // Check if we can access the Contacts app
      const hasAccess = await validateContactsAppAccess();
      
      if (!hasAccess) {
        console.warn('No access to Contacts app, setting permission error');
        setPermissionError(true);
        return;
      }
      
      // If we have access, reset permission error flag
      setPermissionError(false);
      
      console.log('Pre-authentication successful, contacts app is accessible');
    } catch (error) {
      console.warn('Error during pre-authentication:', error);
      
      // Check for permission errors
      if ((error as Error).message && (
          (error as Error).message.includes('permission') || 
          (error as Error).message.includes('403') ||
          (error as Error).message.includes('forbidden')
      )) {
        setPermissionError(true);
      }
    } finally {
      authInProgress.current = false;
    }
  }, [lastAuthAttempt, permissionError]);

  useEffect(() => {
    // Prevent multiple initializations
    if (authInitialized.current) return;
    authInitialized.current = true;
    
    // Clear any existing Podio tokens on initial load to force reauthorization with new credentials
    localStorage.removeItem('podio_access_token');
    localStorage.removeItem('podio_refresh_token');
    localStorage.removeItem('podio_token_expiry');
    localStorage.removeItem('podio_app_access_token');
    localStorage.removeItem('podio_app_token_expiry');
    localStorage.removeItem('podio_current_app_context');
    
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
    // If we know there's a permission error, return early with a clear message
    if (permissionError) {
      setError('The application does not have permission to access the Contacts app. Please contact the administrator.');
      return false;
    }
    
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
      
      // Try to authenticate with the contacts app first for better permissions
      await authenticateWithPasswordFlow();
      
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
      
      // Check for permission errors
      if (errorMsg.includes('permission') || 
          errorMsg.includes('forbidden') || 
          errorMsg.includes('403')) {
        setPermissionError(true);
      }
      
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
    <AuthContext.Provider value={{ user, loading, error, login, logout, checkSession, forceReauthenticate }}>
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
