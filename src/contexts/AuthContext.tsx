
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  clearTokens,
  cacheUserData,
  authenticateUser,
  setupTokenRefreshInterval,
  cleanupTokenRefreshInterval,
  resetConnectionError,
  isInConnectionErrorState,
  getRetryStatus
} from '../services/podio/podioAuth';
import { supabase } from '../integrations/supabase/client';

// User data interface with authentication information
export interface UserData {
  id: number;
  podioItemId?: number;
  name: string;
  email: string;
  username: string;
  logoFileId?: string;
  logoUrl?: string;
}

// Error interface with retry information
interface AuthError {
  status?: number;
  message: string;
  details?: any;
  retry?: boolean;
  networkError?: boolean;
}

// Auth context interface
interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  error: AuthError | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  forceReauthenticate: () => Promise<boolean>;
  clearError: () => void;
  connectionIssue: boolean;
  retryStatus: { authRetries: number, tokenRetries: number, maxAuthRetries: number, maxTokenRetries: number };
  resetConnection: () => void;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  login: async () => false,
  logout: () => {},
  isAuthenticated: false,
  forceReauthenticate: async () => false,
  clearError: () => {},
  connectionIssue: false,
  retryStatus: { authRetries: 0, tokenRetries: 0, maxAuthRetries: 3, maxTokenRetries: 2 },
  resetConnection: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionIssue, setConnectionIssue] = useState(false);
  
  // Check for connection issues periodically
  useEffect(() => {
    const checkConnectionStatus = () => {
      setConnectionIssue(isInConnectionErrorState());
    };
    
    // Check immediately
    checkConnectionStatus();
    
    // Then check periodically
    const intervalId = setInterval(checkConnectionStatus, 5000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Check for existing user data and set up token refresh on mount
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        // Check for existing user data in localStorage
        const storedUser = localStorage.getItem('podio_user_data');
        
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
          
          // Set up token refresh interval
          setupTokenRefreshInterval();
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        setError(err as AuthError);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    
    // Cleanup token refresh on unmount
    return () => {
      cleanupTokenRefreshInterval();
    };
  }, []);

  // Handle Podio reauth events
  useEffect(() => {
    const handleReauth = () => {
      // Redirect to auth page
      window.location.href = '/podio-setup?reauth=required';
    };
    
    window.addEventListener('podio-reauth-needed', handleReauth);
    
    return () => {
      window.removeEventListener('podio-reauth-needed', handleReauth);
    };
  }, []);

  // Get current retry status for debugging
  const retryStatus = getRetryStatus();

  // Reset connection state
  const resetConnection = useCallback(() => {
    resetConnectionError();
    setConnectionIssue(false);
    setError(null);
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Login method with enhanced error handling
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      // Call the function for user authentication
      let userData;
      try {
        userData = await authenticateUser(username, password);
      } catch (authError: any) {
        // Check if this is a network or fetch error
        if (authError instanceof Error && 
           (authError.message.includes('fetch') || 
            authError.message.includes('network') || 
            authError.message.includes('Failed to fetch'))) {
          throw {
            status: 0,
            message: 'Network error: Unable to connect to the authentication service',
            networkError: true,
            retry: authError.retry !== false
          };
        }
        
        // Check if this is a JSON parse error (invalid response)
        if (authError instanceof SyntaxError && authError.message.includes('JSON')) {
          throw {
            status: 500,
            message: 'Server returned an invalid response format',
            parseError: true,
            retry: false
          };
        }
        
        // Pass through other errors with retry info
        if (typeof authError === 'object') {
          if (authError.retry === undefined) {
            authError.retry = false; // Default to no retry if not specified
          }
        }
        
        throw authError;
      }
      
      if (!userData) {
        throw new Error('Empty response from authentication service');
      }
      
      // Check for error in the response
      if (userData.error) {
        throw userData;
      }
      
      // Store user data in localStorage - ensure podioItemId is included
      const formattedUserData = {
        id: userData.id,
        podioItemId: userData.podioItemId || userData.id, // Use podioItemId or fallback to id
        name: userData.name,
        email: userData.email,
        username: userData.username,
        logoUrl: userData.logoUrl
      };
      
      localStorage.setItem('podio_user_data', JSON.stringify(formattedUserData));
      
      // Cache user data for offline access
      cacheUserData(`user_${formattedUserData.id}`, formattedUserData);
      
      setUser(formattedUserData);
      setIsAuthenticated(true);
      
      // Reset connection issues on successful login
      setConnectionIssue(false);
      
      return true;
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Format the error for consistent handling
      const formattedError: AuthError = {
        status: err.status || 500,
        message: err.message || 'An unknown error occurred',
        details: err.details || null,
        retry: err.retry !== undefined ? err.retry : false,
        networkError: err.networkError || false
      };
      
      setError(formattedError);
      setIsAuthenticated(false);
      
      // Update connection issue state
      setConnectionIssue(isInConnectionErrorState());
      
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout method - updated to navigate to landing page
  const logout = useCallback(() => {
    clearTokens();
    cleanupTokenRefreshInterval();
    localStorage.removeItem('podio_user_data');
    setUser(null);
    setIsAuthenticated(false);
    
    // Reset connection issues on logout
    setConnectionIssue(false);
    
    // Redirect to index/landing page after logout
    window.location.href = '/';
  }, []);

  // Force reauthentication with Podio API
  const forceReauthenticate = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('podio-token-refresh', {
        method: 'POST'
      });
      
      if (error || !data || !data.access_token) {
        setIsAuthenticated(false);
        window.dispatchEvent(new CustomEvent('podio-reauth-needed'));
        return false;
      }
      
      // Store token expiry in localStorage
      if (data.expires_at) {
        const expiryTime = new Date(data.expires_at).getTime();
        localStorage.setItem('podio_token_expiry', expiryTime.toString());
      }
      
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      console.error('Reauthentication error:', err);
      setError(err as AuthError);
      setIsAuthenticated(false);
      return false;
    }
  }, []);

  const authContextValue: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
    forceReauthenticate,
    clearError,
    connectionIssue,
    retryStatus,
    resetConnection
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
