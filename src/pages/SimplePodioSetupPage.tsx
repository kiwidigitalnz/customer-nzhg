
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import MainLayout from '../components/MainLayout';
import { useNavigate } from 'react-router-dom';
import { authenticateWithClientCredentials } from '@/services/podioAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

const SimplePodioSetupPage = () => {
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const [loadingDebugInfo, setLoadingDebugInfo] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
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
          
          // Automatically check secrets configuration
          getSecretsDebugInfo();
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
        title: "Configuration Checked",
        description: "Successfully retrieved Podio configuration status",
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

  const testPodioAuth = async () => {
    setLoadingDebugInfo(true);
    try {
      // Call the edge function to get debug info and test auth
      const { data, error } = await supabase.functions.invoke('health-check', {
        method: 'POST',
        body: { 
          check_secrets: true,
          test_auth: true 
        }
      });
      
      if (error) {
        console.error('Error testing Podio auth:', error);
        toast({
          title: "Error",
          description: "Failed to test Podio authentication",
          variant: "destructive"
        });
        return;
      }
      
      setDebugInfo(data);
      
      if (data.auth_test?.success) {
        toast({
          title: "Authentication Successful",
          description: "Successfully authenticated with Podio API",
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: data.auth_test?.error || "Failed to authenticate with Podio API",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing Podio auth:', error);
      toast({
        title: "Error",
        description: "Failed to test Podio authentication",
        variant: "destructive"
      });
    } finally {
      setLoadingDebugInfo(false);
    }
  };

  const handleConnectPodio = async () => {
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
      const success = await authenticateWithClientCredentials();
      
      if (success) {
        setConnectionStatus('success');
        toast({
          title: "Success",
          description: "Connected to Podio API successfully",
        });
      } else {
        setConnectionStatus('error');
        setConnectionError("Failed to authenticate with Podio. Please check your credentials.");
        toast({
          title: "Connection Error",
          description: "Failed to authenticate with Podio API",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error connecting to Podio:', error);
      setConnectionStatus('error');
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setConnectionError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  // Determine if all required secrets are configured
  const allSecretsConfigured = debugInfo.secrets && 
    Object.values(debugInfo.secrets).every(value => Boolean(value));

  return (
    <MainLayout>
      <div className="container mx-auto py-10">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Podio Integration Status</CardTitle>
            <CardDescription>
              Check the status of your Podio API integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mb-4 flex items-center gap-2">
              <span>Supabase Connection:</span>
              <Badge variant={supabaseConnected ? "secondary" : "destructive"}>
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
                  Your app is now connected to the Podio API. You can proceed to the dashboard.
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
            
            {Object.keys(debugInfo).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Supabase Secrets Configuration</h3>
                
                {allSecretsConfigured ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertTitle>All Secrets Configured</AlertTitle>
                    <AlertDescription>
                      All required Podio secrets are properly configured in Supabase.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Missing Secrets</AlertTitle>
                    <AlertDescription>
                      Some required Podio secrets are missing or not properly configured in Supabase.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="bg-slate-50 p-3 rounded text-xs font-mono">
                  <p className="font-semibold mb-1">Secrets Status:</p>
                  <ul className="space-y-1">
                    {debugInfo.secrets && Object.entries(debugInfo.secrets).map(([key, value]) => (
                      <li key={key}>
                        {key}: <span className={value ? "text-green-600" : "text-red-600"}>{value ? "✓" : "✗"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {debugInfo.auth_test && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Authentication Test Result</h3>
                    <div className="bg-slate-50 p-3 rounded text-xs font-mono">
                      <p className="font-semibold">Status: 
                        <span className={debugInfo.auth_test.success ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                          {debugInfo.auth_test.success ? "Success" : "Failed"}
                        </span>
                      </p>
                      {debugInfo.auth_test.success ? (
                        <div className="mt-1">
                          <p>Token Type: {debugInfo.auth_test.token_type}</p>
                          <p>Expires In: {debugInfo.auth_test.expires_in}s</p>
                          <p>Scope: {debugInfo.auth_test.scope}</p>
                        </div>
                      ) : (
                        <div className="mt-1 text-red-600">
                          <p>Error: {debugInfo.auth_test.error || "Unknown error"}</p>
                          {debugInfo.auth_test.status && <p>Status Code: {debugInfo.auth_test.status}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <Alert className="bg-blue-50 border-blue-100">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-700">Required Configuration</AlertTitle>
              <AlertDescription className="text-blue-600 text-sm">
                <p>Make sure all of these Supabase secrets are configured:</p>
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
          </CardContent>
          <CardFooter className="flex justify-between flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={getSecretsDebugInfo}
              disabled={loadingDebugInfo || !supabaseConnected}
              size="sm"
            >
              {loadingDebugInfo ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Check Configuration
            </Button>
            
            <Button 
              variant="outline"
              onClick={testPodioAuth}
              disabled={loadingDebugInfo || !supabaseConnected}
              size="sm"
            >
              Test Authentication
            </Button>
            
            <div className="w-full flex justify-between mt-4">
              {connectionStatus === 'success' && (
                <Button onClick={goToDashboard}>
                  Go to Dashboard
                </Button>
              )}
              
              <Button 
                onClick={handleConnectPodio}
                disabled={connecting || !supabaseConnected}
                className="ml-auto"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : 'Connect to Podio'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SimplePodioSetupPage;
