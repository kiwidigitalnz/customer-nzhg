
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { ensureInitialPodioAuth } from '../services/podioApi';
import LandingPage from './LandingPage';

const Index = () => {
  const { user, checkSession } = useAuth();
  const { toast } = useToast();
  const [isAttemptingAuth, setIsAttemptingAuth] = useState(false);
  
  useEffect(() => {
    // In production, try to automatically authenticate with Podio
    if (import.meta.env.PROD && !isAttemptingAuth) {
      setIsAttemptingAuth(true);
      ensureInitialPodioAuth().catch(err => {
        console.error('Error during automatic Podio authentication:', err);
        
        // Only show errors in development
        if (import.meta.env.DEV) {
          toast({
            title: "Podio Authentication Error",
            description: err instanceof Error ? err.message : "Could not connect to Podio",
            duration: 5000,
          });
        }
      });
    }
    
    // Check if there's a stale session
    if (user && !checkSession()) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        duration: 5000,
      });
    }
  }, [isAttemptingAuth, toast, user, checkSession]);
  
  // If the user is logged in and session is valid, redirect them to the dashboard
  if (user && checkSession()) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // For everyone else, show the landing page
  return <LandingPage />;
};

export default Index;
