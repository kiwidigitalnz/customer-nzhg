
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  clearTokens,
  cacheUserData,
  authenticateUser,
  setupTokenRefreshInterval,
  cleanupTokenRefreshInterval
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
  login: (username: string, password: string) => Promise<boolean>;
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
        setError(err);
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

  // Login method
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      // Call the function for user authentication
      const userData = await authenticateUser(username, password);
      
      if (!userData) {
        throw new Error('Empty response from authentication service');
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
      
      return true;
    } catch (err) {
      setError(err);
      setIsAuthenticated(false);
      
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
      setError(err);
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
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
