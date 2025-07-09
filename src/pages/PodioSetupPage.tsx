import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import MainLayout from '../components/MainLayout';
import { useNavigate } from 'react-router-dom';
import { isPodioConfigured, authenticateWithClientCredentials, validateContactsAppAccess, clearTokens } from '@/services/podioAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Info, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

const PodioSetupPage = () => {
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const [loadingDebugInfo, setLoadingDebugInfo] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any existing tokens when entering setup page to prevent loops
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reauth') === 'required') {
      console.log('Reauth required - clearing tokens');
      clearTokens();
    }
    
    // Check if Supabase Edge Functions are available
    const checkSupabaseConnection = async () => {
      try {
        console.log('Checking Supabase connection via health-check function');
        const { data, error } = await supabase.functions.invoke('health-check', {
          method: 'GET'
        });
        
        if (error) {
          console.error('Supabase health check error:', error);
          setSupabaseConnected(false);
          toast({
            title: "Supabase Connection Issue",
            description: "Unable to connect to Supabase Edge Functions. Please set up Supabase first.",
            variant: "destructive"
          });
        } else {
          console.log('Supabase health check successful:', data);
          setSupabaseConnected(true);
        }
      } catch (error) {
        console.error('Error checking Supabase connection:', error);
        setSupabaseConnected(false);
        toast({
          title: "Supabase Connection Issue",
          description: "Unable to connect to Supabase Edge Functions. Please set up Supabase first.",
          variant: "destructive"
        });
      }
    };
    
    checkSupabaseConnection();
  }, [toast]);

  useEffect(() => {
    // Load stored credentials if available
    const storedClientId = localStorage.getItem('podio_client_id');
    const storedClientSecret = localStorage.getItem('podio_client_secret');
    
    if (storedClientId) setClientId(storedClientId);
    if (storedClientSecret) setClientSecret(storedClientSecret);
  }, []);

  const handleSaveCredentials = () => {
    if (!clientId || !clientSecret) {
      toast({
        title: "Error",
        description: "Please enter both Client ID and Client Secret",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Store in localStorage for development/testing
      localStorage.setItem('podio_client_id', clientId);
      localStorage.setItem('podio_client_secret', clientSecret);
      
      toast({
        title: "Success",
        description: "Podio API credentials saved locally. Remember to add them to Supabase secrets!",
        variant: "default"
      });

      // Reset connection status when credentials change
      setConnectionStatus('idle');
      setConnectionError(null);
    } catch (error) {
      toast({
        title: "Error Saving Credentials",
        description: "Failed to save credentials. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getSecretsDebugInfo = async () => {
    setLoadingDebugInfo(true);
    try {
      // Call the edge function to get debug info about the secrets
      const { data, error } = await supabase.functions.invoke('health-check', {
        method: 'POST',
        body: { check_secrets: true }
      });
      
      if (error) {
        console.error('Error getting debug info:', error);
        toast({
          title: "Error",
          description: "Failed to get debug information",
          variant: "destructive"
        });
        return;
      }
      
      setDebugInfo(data);
      
      toast({
        title: "Debug Info Retrieved",
        description: "Successfully retrieved Podio configuration debug info",
      });
    } catch (error) {
      console.error('Error getting debug info:', error);
      toast({
        title: "Error",
        description: "Failed to get debug information",
        variant: "destructive"
      });
    } finally {
      setLoadingDebugInfo(false);
    }
  };

  const handleStartOAuth = async () => {
    if (!supabaseConnected) {
      toast({
        title: "Supabase Not Connected",
        description: "Supabase Edge Functions are required for Podio integration. Please set up Supabase first.",
        variant: "destructive"
      });
      return;
    }

    setConnecting(true);
    setConnectionStatus('idle');
    setConnectionError(null);
    
    try {
      console.log('Starting OAuth flow...');
      
      // Get the OAuth authorization URL from the edge function
      const { data, error } = await supabase.functions.invoke('podio-get-auth-url', {
        method: 'GET'
      });
      
      if (error) {
        console.error('Error getting auth URL:', error);
        throw new Error(error.message || 'Failed to get authorization URL');
      }
      
      if (!data || !data.authUrl) {
        throw new Error('No authorization URL received');
      }
      
      console.log('Redirecting to OAuth URL...');
      
      // Store the state for later validation
      if (data.state) {
        localStorage.setItem('podio_oauth_state', data.state);
      }
      
      // Redirect to Podio OAuth
      window.location.href = data.authUrl;
      
    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      setConnectionStatus('error');
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setConnectionError(errorMessage);
      
      toast({
        title: "OAuth Error",
        description: errorMessage,
        variant: "destructive"
      });
      setConnecting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!supabaseConnected) {
      toast({
        title: "Supabase Not Connected",
        description: "Supabase Edge Functions are required for Podio integration. Please set up Supabase first.",
        variant: "destructive"
      });
      return;
    }

    setConnecting(true);
    setConnectionStatus('idle');
    setConnectionError(null);
    
    try {
      // Check if we have valid OAuth tokens
      const success = await authenticateWithClientCredentials();
      
      if (success) {
        setConnectionStatus('success');
        toast({
          title: "Success",
          description: "OAuth tokens are valid and working",
          variant: "default"
        });
        
        // Test access to the Contacts app
        try {
          const hasAccess = await validateContactsAppAccess();
          
          if (hasAccess) {
            toast({
              title: "App Access Confirmed",
              description: "Successfully confirmed access to the Contacts app",
              variant: "default"
            });
          } else {
            toast({
              title: "App Access Issue",
              description: "OAuth tokens work, but could not access the Contacts app. Check app permissions.",
              variant: "destructive"
            });
          }
        } catch (appError) {
          console.error('Error checking app access:', appError);
          toast({
            title: "App Access Check Failed",
            description: "Could not verify access to the Contacts app",
            variant: "destructive"
          });
        }
        
      } else {
        setConnectionStatus('error');
        setConnectionError("No valid OAuth tokens found. Please complete OAuth setup.");
        toast({
          title: "Authentication Required",
          description: "No valid OAuth tokens found. Please complete OAuth setup.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setConnectionStatus('error');
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setConnectionError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setConnecting(false);
    }
  };

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-10">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Podio API Setup</CardTitle>
            <CardDescription>
              Configure your Podio API credentials to connect the portal to Podio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mb-4 flex items-center gap-2">
              <span>Supabase Connection:</span>
              <Badge variant={supabaseConnected ? "default" : "destructive"}>
                {supabaseConnected ? "Connected" : "Not Connected"}
              </Badge>
            </div>
            
            {!supabaseConnected && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Supabase Required</AlertTitle>
                <AlertDescription>
                  <p>Supabase Edge Functions are required for Podio integration to work properly.</p>
                  <p className="mt-2">Please connect your project to Supabase using the Supabase button at the top right of your Lovable interface.</p>
                </AlertDescription>
              </Alert>
            )}
          
            {connectionStatus === 'success' && (
              <Alert className="mb-4">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-600">Connected Successfully</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your app is now connected to the Podio API. You can now proceed to the dashboard.
                </AlertDescription>
              </Alert>
            )}
            
            {connectionStatus === 'error' && connectionError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Failed</AlertTitle>
                <AlertDescription>{connectionError}</AlertDescription>
              </Alert>
            )}
          
            <div className="space-y-2">
              <Label htmlFor="client-id">Client ID</Label>
              <Input
                id="client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter Podio Client ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-secret">Client Secret</Label>
              <Input
                id="client-secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Enter Podio Client Secret"
              />
            </div>
            
            <Alert className="bg-blue-50 border-blue-100">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-700">Important</AlertTitle>
              <AlertDescription className="text-blue-600 text-sm">
                <p>After saving credentials locally, you must add them to Supabase secrets for production use.</p>
                <p className="mt-2">
                  Required Supabase secrets:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>PODIO_CLIENT_ID</li>
                  <li>PODIO_CLIENT_SECRET</li>
                  <li>PODIO_CONTACTS_APP_TOKEN</li>
                  <li>PODIO_PACKING_SPEC_APP_TOKEN</li>
                  <li>PODIO_CONTACTS_APP_ID</li>
                  <li>PODIO_PACKING_SPEC_APP_ID</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <div className="bg-blue-50 p-4 rounded-md text-sm">
              <p className="font-medium text-blue-800">OAuth Setup Instructions:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-700">
                <li>Ensure your PODIO_CLIENT_ID and PODIO_CLIENT_SECRET are configured in Supabase secrets</li>
                <li>Click "Start OAuth Setup" below to begin the authorization process</li>
                <li>You'll be redirected to Podio to authorize this application</li>
                <li>After authorization, you'll be redirected back here</li>
                <li>Use "Test Connection" to verify everything is working</li>
              </ol>
              <p className="mt-2 text-blue-800 font-medium">Note:</p>
              <p className="text-blue-700">This uses OAuth 2.0 flow for secure access to your Podio data. No passwords are stored locally.</p>
            </div>

            {/* Debug section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium mb-2">Debug Tools</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={getSecretsDebugInfo}
                disabled={loadingDebugInfo || !supabaseConnected}
                className="w-full mb-2"
              >
                {loadingDebugInfo && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Check Supabase Secrets Configuration
              </Button>
              
              {Object.keys(debugInfo).length > 0 && (
                <div className="bg-slate-50 p-3 rounded text-xs font-mono">
                  <p className="font-semibold mb-1">Secrets Status:</p>
                  <ul className="space-y-1">
                    {Object.entries(debugInfo.secrets || {}).map(([key, value]) => (
                      <li key={key}>
                        {key}: <span className={value ? "text-green-600" : "text-red-600"}>{value ? "✓" : "✗"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleSaveCredentials}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Credentials Locally'}
            </Button>
            
            <div className="space-x-2">
              {connectionStatus === 'success' && (
                <Button onClick={goToDashboard}>
                  Go to Dashboard
                </Button>
              )}
              
              <Button 
                onClick={handleStartOAuth}
                disabled={connecting || !supabaseConnected}
                variant="default"
                className="mr-2"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Starting OAuth...
                  </>
                ) : 'Start OAuth Setup'}
              </Button>
              
              <Button 
                onClick={handleTestConnection}
                disabled={connecting || !supabaseConnected}
                variant="outline"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : 'Test Connection'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PodioSetupPage;
