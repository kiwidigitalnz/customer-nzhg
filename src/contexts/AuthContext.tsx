
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  authenticateUser, 
  clearTokens, 
  hasValidTokens,
  authenticateWithClientCredentials,
  isPodioConfigured
} from '../services/podioAuth';

// User data interface with authentication information
export interface UserData {
  id: number;
  name: string;
  email: string;
  username: string;
  logoUrl?: string;
}

// Auth context interface
interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  error: any;
  login: (username?: string, password?: string) => Promise<boolean>;
  logout: () => void;
  checkSession: () => boolean;
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
  checkSession: () => false,
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
          
          // Check if tokens are valid
          if (hasValidTokens()) {
            setIsAuthenticated(true);
          } else {
            // Try to reauthenticate with client credentials
            const success = await authenticateWithClientCredentials();
            setIsAuthenticated(success);
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
          name: "Test Company",
          email: "test@example.com",
          username: "testuser",
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

      const userData = await authenticateUser(username, password);
      
      setUser(userData);
      setIsAuthenticated(true);
      setLoading(false);
      
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setError(err);
      setIsAuthenticated(false);
      setLoading(false);
      
      return false;
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
  const checkSession = useCallback((): boolean => {
    return hasValidTokens() && Boolean(user);
  }, [user]);

  // Force reauthentication with Podio API
  const forceReauthenticate = useCallback(async (): Promise<boolean> => {
    try {
      const success = await authenticateWithClientCredentials();
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
