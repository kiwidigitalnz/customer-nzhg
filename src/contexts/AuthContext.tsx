import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// User data interface with authentication information
export interface UserData {
  id: number;
  podioItemId?: number;
  name: string;
  email: string;
  username: string;
  logoUrl?: string;
}

// Simple auth error interface
export interface AuthError {
  message: string;
  status?: number;
  retry?: boolean;
}

// Auth context interface
interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  error: AuthError | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
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
  clearError: () => {},
  connectionIssue: false,
  retryStatus: { authRetries: 0, tokenRetries: 0, maxAuthRetries: 0, maxTokenRetries: 0 },
  resetConnection: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionIssue] = useState(false);

  // Reset connection state
  const resetConnection = useCallback(() => {
    console.warn('Reset connection disabled - OAuth removed');
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Simplified login method - just for demo purposes
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      // Simulate authentication - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const userData: UserData = {
        id: 1,
        podioItemId: 1,
        name: 'Demo User',
        email: 'demo@example.com',
        username: username,
        logoUrl: undefined
      };
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return true;
    } catch (err: any) {
      console.error('Login error:', err);
      setError({ 
        message: err.message || 'Authentication failed',
        retry: false
      });
      setIsAuthenticated(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout method
  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    
    // Redirect to index/landing page after logout
    window.location.href = '/';
  }, []);


  const authContextValue: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
    clearError,
    connectionIssue,
    retryStatus: { authRetries: 0, tokenRetries: 0, maxAuthRetries: 0, maxTokenRetries: 0 },
    resetConnection
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
