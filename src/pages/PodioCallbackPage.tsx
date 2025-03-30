
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import MainLayout from '../components/MainLayout';
import { exchangeCodeForToken } from '../services/podio/podioOAuth';

const PodioCallbackPage = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Podio authorization...');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    const incomingState = urlParams.get('state');
    
    if (!code) {
      setStatus('error');
      setMessage('No authorization code received from Podio');
      return;
    }

    // In a popup scenario, send the code back to the parent window
    if (window.opener && !window.opener.closed) {
      console.log('Sending auth code to parent window');
      window.opener.postMessage({
        type: 'PODIO_AUTH_CODE',
        code,
        state: incomingState
      }, window.location.origin);
      
      setStatus('success');
      setMessage('Authorization successful! You can close this window.');
      
      // Close this window after a brief delay
      setTimeout(() => {
        window.close();
      }, 2000);
      
      return;
    }

    // Direct navigation flow - process the code here (fallback for manual process)
    const savedState = localStorage.getItem('podio_auth_state');
    
    // Verify state parameter to prevent CSRF attacks
    if (!incomingState || !savedState || incomingState !== savedState) {
      console.error('State parameter mismatch:', { incomingState, savedState });
      setStatus('error');
      setMessage('Invalid state parameter - authorization request may have been tampered with');
      return;
    }

    // Clear the stored state after validation
    localStorage.removeItem('podio_auth_state');
    
    // Exchange the code for tokens
    const redirectUri = 'https://customer.nzhg.com/podio-callback';
    exchangeCodeForToken(code, redirectUri)
      .then(success => {
        if (success) {
          setStatus('success');
          setMessage('Successfully connected to Podio API!');
          
          // Add a timer to automatically redirect to the landing page after success
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Failed to exchange authorization code for access token');
        }
      })
      .catch(error => {
        console.error('Error exchanging code:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      });
  }, [location.search, navigate]);

  return (
    <MainLayout>
      <div className="container mx-auto py-10">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>
              {status === 'loading' && 'Connecting to Podio...'}
              {status === 'success' && 'Podio Connection Successful'}
              {status === 'error' && 'Podio Connection Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert 
              variant={
                status === 'loading' ? 'default' :
                status === 'success' ? 'default' :
                'destructive'
              }
              className={`${
                status === 'loading' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                status === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              <AlertTitle className="font-semibold">
                {status === 'loading' ? 'Processing' :
                 status === 'success' ? 'Success' :
                 'Error'}
              </AlertTitle>
              <AlertDescription>{message}</AlertDescription>
              {status === 'success' && (
                <p className="mt-2 text-sm">Redirecting to home page...</p>
              )}
            </Alert>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PodioCallbackPage;
