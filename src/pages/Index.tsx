import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { 
  authenticateWithClientCredentials, 
  isPodioConfigured,
  isRateLimited 
} from '../services/podioAuth';
import LandingPage from './LandingPage';

const Index = () => {
  const { user, checkSession } = useAuth();
  const { toast } = useToast();
  const [isAttemptingAuth, setIsAttemptingAuth] = useState(false);
  const [podioAuthError, setPodioAuthError] = useState<string | null>(null);
  
  useEffect(() => {
    // Try to authenticate with Podio on page load
    if (!isAttemptingAuth) {
      setIsAttemptingAuth(true);
      
      // Check if Podio is configured
      console.log('Checking Podio configuration');
      const configured = isPodioConfigured();
      console.log('Podio configured:', configured);
      
      if (configured) {
        // Check if we're rate limited
        if (isRateLimited()) {
          const limitUntil = parseInt(localStorage.getItem('podio_rate_limit_until') || '0', 10);
          const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
          setPodioAuthError(`Rate limited. Please wait ${waitSecs} seconds before trying again.`);
          return;
        }
        
        // Attempt initial Podio authentication
        console.log('Attempting initial Podio authentication');
        authenticateWithClientCredentials()
          .then(success => {
            console.log('Initial Podio authentication result:', success ? 'Success' : 'Failed');
            if (!success) {
              setPodioAuthError('Could not connect to Podio');
            }
          })
          .catch(err => {
            console.error('Error during Podio authentication:', err);
            setPodioAuthError(err instanceof Error ? err.message : 'Connection error');
          });
      } else {
        console.log('Podio not properly configured');
        setPodioAuthError('Podio API is not configured properly');
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
  
  // If the user is logged in and session is valid, redirect to dashboard
  if (user && checkSession()) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Otherwise show the landing page
  return <LandingPage podioAuthError={podioAuthError} />;
};

export default Index;
