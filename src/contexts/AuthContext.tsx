
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  clearTokens,
  cacheUserData
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
  error: any;
  login: (username?: string, password?: string) => Promise<boolean>;
  logout: () => void;
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
  isAuthenticated: false,
  forceReauthenticate: async () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check for existing user data in localStorage on component mount
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

  // Login method - simplified to reduce token verification
  const login = useCallback(async (username?: string, password?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // For development only, allow login without credentials
      if (process.env.NODE_ENV === 'development' && !username && !password) {
        const dummyUser: UserData = {
          id: 1,
          podioItemId: 1, // Set a dummy podioItemId for development
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

      // Call the edge function to authenticate the user
      const { data, error } = await supabase.functions.invoke('podio-user-auth', {
        method: 'POST',
        body: {
          username,
          password
        }
      });
      
      if (error) {
        console.error('User authentication failed:', error);
        throw new Error(error.message || 'Authentication failed');
      }
      
      if (!data) {
        console.error('Empty response from user authentication');
        throw new Error('Empty response from authentication service');
      }
      
      if (data.error) {
        console.error('Authentication error:', data.error);
        throw new Error(data.error);
      }
      
      // Store user data in localStorage - ensure podioItemId is included
      const userData = {
        id: data.id,
        podioItemId: data.podioItemId || data.id, // Use podioItemId or fallback to id
        name: data.name,
        email: data.email,
        username: data.username,
        logoUrl: data.logoUrl
      };
      
      localStorage.setItem('podio_user_data', JSON.stringify(userData));
      
      // Cache user data for offline access
      cacheUserData(`user_${userData.id}`, userData);
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return true;
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

  // Force reauthentication with Podio API - simplified to just return true if already authenticated
  const forceReauthenticate = useCallback(async (): Promise<boolean> => {
    // If we're already authenticated, return true immediately
    if (isAuthenticated) {
      return true;
    }
    
    try {
      // Only refresh token if not authenticated
      const { data, error } = await supabase.functions.invoke('podio-token-refresh', {
        method: 'POST'
      });
      
      if (error || !data || !data.access_token) {
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Force reauthentication error:', err);
      setError(err);
      return false;
    }
  }, [isAuthenticated]);

  // Combine auth context value
  const authContextValue: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
    forceReauthenticate,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

