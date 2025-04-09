
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
          
          // Check if tokens are valid on the server
          const hasValidSession = await refreshPodioToken();
          setIsAuthenticated(hasValidSession);
          
          if (!hasValidSession) {
            console.log('No valid session found, clearing local user data');
            localStorage.removeItem('podio_user_data');
            setUser(null);
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
  }, []);

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
        return true;
      }
      
      // Normal authentication flow
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      // We still verify token is valid before trying to authenticate
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

  // Check if session is valid
  const checkSession = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    return await refreshPodioToken();
  }, [user]);

  // Force reauthentication with Podio API
  const forceReauthenticate = useCallback(async (): Promise<boolean> => {
    try {
      const success = await refreshPodioToken();
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
