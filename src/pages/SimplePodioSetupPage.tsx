
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
        const { data, error } = await supabase.functions.invoke('health-check', {
          method: 'GET'
        });
        
        if (error) {
          setSupabaseConnected(false);
          toast({
            title: "Supabase Connection Issue",
            description: "Unable to connect to Supabase Edge Functions. Please contact support.",
            variant: "destructive"
          });
        } else {
          setSupabaseConnected(true);
        }
      } catch (error) {
        setSupabaseConnected(false);
        toast({
          title: "Supabase Connection Issue",
          description: "Unable to connect to Supabase Edge Functions. Please contact support.",
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
          if (error.message && error.message.includes('relation "podio_auth_tokens" does not exist')) {
            toast({
              title: "Database Setup Required",
              description: "Please contact support to complete the database setup.",
              variant: "destructive"
            });
          }
          
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
        setPodioConnected(false);
      }
    };
    
    checkPodioConnection();
  }, [supabaseConnected, toast]);

  useEffect(() => {
    if (success) {
      toast({
        title: "Podio Connected Successfully",
        description: "Your app is now authenticated with Podio.",
        variant: "default"
      });
    } else if (error) {
      let description = errorDescription || error;
      
      toast({
        title: "Podio Connection Failed",
        description: description,
        variant: "destructive"
      });
    }
  }, [success, error, errorDescription, toast]);

  const handleConnectPodio = async () => {
    if (!supabaseConnected) {
      toast({
        title: "Connection Error",
        description: "Backend services are not available. Please contact support.",
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
        toast({
          title: "Error",
          description: "Failed to initialize Podio connection. Please contact support.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // Store state in localStorage for verification when callback happens
      localStorage.setItem('podio_oauth_state', data.state);
      
      // Redirect to the Podio authorization URL
      window.location.href = data.authUrl;
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start Podio OAuth flow. Please contact support.",
        variant: "destructive"
      });
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
        toast({
          title: "Error",
          description: "Failed to refresh Podio connection status. Please contact support.",
          variant: "destructive"
        });
        
        setIsLoading(false);
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
      toast({
        title: "Error",
        description: "Unable to connect to backend services. Please contact support.",
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
            <CardTitle>Podio Connection</CardTitle>
            <CardDescription>
              Connect your application to Podio using OAuth authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mb-4 flex items-center justify-between">
              <span>Backend Connection:</span>
              <Badge variant={supabaseConnected ? "default" : "destructive"}>
                {supabaseConnected ? "Connected" : "Unavailable"}
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
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>
                  <p>Backend services are currently unavailable. Please try again later or contact support.</p>
                </AlertDescription>
              </Alert>
            )}
          
            {podioConnected && (
              <Alert className="mb-4">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle className="font-semibold text-green-600">Connected Successfully</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your app is now connected to the Podio API. Users can log in with their portal credentials.
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Failed</AlertTitle>
                <AlertDescription>
                  {errorDescription || error}
                </AlertDescription>
              </Alert>
            )}
            
            <Alert className="bg-blue-50 border-blue-100">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-700">How OAuth Works</AlertTitle>
              <AlertDescription className="text-blue-600 text-sm">
                <p>This process authenticates your application with Podio to access data:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Click "Connect to Podio" below</li>
                  <li>Sign in to Podio and authorize this application</li>
                  <li>A secure connection will be established</li>
                  <li>All users of the portal can use this shared connection</li>
                </ol>
                <p className="mt-2">The connection refreshes automatically for uninterrupted service.</p>
              </AlertDescription>
            </Alert>
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
