
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authenticateUser, authenticateWithClientCredentials } from '../services/podioAuth';
import { useToast } from '@/components/ui/use-toast';

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

// Helper function to emit debug info for the UI
const emitLoginDebugInfo = (step: string, status: 'pending' | 'success' | 'error', details?: string) => {
  // Store debug info in localStorage to allow components to react
  const debugKey = `auth_login_debug_${Date.now()}`;
  const debugInfo = JSON.stringify({ step, status, details });
  
  // Use localStorage event for communication
  localStorage.setItem(debugKey, debugInfo);
  // Trigger event for current window
  window.dispatchEvent(new StorageEvent('storage', {
    key: debugKey,
    newValue: debugInfo
  }));
  
  // Log to console
  if (import.meta.env.DEV) {
    console.log(`[Auth Login Debug] ${step} - ${status}${details ? ': ' + details : ''}`);
  }
  
  // Clean up old debug keys after 10 seconds to prevent localStorage pollution
  setTimeout(() => {
    localStorage.removeItem(debugKey);
  }, 10000);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    // Check for saved user session
    const savedUser = localStorage.getItem('nzhg_user');
    if (savedUser && isSessionValid()) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        localStorage.setItem('user_info', JSON.stringify(userData));
        extendSession();
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
  }, [toast, user]);

  const checkSession = (): boolean => {
    return isSessionValid() && !!user;
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      emitLoginDebugInfo('Login process started', 'pending');
      
      // Try to authenticate with client credentials if we're not already authenticated
      emitLoginDebugInfo('Authenticating with client credentials', 'pending');
      await authenticateWithClientCredentials();
      emitLoginDebugInfo('Client credentials authentication completed', 'success');
      
      // Call the authenticateUser function to check if user exists in Contacts app
      emitLoginDebugInfo('Checking user in Contacts app', 'pending');
      const userData = await authenticateUser(username, password);
      
      emitLoginDebugInfo('User authenticated successfully', 'success', 
        `User ID: ${userData.id}
         Name: ${userData.name}`
      );
      
      setUser(userData);
      localStorage.setItem('nzhg_user', JSON.stringify(userData));
      localStorage.setItem('user_info', JSON.stringify(userData));
      extendSession();
      
      setLoading(false);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      
      emitLoginDebugInfo('Login process failed', 'error', errorMsg);
      
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nzhg_user');
    localStorage.removeItem('user_info');
    localStorage.removeItem('nzhg_session_expiry');
    emitLoginDebugInfo('User logged out', 'success');
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
