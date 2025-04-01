import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import LandingPage from './LandingPage';

const Index = () => {
  const { user, checkSession } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  
  useEffect(() => {
    // Perform session check once on mount
    if (user) {
      const isValid = checkSession();
      setHasValidSession(isValid);
      
      if (!isValid) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          duration: 5000,
        });
      }
    }
    
    // Set loading to false after checking
    setIsLoading(false);
  }, [toast, user, checkSession]);
  
  // Show loading state while checking session
  if (isLoading) {
    return null; // Render nothing while checking to prevent flicker
  }
  
  // If the user is logged in and session is valid, redirect to dashboard
  if (user && hasValidSession) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Otherwise show the landing page
  return <LandingPage />;
};

export default Index;
