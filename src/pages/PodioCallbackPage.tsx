
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import MainLayout from '../components/MainLayout';
import { exchangeCodeForToken, getPodioRedirectUri } from '../services/podio/podioOAuth';

const PodioCallbackPage = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Podio authorization...');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Show a message that we're no longer using this flow
    setStatus('success');
    setMessage('Authentication is now handled automatically. You will be redirected to the login page.');
    
    // Redirect to home page after a brief delay
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 3000);
    
    // The code below is kept for backward compatibility but won't be executed
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    const incomingState = urlParams.get('state');
    
    if (!code) {
      return;
    }

    // In a popup scenario, send the code back to the parent window
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type: 'PODIO_AUTH_CODE',
        code,
        state: incomingState
      }, window.location.origin);
      
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
      return;
    }

    // Clear the stored state after validation
    localStorage.removeItem('podio_auth_state');
    
    // Exchange the code for tokens
    const redirectUri = getPodioRedirectUri();
    exchangeCodeForToken(code, redirectUri);
  }, [location.search, navigate]);

  return (
    <MainLayout>
      <div className="container mx-auto py-10">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>
              {status === 'loading' && 'Connecting to Podio...'}
              {status === 'success' && 'Podio Connection Info'}
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
                 status === 'success' ? 'Information' :
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
