
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  authenticateUser, 
  authenticateWithClientCredentials, 
  clearTokens, 
  clearRateLimit, 
  refreshPodioToken, 
  isPodioConfigured, 
  hasValidTokens, 
  setRateLimit 
} from '@/services/podioAuth';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkSession: () => boolean;
  isAuthenticated: boolean;
  forceReauthenticate: () => Promise<boolean>;
}

export interface UserData {
  id: number;
  name: string;
  email: string;
  username: string;
  logoUrl?: string;
}

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

// Time limit for session in milliseconds (2 hours)
const SESSION_TIME_LIMIT = 2 * 60 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const { toast } = useToast();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if we have a stored user
        const storedUser = localStorage.getItem('user');
        const storedSessionStartTime = localStorage.getItem('sessionStartTime');
        
        if (storedUser && storedSessionStartTime) {
          const parsedUser = JSON.parse(storedUser);
          const parsedTime = parseInt(storedSessionStartTime, 10);
          
          // Check if the session is still valid
          if (Date.now() - parsedTime < SESSION_TIME_LIMIT) {
            // Session is valid, restore user state
            setUser(parsedUser);
            setSessionStartTime(parsedTime);
            
            // Attempt to refresh Podio token if we have valid tokens
            if (hasValidTokens()) {
              try {
                await refreshPodioToken();
              } catch (refreshError) {
                console.warn('Failed to refresh token during initialization:', refreshError);
                // Don't log out yet, we might still have valid tokens
              }
            } else if (isPodioConfigured()) {
              // Try to authenticate with client credentials if no valid tokens
              try {
                await authenticateWithClientCredentials();
              } catch (authError) {
                console.warn('Failed to authenticate with client credentials:', authError);
                setRateLimit(60, 'authenticateWithClientCredentials');
              }
            }
          } else {
            // Session has expired, clear everything
            console.log('Session expired, logging out');
            clearLocalData();
          }
        }
      } catch (error) {
        console.error('Error during auth initialization:', error);
        clearLocalData();
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, []);

  // Function to check if the session is still valid
  const checkSession = () => {
    if (!sessionStartTime) return false;
    return Date.now() - sessionStartTime < SESSION_TIME_LIMIT;
  };

  // Function to clear all local data
  const clearLocalData = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('sessionStartTime');
    clearTokens(); // Clear Podio tokens
    clearRateLimit(); // Clear rate limit state
    setUser(null);
    setSessionStartTime(null);
    setError(null);
  };

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Authenticate with Podio
      const userData = await authenticateUser(username, password);
      
      // Store user data
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set session start time
      const now = Date.now();
      setSessionStartTime(now);
      localStorage.setItem('sessionStartTime', now.toString());
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to login';
      setError(errorMessage);
      
      // Clear any partial data
      clearLocalData();
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Force reauthentication with Podio
  const forceReauthenticate = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Clear tokens first
      clearTokens();
      
      // Attempt to authenticate using client credentials
      await authenticateWithClientCredentials();
      
      toast({
        title: "Reauthentication Successful",
        description: "Successfully reconnected to Podio API.",
      });
      
      return true;
    } catch (error) {
      console.error('Force reauthentication error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reauthenticate';
      setError(errorMessage);
      
      toast({
        title: "Reauthentication Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    clearLocalData();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const authContextValue: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    checkSession,
    isAuthenticated: !!user,
    forceReauthenticate,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
