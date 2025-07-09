import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  clearTokens,
  cacheUserData,
  authenticateUser,
  setupTokenRefreshInterval,
  cleanupTokenRefreshInterval,
  resetConnectionError,
  isInConnectionErrorState,
  getRetryStatus,
  PodioAuthError
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

// Auth context interface
interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  error: PodioAuthError | null;
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
  const [error, setError] = useState<PodioAuthError | null>(null);
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
          
          // Only set up token refresh if not on auth/setup pages
          const currentPath = window.location.pathname;
          const authPaths = ['/login', '/podio-setup', '/podio-callback', '/auth'];
          const isAuthPage = authPaths.some(authPath => currentPath.startsWith(authPath));
          
          if (!isAuthPage) {
            console.log('Setting up token refresh for authenticated user');
            setupTokenRefreshInterval();
          } else {
            console.log('Skipping token refresh setup on auth page:', currentPath);
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        setError(err as PodioAuthError);
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
        throw {
          status: 400,
          message: 'Username and password are required',
          retry: false
        } as PodioAuthError;
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
            retry: true // Default to allowing retry for network errors
          } as PodioAuthError;
        }
        
        // Check if this is a JSON parse error (invalid response)
        if (authError instanceof SyntaxError && authError.message.includes('JSON')) {
          throw {
            status: 500,
            message: 'Server returned an invalid response format',
            parseError: true,
            retry: false
          } as PodioAuthError;
        }
        
        // Pass through other errors with retry info
        // Make sure we're handling a custom auth error with retry property
        // or a standard error without it
        if (typeof authError === 'object') {
          // Use custom auth error fields if they exist, or create a new error object
          throw {
            status: authError.status || 500,
            message: authError.message || 'Authentication failed',
            details: authError.details || null,
            retry: authError.retry !== undefined ? authError.retry : false,
            networkError: authError.networkError || false
          } as PodioAuthError;
        } else {
          // For standard errors without retry property
          throw {
            status: 500,
            message: authError.message || 'Authentication failed',
            retry: false
          } as PodioAuthError;
        }
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
      const formattedError: PodioAuthError = {
        status: err.status || 500,
        message: err.message || 'An unknown error occurred',
        details: err.details || null,
        retry: typeof err.retry === 'boolean' ? err.retry : false, // Ensure retry is a boolean
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
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('podio-token-refresh', {
        method: 'POST'
      });
      
      // Enhanced error handling for edge function responses
      if (error) {
        console.error('Reauthentication edge function error:', error);
        setIsAuthenticated(false);
        setError({
          status: 500,
          message: 'Failed to connect to authentication service',
          details: error.message,
          retry: false
        });
        window.dispatchEvent(new CustomEvent('podio-reauth-needed'));
        return false;
      }
      
      // Check for response structure indicating failure
      if (!data || data.success === false || !data.access_token) {
        console.error('Reauthentication failed - invalid or missing token:', data);
        setIsAuthenticated(false);
        
        // Handle specific error conditions
        if (data && (data.needs_reauth || data.needs_setup)) {
          setError({
            status: data.status || 401,
            message: data.error || 'Reauthentication required',
            details: data.details,
            retry: false
          });
          window.dispatchEvent(new CustomEvent('podio-reauth-needed'));
        } else {
          setError({
            status: 500,
            message: 'Invalid authentication response',
            retry: false
          });
        }
        return false;
      }
      
      // Validate and store token expiry
      if (data.expires_at) {
        const expiryDate = new Date(data.expires_at);
        if (!isNaN(expiryDate.getTime())) {
          const expiryTime = expiryDate.getTime();
          localStorage.setItem('podio_token_expiry', expiryTime.toString());
          
          // Check if token is already expired
          if (expiryTime <= Date.now()) {
            console.warn('Received expired token from reauthentication');
            setIsAuthenticated(false);
            setError({
              status: 401,
              message: 'Received expired authentication token',
              retry: false
            });
            return false;
          }
        } else {
          console.warn('Invalid expiry date in reauthentication response:', data.expires_at);
          // Still proceed but warn about the invalid date
        }
      }
      
      setIsAuthenticated(true);
      setError(null);
      console.log('Reauthentication successful');
      return true;
    } catch (err) {
      console.error('Unexpected reauthentication error:', err);
      setError({
        status: 500,
        message: err instanceof Error ? err.message : 'Unknown reauthentication error',
        retry: false
      });
      setIsAuthenticated(false);
      return false;
    } finally {
      setLoading(false);
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
