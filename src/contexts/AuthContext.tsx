
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  authenticateUser, 
  clearTokens,
  refreshPodioToken,
  isPodioConfigured,
  cacheUserData
} from '../services/podio/podioAuth';

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
  error: any;
  login: (username?: string, password?: string) => Promise<boolean>;
  logout: () => void;
  checkSession: () => Promise<boolean>;
  isAuthenticated: boolean;
  forceReauthenticate: () => Promise<boolean>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  login: async () => false,
  logout: () => {},
  checkSession: async () => false,
  isAuthenticated: false,
  forceReauthenticate: async () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastAuthCheck, setLastAuthCheck] = useState(0);
  
  // Check if the user has a valid session on component mount
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        // Check if API is configured
        if (!isPodioConfigured()) {
          console.log('Podio API not configured');
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
          return;
        }

        // Check for existing user data in localStorage
        const storedUser = localStorage.getItem('podio_user_data');
        
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          
          // Set authenticated immediately based on stored data
          setIsAuthenticated(true);
          
          // Only verify with server occasionally to avoid too many calls
          const now = Date.now();
          if (now - lastAuthCheck > 5 * 60 * 1000) { // Check every 5 minutes
            console.log('Verifying auth token with server (periodic check)');
            const hasValidSession = await refreshPodioToken();
            setLastAuthCheck(now);
            
            if (!hasValidSession) {
              console.log('Server reports invalid session, logging out');
              localStorage.removeItem('podio_user_data');
              setUser(null);
              setIsAuthenticated(false);
            }
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setError(err);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [lastAuthCheck]);

  // Login method 
  const login = useCallback(async (username?: string, password?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // For development only, allow login without credentials
      if (process.env.NODE_ENV === 'development' && !username && !password) {
        const dummyUser: UserData = {
          id: 1,
          podioItemId: 1,
          name: "Test Company",
          email: "test@example.com",
          username: "testuser",
          logoFileId: "",
          logoUrl: "",
        };
        
        setUser(dummyUser);
        setIsAuthenticated(true);
        localStorage.setItem('podio_user_data', JSON.stringify(dummyUser));
        setLoading(false);
        setLastAuthCheck(Date.now());
        return true;
      }
      
      // Normal authentication flow
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      // Only verify token once at login
      console.log('Verifying token before authentication');
      const tokenValid = await refreshPodioToken();
      if (!tokenValid) {
        console.warn('Failed to get a valid token before user authentication');
      }
      
      // Now find the user in the contacts app
      const userData = await authenticateUser(username, password);
      
      if (userData) {
        console.log('User data from Podio:', userData);
        
        // Ensure required fields exist
        const userDataWithDefaults: UserData = {
          id: userData.id,
          podioItemId: userData.podioItemId || userData.id,
          name: userData.name || 'Unknown',
          email: userData.email || '',
          username: userData.username,
          logoFileId: userData.logoFileId || null,
          logoUrl: userData.logoUrl || null,
        };
        
        setUser(userDataWithDefaults);
        setIsAuthenticated(true);
        
        // Store user data for session persistence
        localStorage.setItem('podio_user_data', JSON.stringify(userDataWithDefaults));
        
        // Also cache user data for offline access
        cacheUserData(`user_${userDataWithDefaults.id}`, userDataWithDefaults);
        setLastAuthCheck(Date.now());
        
        return true;
      } else {
        throw new Error('User not found');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err);
      setIsAuthenticated(false);
      
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout method
  const logout = useCallback(() => {
    clearTokens();
    localStorage.removeItem('podio_user_data');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Check if session is valid - used when we need to verify, not on every render
  const checkSession = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const isValid = await refreshPodioToken();
    setLastAuthCheck(Date.now());
    return isValid;
  }, [user]);

  // Force reauthentication with Podio API
  const forceReauthenticate = useCallback(async (): Promise<boolean> => {
    try {
      const success = await refreshPodioToken();
      setLastAuthCheck(Date.now());
      return success;
    } catch (err) {
      console.error('Force reauthentication error:', err);
      setError(err);
      return false;
    }
  }, []);

  // Combine auth context value
  const authContextValue: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    checkSession,
    isAuthenticated,
    forceReauthenticate,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
