
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { 
  ensureInitialPodioAuth, 
  isPodioConfigured, 
  clearPodioTokens,
  isRateLimited,
  getPodioClientId,
  getPodioClientSecret
} from '../services/podioApi';
import LandingPage from './LandingPage';

const Index = () => {
  const { user, checkSession } = useAuth();
  const { toast } = useToast();
  const [isAttemptingAuth, setIsAttemptingAuth] = useState(false);
  const [podioAuthError, setPodioAuthError] = useState<string | null>(null);
  
  useEffect(() => {
    // In production and development, try to automatically authenticate with Podio (using Password Flow)
    if (!isAttemptingAuth) {
      setIsAttemptingAuth(true);
      
      // Check if Podio is configured with environment variables
      console.log('Checking Podio configuration');
      const configured = isPodioConfigured();
      console.log('Podio configured:', configured);
      
      // For debugging, log where credentials are coming from
      if (import.meta.env.DEV) {
        const clientId = getPodioClientId();
        const clientSecret = getPodioClientSecret();
        console.log('Using Podio client ID from:', 
          import.meta.env.VITE_PODIO_CLIENT_ID ? 'environment variable' : 'localStorage');
        console.log('Using Podio client secret from:', 
          import.meta.env.VITE_PODIO_CLIENT_SECRET ? 'environment variable' : 'localStorage');
        console.log('Client ID available:', !!clientId);
        console.log('Client secret available:', !!clientSecret);
      }
      
      if (configured) {
        // First check if we're rate limited
        if (isRateLimited()) {
          const limitUntil = parseInt(localStorage.getItem('podio_rate_limit_until') || '0', 10);
          const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
          const errorMessage = `Rate limited. Please wait ${waitSecs} seconds before trying again.`;
          
          console.error(errorMessage);
          setPodioAuthError(errorMessage);
          
          toast({
            title: "Rate Limit Reached",
            description: `Please wait ${waitSecs} seconds before trying again.`,
            duration: 5000,
          });
          
          return;
        }
        
        console.log('Attempting initial Podio authentication with Password Flow');
        
        // Clear any previous errors
        setPodioAuthError(null);
        
        ensureInitialPodioAuth()
          .then(success => {
            console.log('Initial Podio authentication result:', success ? 'Success' : 'Failed');
            if (!success) {
              console.error('Could not automatically authenticate with Podio');
              // Clear tokens on authentication failure
              clearPodioTokens();
              
              // Check if we're rate limited after the attempt
              if (isRateLimited()) {
                const limitUntil = parseInt(localStorage.getItem('podio_rate_limit_until') || '0', 10);
                const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
                setPodioAuthError(`Rate limit reached. Please wait ${waitSecs} seconds before trying again.`);
                
                toast({
                  title: "Rate Limit Reached",
                  description: `Please wait ${waitSecs} seconds before trying again.`,
                  duration: 5000,
                });
              } else {
                setPodioAuthError('Could not connect to the service. Please check that your Podio app has the correct permissions.');
                
                toast({
                  title: "Connection Error",
                  description: "Could not connect to the service. Please check Podio permissions and try again.",
                  duration: 5000,
                });
              }
            }
          })
          .catch(err => {
            console.error('Error during automatic Podio authentication:', err);
            // Clear tokens on authentication error
            clearPodioTokens();
            
            // Check for rate limit errors
            if (err?.message?.includes('rate limit')) {
              const waitMatch = err.message.match(/wait\s+(\d+)\s+seconds/i);
              const waitSecs = waitMatch ? waitMatch[1] : '60';
              
              setPodioAuthError(`Rate limit reached. Please wait ${waitSecs} seconds before trying again.`);
              
              toast({
                title: "Rate Limit Reached",
                description: `Please wait ${waitSecs} seconds before trying again.`,
                duration: 5000,
              });
            } else {
              const errorMessage = err?.message || 'Could not connect to the service. Possible Podio scope issue.';
              setPodioAuthError(errorMessage);
              
              toast({
                title: "Connection Error",
                description: errorMessage,
                duration: 5000,
              });
            }
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
