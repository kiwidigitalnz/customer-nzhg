
import React, { createContext, useContext } from 'react';

// Simplified user data without auth requirements
export interface UserData {
  id: number;
  name: string;
  email: string;
  username: string;
  logoUrl?: string;
}

// Create a dummy user for development
const dummyUser: UserData = {
  id: 1,
  name: "Test Company",
  email: "test@example.com",
  username: "testuser",
  logoUrl: undefined
};

// Simplified auth context without actual authentication
interface AuthContextType {
  user: UserData;
  loading: boolean;
  error: null;
  login: () => Promise<boolean>;
  logout: () => void;
  checkSession: () => boolean;
  isAuthenticated: boolean;
  forceReauthenticate: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: dummyUser,
  loading: false,
  error: null,
  login: async () => true,
  logout: () => {},
  checkSession: () => true,
  isAuthenticated: true,
  forceReauthenticate: async () => true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always return the dummy user and simplified auth methods
  const authContextValue: AuthContextType = {
    user: dummyUser,
    loading: false,
    error: null,
    login: async () => true,
    logout: () => console.log("Logout called (no-op)"),
    checkSession: () => true,
    isAuthenticated: true,
    forceReauthenticate: async () => true,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
