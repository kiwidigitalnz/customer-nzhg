
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import MainLayout from '../components/MainLayout';

const PodioCallbackPage = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Podio authorization...');
  const [authCode, setAuthCode] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Get the authorization code from the URL
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    
    if (!code) {
      setStatus('error');
      setMessage('No authorization code received from Podio');
      return;
    }

    // Display the code for manual copying
    setAuthCode(code);

    const processAuth = async () => {
      try {
        // Get stored credentials
        const clientId = localStorage.getItem('podio_client_id');
        const clientSecret = localStorage.getItem('podio_client_secret');
        
        if (!clientId || !clientSecret) {
          setStatus('error');
          setMessage('Podio API credentials not found');
          return;
        }

        // Exchange code for access token
        // Use window.location.origin for exact domain matching
        const redirectUri = `${window.location.origin}/podio-callback`;
        const tokenUrl = 'https://podio.com/oauth/token';
        
        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            redirect_uri: redirectUri,
          }).toString(),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error_description || 'Failed to exchange code for token');
        }

        const tokenData = await response.json();
        
        // Store tokens locally (for development only)
        localStorage.setItem('podio_access_token', tokenData.access_token);
        localStorage.setItem('podio_refresh_token', tokenData.refresh_token);
        localStorage.setItem('podio_token_expiry', (Date.now() + tokenData.expires_in * 1000).toString());
        
        setStatus('success');
        setMessage('Successfully connected to Podio API!');
        
        toast({
          title: "Success",
          description: "Connected to Podio API successfully",
        });
      } catch (error) {
        console.error('Podio auth error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'An unknown error occurred');
        
        toast({
          title: "Error",
          description: "Failed to connect to Podio API",
          variant: "destructive",
        });
      }
    };

    processAuth();
  }, [location.search, toast]);

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
            <div className={`p-4 rounded-md ${
              status === 'loading' ? 'bg-blue-50 text-blue-700' :
              status === 'success' ? 'bg-green-50 text-green-700' :
              'bg-red-50 text-red-700'
            }`}>
              <p>{message}</p>
              
              {authCode && status === 'error' && (
                <div className="mt-4">
                  <p className="font-medium">If automatic processing failed, you can use this code manually:</p>
                  <div className="bg-white p-2 rounded border mt-2 font-mono text-sm overflow-x-auto">
                    {authCode}
                  </div>
                  <p className="mt-2 text-sm">Copy this code and use it in the Manual Code tab on the Podio Setup page.</p>
                </div>
              )}
            </div>
            <div className="flex justify-center">
              <Button onClick={() => navigate('/podio-setup')}>
                {status === 'success' ? 'Back to Setup' : 'Try Again'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PodioCallbackPage;
