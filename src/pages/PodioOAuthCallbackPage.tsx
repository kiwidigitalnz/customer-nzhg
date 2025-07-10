import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePodioAuth } from '@/hooks/usePodioAuth';
import MainLayout from '../components/MainLayout';

const PodioOAuthCallbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth callback...');
  const { checkAuthentication } = usePodioAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract URL parameters
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`OAuth error: ${error}`);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Missing authorization code or state parameter');
          return;
        }

        // Call the callback function
        const response = await fetch(`/functions/v1/podio-oauth-callback${location.search}`, {
          method: 'GET',
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage('Successfully connected to Podio!');
          
          // Refresh authentication state
          setTimeout(async () => {
            await checkAuthentication();
            // Close popup window if this is running in a popup
            if (window.opener) {
              window.close();
            } else {
              // Navigate to setup page if not in popup
              navigate('/podio-setup');
            }
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to complete OAuth flow');
        }
      } catch (error) {
        console.error('Callback processing error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred during authentication');
      }
    };

    handleCallback();
  }, [location.search, navigate, checkAuthentication]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <LoadingSpinner size="lg" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-12 w-12 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className={`text-xl font-bold ${getStatusColor()}`}>
              {status === 'loading' && 'Connecting to Podio...'}
              {status === 'success' && 'Connection Successful!'}
              {status === 'error' && 'Connection Failed'}
            </CardTitle>
            <CardDescription>
              {message}
            </CardDescription>
          </CardHeader>
          
          {status === 'error' && (
            <CardContent className="text-center">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Please try connecting again or contact support if the issue persists.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => navigate('/podio-setup')}>
                    Back to Setup
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/dashboard')}
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </MainLayout>
  );
};

export default PodioOAuthCallbackPage;