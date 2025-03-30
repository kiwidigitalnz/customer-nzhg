
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { ensureInitialPodioAuth, isPodioConfigured, clearPodioTokens } from '../services/podioApi';
import LandingPage from './LandingPage';

const Index = () => {
  const { user, checkSession } = useAuth();
  const { toast } = useToast();
  const [isAttemptingAuth, setIsAttemptingAuth] = useState(false);
  const [podioAuthError, setPodioAuthError] = useState<string | null>(null);
  
  useEffect(() => {
    // In production, try to automatically authenticate with Podio
    if (import.meta.env.PROD && !isAttemptingAuth) {
      setIsAttemptingAuth(true);
      
      // Check if Podio is configured with environment variables
      console.log('Production environment detected, checking Podio configuration');
      const configured = isPodioConfigured();
      console.log('Podio configured:', configured);
      
      if (configured) {
        console.log('Attempting initial Podio authentication');
        
        // Clear any previous errors
        setPodioAuthError(null);
        
        ensureInitialPodioAuth()
          .then(success => {
            console.log('Initial Podio authentication result:', success ? 'Success' : 'Failed');
            if (!success) {
              console.error('Could not automatically authenticate with Podio');
              // Clear tokens on authentication failure
              clearPodioTokens();
              
              setPodioAuthError('Could not connect to the service. Please check that your Podio app has the correct permissions.');
              
              toast({
                title: "Connection Error",
                description: "Could not connect to the service. Please check Podio permissions and try again.",
                duration: 5000,
              });
            }
          })
          .catch(err => {
            console.error('Error during automatic Podio authentication:', err);
            // Clear tokens on authentication error
            clearPodioTokens();
            
            const errorMessage = err?.message || 'Could not connect to the service. Possible Podio scope issue.';
            setPodioAuthError(errorMessage);
            
            toast({
              title: "Connection Error",
              description: errorMessage,
              duration: 5000,
            });
          });
      } else {
        console.error('Podio not properly configured. Check environment variables.');
        setPodioAuthError('Podio API is not properly configured. Please check your client credentials.');
      }
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
  return <LandingPage podioAuthError={podioAuthError} />;
};

export default Index;
