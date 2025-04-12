import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import MainLayout from '../components/MainLayout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Info, RefreshCw, ExternalLink, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

const SimplePodioSetupPage = () => {
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [podioConnected, setPodioConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAuth, setLastAuth] = useState<string | null>(null);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<string | null>(null);
  const [expiryPercentage, setExpiryPercentage] = useState(100);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [intervalId, setIntervalId] = useState<number | null>(null);

  const success = searchParams.get('success');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const reauth = searchParams.get('reauth');

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
          
          updateExpiryInfo(expiryDate);
          
          if (intervalId === null) {
            const id = window.setInterval(() => {
              updateExpiryInfo(expiryDate);
            }, 60000);
            setIntervalId(id);
          }
        } else {
          setPodioConnected(false);
        }
      } catch (error) {
        setPodioConnected(false);
      }
    };
    
    checkPodioConnection();
    
    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [supabaseConnected, toast, intervalId]);

  const updateExpiryInfo = (expiryDate: Date) => {
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      setTimeUntilExpiry("Expired");
      setExpiryPercentage(0);
      return;
    }
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    setTimeUntilExpiry(`${diffHrs}h ${diffMins}m`);
    
    const totalMs = 8 * 60 * 60 * 1000;
    const elapsed = totalMs - diffMs;
    const percentage = Math.max(0, Math.min(100, 100 - (elapsed / totalMs * 100)));
    setExpiryPercentage(percentage);
  };

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
    } else if (reauth === 'required') {
      toast({
        title: "Podio Reauthorization Required",
        description: "Your Podio token has expired and needs to be refreshed.",
        variant: "destructive"
      });
    }
  }, [success, error, errorDescription, reauth, toast]);

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
      
      localStorage.setItem('podio_oauth_state', data.state);
      
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
        
        updateExpiryInfo(expiryDate);
        
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
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Token valid until: {lastAuth}</span>
                </div>
                
                {timeUntilExpiry && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span>Time remaining:</span>
                      <span className={expiryPercentage < 20 ? "text-red-500 font-medium" : ""}>
                        {timeUntilExpiry}
                      </span>
                    </div>
                    <Progress value={expiryPercentage} className="h-1.5" />
                  </div>
                )}
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
            
            {reauth === 'required' && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Reauthorization Required</AlertTitle>
                <AlertDescription>
                  Your Podio authorization has expired. Please reconnect to Podio using the button below.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <div className="w-full flex flex-col sm:flex-row sm:justify-between gap-2">
              <Button 
                variant="outline" 
                onClick={handleRefreshStatus}
                disabled={isLoading || !supabaseConnected}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : 'Refresh Status'}
              </Button>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {podioConnected && (
                  <Button 
                    onClick={goToDashboard}
                    className="w-full sm:w-auto"
                  >
                    Go to Dashboard
                  </Button>
                )}
                
                <Button 
                  onClick={handleConnectPodio}
                  disabled={isLoading || !supabaseConnected}
                  variant={podioConnected ? 'outline' : 'default'}
                  className="w-full sm:w-auto"
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
            </div>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SimplePodioSetupPage;
