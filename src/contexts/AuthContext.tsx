
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authenticateUser, isPodioConfigured, ensureInitialPodioAuth } from '../services/podioApi';
import { useToast } from '@/components/ui/use-toast';
import { 
  AuthErrorType, 
  createAuthError, 
  handleAuthError, 
  isSessionValid, 
  extendSession,
  initAuthMonitoring,
  AuthError
} from '../services/auth/authService';

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
  const { toast } = useToast();

  useEffect(() => {
    // Initialize auth monitoring
    initAuthMonitoring();
    
    // Check for saved user session
    const savedUser = localStorage.getItem('nzhg_user');
    if (savedUser && isSessionValid()) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        
        // Also store user info in a consistent location for components to access
        localStorage.setItem('user_info', JSON.stringify(userData));
        
        // Extend the session on successful restoration
        extendSession();
      } catch (e) {
        // Invalid stored data, clean it up
        localStorage.removeItem('nzhg_user');
        localStorage.removeItem('user_info');
        localStorage.removeItem('nzhg_session_expiry');
      }
    } else if (savedUser && !isSessionValid()) {
      // Session expired, clean up
      localStorage.removeItem('nzhg_user');
      localStorage.removeItem('user_info');
      localStorage.removeItem('nzhg_session_expiry');
      
      // Show a friendly message that session expired
      toast({
        title: 'Session Expired',
        description: 'Your session has expired. Please log in again.',
      });
    }
    
    setLoading(false);
  }, [toast]);

  const checkSession = (): boolean => {
    return isSessionValid() && !!user;
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    // We don't need to check Podio configuration here since that's now done in LoginForm
    // The Password Flow authentication is handled before the login attempt
    
    try {
      console.log('Login attempt for:', username);
      
      // Enhanced error handling for network issues
      try {
        const userData = await authenticateUser({ username, password });
        
        if (userData) {
          console.log('Authentication successful, user data:', userData);
          setUser(userData);
          
          // Store in both locations for consistency
          localStorage.setItem('nzhg_user', JSON.stringify(userData));
          localStorage.setItem('user_info', JSON.stringify(userData));
          
          // Set session expiry
          extendSession();
          
          setLoading(false);
          return true;
        } else {
          const authError = createAuthError(
            AuthErrorType.AUTHENTICATION,
            'No matching contact found with these credentials'
          );
          
          handleAuthError(authError);
          setError(authError.message);
          setLoading(false);
          return false;
        }
      } catch (networkErr) {
        // Check if it's a network error
        if (networkErr instanceof Error && 
            (networkErr.message.includes('network') || 
             networkErr.message.includes('connection'))) {
          const authError = createAuthError(
            AuthErrorType.NETWORK,
            'Network error. Please check your connection.'
          );
          
          handleAuthError(authError);
          setError(authError.message);
          setLoading(false);
          return false;
        }
        
        // Re-throw for other error handling
        throw networkErr;
      }
    } catch (err) {
      // Handle authentication errors
      if (err && typeof err === 'object' && 'type' in err && 'message' in err) {
        // It's already an AuthError
        handleAuthError(err as AuthError);
        setError((err as AuthError).message);
      } else {
        const errorMsg = err instanceof Error 
          ? `Login error: ${err.message}` 
          : 'An unknown error occurred during login';
        
        const authError = createAuthError(
          AuthErrorType.UNKNOWN,
          errorMsg
        );
        
        handleAuthError(authError);
        setError(errorMsg);
      }
      
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
