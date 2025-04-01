
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import MainLayout from '../components/MainLayout';
import { ScrollArea } from '@/components/ui/scroll-area';

const PodioCallbackPage = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Podio authorization...');
  const [debugDetails, setDebugDetails] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Add debug details
    const addDebugDetail = (detail: string) => {
      setDebugDetails(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${detail}`]);
    };

    // Show a message that we're using app authentication now
    setStatus('success');
    setMessage('Authentication is now handled using app authentication flow. You will be redirected to the login page.');
    addDebugDetail('Callback page loaded');
    addDebugDetail('OAuth flow is now replaced with direct app authentication');
    addDebugDetail('This page is kept for backward compatibility');
    
    // Get URL params for debugging
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    const incomingState = urlParams.get('state');
    const error = urlParams.get('error');
    
    if (error) {
      addDebugDetail(`OAuth error: ${error}`);
      addDebugDetail(`Error description: ${urlParams.get('error_description') || 'None provided'}`);
    } else if (code) {
      addDebugDetail(`Authorization code received: ${code.substring(0, 10)}...`);
      addDebugDetail(`State parameter: ${incomingState || 'None'}`);
      addDebugDetail('Note: This code is not being used since we now use app authentication');
    } else {
      addDebugDetail('No authorization code or error in URL parameters');
    }
    
    // Redirect to home page after a brief delay
    addDebugDetail('Will redirect to login page in 3 seconds');
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 3000);
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
            
            {debugDetails.length > 0 && (
              <div className="mt-4 border rounded-md p-3">
                <h3 className="text-sm font-medium mb-2">Debug Details</h3>
                <ScrollArea className="h-60">
                  <div className="space-y-1">
                    {debugDetails.map((detail, index) => (
                      <p key={index} className="text-xs font-mono">{detail}</p>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PodioCallbackPage;
