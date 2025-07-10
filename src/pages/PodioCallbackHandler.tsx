import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import MainLayout from '../components/MainLayout';
import { ErrorBoundary } from '../components/ErrorBoundary';

function PodioCallbackHandlerComponent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'testing'>('testing');
  const [message, setMessage] = useState('Initializing callback handler...');
  const [debugInfo, setDebugInfo] = useState<any[]>([]);

  const addDebugInfo = (step: string, data: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[DEBUG ${timestamp}] ${step}:`, data);
    setDebugInfo(prev => [...prev, { step, data, timestamp }]);
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        addDebugInfo('Callback Handler Started', {
          userAgent: navigator.userAgent,
          currentUrl: window.location.href,
          searchParamsRaw: searchParams.toString()
        });

        // Step 1: Test Supabase Connection
        setStatus('testing');
        setMessage('Testing Supabase connection...');
        
        try {
          const { error: healthError } = await supabase.functions.invoke('health-check');
          addDebugInfo('Supabase Health Check', { 
            success: !healthError, 
            error: healthError?.message 
          });
          
          if (healthError) {
            throw new Error(`Supabase connection failed: ${healthError.message}`);
          }
        } catch (connectionError) {
          addDebugInfo('Supabase Connection Failed', connectionError);
          setStatus('error');
          setMessage('Cannot connect to Supabase. Please check your internet connection.');
          return;
        }

        // Step 2: Parse OAuth Parameters
        setStatus('processing');
        setMessage('Processing OAuth callback...');
        
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        addDebugInfo('OAuth Parameters Parsed', { 
          hasCode: !!code, 
          codeLength: code?.length,
          codePreview: code ? code.substring(0, 10) + '...' : null,
          state, 
          error, 
          errorDescription,
          allParams: Object.fromEntries(searchParams.entries())
        });

        // Step 3: Handle OAuth Errors
        if (error) {
          addDebugInfo('OAuth Error Received', { error, errorDescription });
          setStatus('error');
          setMessage(`OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
          return;
        }

        // Step 4: Validate Required Parameters
        if (!code || !state) {
          addDebugInfo('Missing Parameters', { hasCode: !!code, hasState: !!state });
          setStatus('error');
          setMessage('Missing required OAuth parameters (code or state)');
          return;
        }

        // Step 5: CSRF Protection
        const storedState = localStorage.getItem('podio_oauth_state');
        addDebugInfo('CSRF Validation', { 
          hasStoredState: !!storedState, 
          storedState: storedState?.substring(0, 10) + '...',
          receivedState: state?.substring(0, 10) + '...',
          statesMatch: storedState === state
        });

        if (storedState) {
          if (storedState !== state) {
            setStatus('error');
            setMessage('Invalid OAuth state. Possible CSRF attack detected.');
            return;
          }
          localStorage.removeItem('podio_oauth_state');
        } else {
          console.warn('No stored OAuth state found - proceeding without CSRF validation');
        }

        // Step 6: Call Edge Function
        setMessage('Exchanging authorization code for tokens...');
        addDebugInfo('Calling Edge Function', { 
          functionName: 'podio-oauth-callback',
          hasCode: !!code,
          hasState: !!state 
        });

        const startTime = performance.now();
        const { data, error: callbackError } = await supabase.functions.invoke('podio-oauth-callback', {
          body: { code, state }
        });
        const endTime = performance.now();
        
        addDebugInfo('Edge Function Response', { 
          success: !callbackError,
          responseTime: `${(endTime - startTime).toFixed(2)}ms`,
          data: data ? { ...data, access_token: data.access_token ? '[REDACTED]' : undefined } : null,
          error: callbackError 
        });

        // Step 7: Handle Edge Function Response
        if (callbackError) {
          addDebugInfo('Edge Function Error', callbackError);
          setStatus('error');
          setMessage(`Edge function error: ${callbackError.message || JSON.stringify(callbackError)}`);
          return;
        }

        if (!data || !data.success) {
          const errorMsg = data?.error_description || data?.error || 'OAuth callback processing failed';
          addDebugInfo('Callback Processing Failed', { data, errorMsg });
          setStatus('error');
          setMessage(`Callback failed: ${errorMsg}`);
          return;
        }

        // Step 8: Success
        addDebugInfo('OAuth Success', { success: true });
        setStatus('success');
        setMessage('OAuth setup completed successfully! You can now use the Podio integration.');

        toast({
          title: 'OAuth Setup Complete',
          description: 'Successfully connected to Podio via OAuth',
          variant: 'default'
        });

        // Redirect to setup page with success status after a short delay
        setTimeout(() => {
          navigate('/podio-setup?success=oauth_complete');
        }, 2000);

      } catch (error) {
        addDebugInfo('Unexpected Error', { 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Unexpected error occurred');
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  const getStatusIcon = () => {
    switch (status) {
      case 'testing':
        return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
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
      case 'testing':
        return 'text-yellow-600';
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
        <Card className="max-w-2xl mx-auto">
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

            {status === 'testing' && (
              <div className="text-sm text-yellow-600">
                Running connection tests...
              </div>
            )}

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

            {/* Debug Information Panel */}
            {debugInfo.length > 0 && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">
                  Debug Information ({debugInfo.length} steps)
                </summary>
                <div className="mt-2 bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
                  {debugInfo.map((info, index) => (
                    <div key={index} className="mb-2 border-b border-gray-200 pb-2 last:border-b-0">
                      <div className="font-medium text-gray-700">
                        {info.step} <span className="text-gray-500">({info.timestamp.split('T')[1]?.split('.')[0]})</span>
                      </div>
                      <pre className="mt-1 text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(info.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </details>
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