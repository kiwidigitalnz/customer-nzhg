
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
  getPodioClientSecret,
  getPodioApiDomain
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
      
      // Log environment information
      console.log('[Index] Environment:', import.meta.env.DEV ? 'development' : 'production');
      console.log('[Index] Browser:', navigator.userAgent);
      console.log('[Index] URL:', window.location.href);
      console.log('[Index] Podio API domain:', getPodioApiDomain());
      
      // Check if Podio is configured with environment variables
      console.log('[Index] Checking Podio configuration');
      const configured = isPodioConfigured();
      console.log('[Index] Podio configured:', configured);
      
      // For debugging, log where credentials are coming from
      if (import.meta.env.DEV) {
        const clientId = getPodioClientId();
        const clientSecret = getPodioClientSecret();
        console.log('[Index] Using Podio client ID from:', 
          import.meta.env.VITE_PODIO_CLIENT_ID ? 'environment variable' : 'localStorage');
        console.log('[Index] Using Podio client secret from:', 
          import.meta.env.VITE_PODIO_CLIENT_SECRET ? 'environment variable' : 'localStorage');
        console.log('[Index] Client ID available:', !!clientId);
        console.log('[Index] Client secret available:', !!clientSecret);
        console.log('[Index] VITE_PODIO_CLIENT_ID:', import.meta.env.VITE_PODIO_CLIENT_ID ? 'defined' : 'undefined');
        console.log('[Index] VITE_PODIO_CLIENT_SECRET:', import.meta.env.VITE_PODIO_CLIENT_SECRET ? 'defined' : 'undefined');
        
        if (clientId) {
          console.log('[Index] Client ID first 5 chars:', clientId.substring(0, 5) + '...');
        }
      }
      
      if (configured) {
        // First check if we're rate limited
        if (isRateLimited()) {
          const limitUntil = parseInt(localStorage.getItem('podio_rate_limit_until') || '0', 10);
          const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
          const errorMessage = `Rate limited. Please wait ${waitSecs} seconds before trying again.`;
          
          console.error('[Index] ' + errorMessage);
          setPodioAuthError(errorMessage);
          
          toast({
            title: "Rate Limit Reached",
            description: `Please wait ${waitSecs} seconds before trying again.`,
            duration: 5000,
          });
          
          return;
        }
        
        console.log('[Index] Attempting initial Podio authentication with Password Flow');
        
        // Clear any previous errors
        setPodioAuthError(null);
        
        ensureInitialPodioAuth()
          .then(success => {
            console.log('[Index] Initial Podio authentication result:', success ? 'Success' : 'Failed');
            if (!success) {
              console.error('[Index] Could not automatically authenticate with Podio');
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
            } else {
              // Try to call a simple endpoint to verify token works
              const accessToken = localStorage.getItem('podio_access_token');
              if (accessToken) {
                console.log('[Index] Testing token with a basic API call...');
                
                const apiDomain = getPodioApiDomain();
                fetch(`https://${apiDomain}/org/`, {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`
                  }
                })
                .then(response => {
                  console.log('[Index] Test API call status:', response.status);
                  if (response.ok) {
                    return response.json();
                  }
                  console.error('[Index] Test API call failed with status:', response.status);
                  return response.text().then(text => {
                    try {
                      return JSON.parse(text);
                    } catch (e) {
                      return { error: text };
                    }
                  });
                })
                .then(data => {
                  if (Array.isArray(data)) {
                    console.log('[Index] Test API call successful, organizations count:', data.length);
                  } else {
                    console.error('[Index] Test API call error body:', data);
                  }
                })
                .catch(err => {
                  console.error('[Index] Error during test API call:', err);
                });
              }
            }
          })
          .catch(err => {
            console.error('[Index] Error during automatic Podio authentication:', err);
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
        console.error('[Index] Podio not properly configured. Check environment variables.');
        setPodioAuthError('Podio API is not properly configured. Please check your client credentials.');
        
        if (import.meta.env.DEV) {
          console.log('[Index] To configure Podio:');
          console.log('1. Ensure .env.development has the correct VITE_PODIO_CLIENT_ID and VITE_PODIO_CLIENT_SECRET');
          console.log('2. Or use the Podio Setup page to enter credentials manually');
          console.log('3. Ensure the Podio app has the correct permissions for the Contacts and Packing Specs apps');
          
          // Check for stored client credentials
          const clientId = localStorage.getItem('podio_client_id');
          const clientSecret = localStorage.getItem('podio_client_secret');
          
          console.log('[Index] Local storage client ID:', clientId ? 'Present' : 'Not found');
          console.log('[Index] Local storage client secret:', clientSecret ? 'Present' : 'Not found');
        }
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
