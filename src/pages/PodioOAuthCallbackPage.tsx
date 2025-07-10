import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { usePodioAuth } from '@/hooks/usePodioAuth';

export default function PodioOAuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth callback...');
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuthentication } = usePodioAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

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

      try {
        // Call the OAuth callback function
        const { data, error: callbackError } = await supabase.functions.invoke('podio-oauth-callback', {
          method: 'POST',
          body: {
            code,
            state,
          },
        });

        if (callbackError) {
          console.error('OAuth callback failed:', callbackError);
          setStatus('error');
          setMessage('Failed to complete OAuth process. Please try again.');
          return;
        }

        // Success
        setStatus('success');
        setMessage('Successfully connected to Podio!');

        // Update auth state
        await checkAuthentication();

        // Redirect to setup page after successful authentication
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleCallback();
  }, [location.search, navigate, checkAuthentication]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-8 w-8 text-red-500" />;
      default:
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-700';
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      default:
        return 'text-blue-700';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className={getStatusColor()}>
            {status === 'loading' && 'Connecting to Podio...'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'error' && (
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
              >
                Back to Setup
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')} 
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
          {status === 'success' && (
            <p className="text-sm text-muted-foreground text-center">
              Redirecting to setup page...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}