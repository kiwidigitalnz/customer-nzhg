import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import MainLayout from '../components/MainLayout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Info, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SimplePodioSetupPage = () => {
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [podioConnected, setPodioConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAuth, setLastAuth] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  const success = searchParams.get('success');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  useEffect(() => {
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
    if (!supabaseConnected) return;
    
    const checkPodioConnection = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('podio-token-refresh', {
          method: 'POST'
        });
        
        if (error) {
          console.error('Failed to retrieve Podio tokens:', error);
          setPodioConnected(false);
          return;
        }
        
        if (data) {
          setPodioConnected(true);
          const expiryDate = new Date(data.expires_at);
          setLastAuth(expiryDate.toLocaleString());
        } else {
          setPodioConnected(false);
        }
      } catch (error) {
        console.error('Error checking Podio connection:', error);
        setPodioConnected(false);
      }
    };
    
    checkPodioConnection();
  }, [supabaseConnected]);

  useEffect(() => {
    if (success) {
      toast({
        title: "Podio Connected Successfully",
        description: "Your app is now authenticated with Podio.",
        variant: "default"
      });
    } else if (error) {
      toast({
        title: "Podio Connection Failed",
        description: errorDescription || error,
        variant: "destructive"
      });
    }
  }, [success, error, errorDescription, toast]);

  const handleConnectPodio = async () => {
    if (!supabaseConnected) {
      toast({
        title: "Supabase Not Connected",
        description: "Supabase Edge Functions are required for Podio integration. Please set up Supabase first.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('podio-get-auth-url', {
        method: 'GET'
      });
      
      if (error) {
        console.error('Failed to get auth URL:', error);
        toast({
          title: "Error",
          description: "Failed to initialize Podio OAuth flow",
          variant: "destructive"
        });
        return;
      }
      
      localStorage.setItem('podio_oauth_state', data.state);
      
      window.location.href = data.authUrl;
      
    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      toast({
        title: "Error",
        description: "Failed to start Podio OAuth flow",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('podio-token-refresh', {
        method: 'POST'
      });
      
      if (error) {
        console.error('Failed to refresh Podio status:', error);
        toast({
          title: "Error",
          description: "Failed to refresh Podio connection status",
          variant: "destructive"
        });
        return;
      }
      
      if (data) {
        setPodioConnected(true);
        const expiryDate = new Date(data.expires_at);
        setLastAuth(expiryDate.toLocaleString());
        
        toast({
          title: "Status Refreshed",
          description: data.refreshed 
            ? "Podio token was refreshed successfully" 
            : "Podio connection is valid",
          variant: "default"
        });
      } else {
        setPodioConnected(false);
        toast({
          title: "Not Connected",
          description: "No valid Podio connection found",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error refreshing status:', error);
      toast({
        title: "Error",
        description: "Failed to refresh Podio connection status",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
            <CardTitle>Podio OAuth Setup</CardTitle>
            <CardDescription>
              Connect your application to Podio using OAuth authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mb-4 flex items-center justify-between">
              <span>Supabase Connection:</span>
              <Badge variant={supabaseConnected ? "default" : "destructive"}>
                {supabaseConnected ? "Connected" : "Not Connected"}
              </Badge>
            </div>
            
            <div className="mb-4 flex items-center justify-between">
              <span>Podio OAuth Status:</span>
              <Badge variant={podioConnected ? "default" : "outline"} className={podioConnected ? "bg-green-500 hover:bg-green-600 text-white" : ""}>
                {podioConnected ? "Authorized" : "Not Authorized"}
              </Badge>
            </div>
            
            {lastAuth && (
              <div className="text-sm text-muted-foreground">
                Token valid until: {lastAuth}
              </div>
            )}
            
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
          
            {podioConnected && (
              <Alert className="mb-4">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-600">Connected Successfully</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your app is now connected to the Podio API. Users can log in with their portal credentials.
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Failed</AlertTitle>
                <AlertDescription>{errorDescription || error}</AlertDescription>
              </Alert>
            )}
            
            <Alert className="bg-blue-50 border-blue-100">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-700">How OAuth Works</AlertTitle>
              <AlertDescription className="text-blue-600 text-sm">
                <p>This setup uses OAuth to authenticate your application with Podio:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>An admin clicks "Connect to Podio" below</li>
                  <li>They sign in to Podio and authorize this application</li>
                  <li>Podio provides an access token that is securely stored</li>
                  <li>All users of the portal can now use this shared connection</li>
                </ol>
                <p className="mt-2">You only need to do this once. The token will be refreshed automatically.</p>
              </AlertDescription>
            </Alert>
            
            <div className="bg-amber-50 p-4 rounded-md text-sm">
              <p className="font-medium text-amber-800">Required Supabase Setup:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-amber-700">
                <li>Create a <code>podio_auth_tokens</code> table in your Supabase database</li>
                <li>Configure your Podio API credentials as Supabase secrets</li>
                <li>Deploy the Edge Functions included with this app</li>
              </ol>
              <p className="mt-2 text-amber-800 font-medium">Important Podio Settings:</p>
              <p className="text-amber-700">Make sure your Podio API app has a domain that matches: <strong>https://customer.nzhg.com</strong></p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleRefreshStatus}
              disabled={isLoading || !supabaseConnected}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : 'Refresh Status'}
            </Button>
            
            <div className="space-x-2">
              {podioConnected && (
                <Button onClick={goToDashboard}>
                  Go to Dashboard
                </Button>
              )}
              
              <Button 
                onClick={handleConnectPodio}
                disabled={isLoading || !supabaseConnected}
                variant={podioConnected ? 'outline' : 'default'}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {podioConnected ? 'Reconnect to Podio' : 'Connect to Podio'}
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SimplePodioSetupPage;
