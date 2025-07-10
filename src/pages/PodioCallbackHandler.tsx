import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import MainLayout from '../components/MainLayout';
import { ErrorBoundary } from '../components/ErrorBoundary';

function PodioCallbackHandlerComponent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(`OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Missing required OAuth parameters');
          return;
        }

        // CSRF Protection
        const storedState = localStorage.getItem('podio_oauth_state');
        if (storedState && storedState !== state) {
          setStatus('error');
          setMessage('Invalid OAuth state. Please try again.');
          return;
        }
        localStorage.removeItem('podio_oauth_state');

        // Exchange code for tokens
        const { data, error: callbackError } = await supabase.functions.invoke('podio-oauth-callback', {
          body: { code, state }
        });

        if (callbackError) {
          setStatus('error');
          setMessage(`Error: ${callbackError.message}`);
          return;
        }

        if (!data || !data.success) {
          setStatus('error');
          setMessage(data?.error || 'OAuth callback processing failed');
          return;
        }

        setStatus('success');
        setMessage('OAuth setup completed successfully!');

        toast({
          title: 'OAuth Setup Complete',
          description: 'Successfully connected to Podio',
          variant: 'default'
        });

        setTimeout(() => {
          navigate('/podio-setup?success=oauth_complete');
        }, 2000);

      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Unexpected error occurred');
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-10">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              Podio OAuth Callback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription className={getStatusColor()}>
                {message}
              </AlertDescription>
            </Alert>

            {status === 'processing' && (
              <div className="text-sm text-muted-foreground">
                Please wait while we complete your OAuth setup...
              </div>
            )}

            {status === 'success' && (
              <div className="text-sm text-green-600">
                Redirecting you back to the setup page...
              </div>
            )}

            {status === 'error' && (
              <div className="text-sm text-red-600">
                <p>Please try the OAuth setup process again.</p>
                <p className="mt-2">
                  <a href="/podio-setup" className="underline">
                    Return to Podio Setup
                  </a>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function PodioCallbackHandler() {
  return (
    <ErrorBoundary fallbackMessage="Failed to load OAuth callback handler. Please try again.">
      <PodioCallbackHandlerComponent />
    </ErrorBoundary>
  );
}