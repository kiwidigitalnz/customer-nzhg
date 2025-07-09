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
import { DebugLogger } from '@/utils/debugLogger';

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
      DebugLogger.info('SimplePodioSetupPage', 'Checking Podio connection status');
      
      // First test if auth URL generation works (this validates credentials)
      try {
        const { data: authData, error: authError } = await supabase.functions.invoke('podio-get-auth-url', {
          method: 'GET'
        });
        
        DebugLogger.info('SimplePodioSetupPage', 'Auth URL test response', { 
          hasError: !!authError, 
          hasData: !!authData,
          success: authData?.success
        });
        
        if (authError || !authData?.success) {
          DebugLogger.error('SimplePodioSetupPage', 'Auth URL generation failed', authError || authData);
          setPodioConnected(false);
          
          if (authData?.needs_setup) {
            toast({
              title: "Podio Configuration Required",
              description: authData.error || "Podio credentials need to be configured. Please contact support.",
              variant: "destructive"
            });
          }
          return;
        }
      } catch (error) {
        DebugLogger.error('SimplePodioSetupPage', 'Auth URL test failed', error);
        setPodioConnected(false);
        return;
      }
      
      // Now check for existing tokens
      try {
        const { data, error } = await supabase.functions.invoke('podio-token-refresh', {
          method: 'POST'
        });
        
        DebugLogger.info('SimplePodioSetupPage', 'Token refresh response received', { 
          hasError: !!error, 
          hasData: !!data,
          dataKeys: data ? Object.keys(data) : []
        });
        
        if (error) {
          DebugLogger.error('SimplePodioSetupPage', 'Token refresh error', error);
          
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
        
        // Check if we have a successful response with access token
        if (data && data.access_token && !data.error) {
          DebugLogger.info('SimplePodioSetupPage', 'Valid token found', {
            expires_at: data.expires_at,
            refreshed: data.refreshed,
            message: data.message
          });
          
          setPodioConnected(true);
          
          // Safely parse the expiry date
          const expiryDate = data.expires_at ? new Date(data.expires_at) : null;
          
          if (expiryDate && !isNaN(expiryDate.getTime())) {
            setLastAuth(expiryDate.toLocaleString());
            updateExpiryInfo(expiryDate);
            DebugLogger.info('SimplePodioSetupPage', 'Token expiry updated', {
              expiryDate: expiryDate.toISOString(),
              timeUntilExpiry: expiryDate.getTime() - Date.now()
            });
          } else {
            DebugLogger.warn('SimplePodioSetupPage', 'Invalid or missing expires_at date', data.expires_at);
            setLastAuth('Unknown');
            setTimeUntilExpiry('Unknown');
          }
          
          if (expiryDate && !isNaN(expiryDate.getTime())) {
            // Set up interval for time updates if not already set
            if (intervalId === null) {
              const id = window.setInterval(() => {
                updateExpiryInfo(expiryDate);
              }, 60000);
              setIntervalId(id);
            }
          }
        } else {
          // Handle error cases or invalid token responses
          console.log('Podio not connected - missing token or error in response:', data);
          setPodioConnected(false);
          setLastAuth(null);
          setTimeUntilExpiry(null);
          
          // Check for specific error conditions that require reauth
          if (data && (data.needs_reauth || data.needs_setup)) {
            toast({
              title: "Reauthorization Required",
              description: data.error || "Please reconnect to Podio",
              variant: "destructive"
            });
          }
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
    // Validate the expiry date
    if (!expiryDate || isNaN(expiryDate.getTime())) {
      console.warn('Invalid expiry date provided to updateExpiryInfo:', expiryDate);
      setTimeUntilExpiry("Invalid Date");
      setExpiryPercentage(0);
      return;
    }
    
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      setTimeUntilExpiry("Expired");
      setExpiryPercentage(0);
      setPodioConnected(false); // Mark as disconnected if expired
      return;
    }
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Ensure we don't get negative values
    if (diffHrs < 0 || diffMins < 0) {
      setTimeUntilExpiry("Expired");
      setExpiryPercentage(0);
      setPodioConnected(false);
      return;
    }
    
    setTimeUntilExpiry(`${diffHrs}h ${diffMins}m`);
    
    // Calculate percentage remaining (assuming 8-hour token lifespan)
    const totalMs = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    const percentage = Math.max(0, Math.min(100, (diffMs / totalMs) * 100));
    setExpiryPercentage(percentage);
    
    // Auto-disconnect if less than 5 minutes remaining
    if (diffMs < 5 * 60 * 1000) {
      setPodioConnected(false);
    }
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
    DebugLogger.info('SimplePodioSetupPage', 'Starting Podio OAuth connection flow');
    
    try {
      const { data, error } = await supabase.functions.invoke('podio-get-auth-url', {
        method: 'GET'
      });
      
      DebugLogger.info('SimplePodioSetupPage', 'Auth URL response received', { 
        hasError: !!error, 
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : []
      });
      
      if (error) {
        DebugLogger.error('SimplePodioSetupPage', 'Failed to get auth URL', error);
        toast({
          title: "Connection Setup Error",
          description: `Failed to initialize Podio connection: ${error.message || 'Unknown error'}`,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      if (!data || !data.authUrl) {
        const errorMsg = data?.error || 'No auth URL received';
        DebugLogger.error('SimplePodioSetupPage', 'Invalid auth URL response', data);
        toast({
          title: "Configuration Error",
          description: `Podio configuration issue: ${errorMsg}`,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      DebugLogger.info('SimplePodioSetupPage', 'Redirecting to Podio OAuth', { authUrl: data.authUrl });
      localStorage.setItem('podio_oauth_state', data.state);
      
      window.location.href = data.authUrl;
      
    } catch (error) {
      DebugLogger.error('SimplePodioSetupPage', 'Error during OAuth flow', error);
      toast({
        title: "Connection Error",
        description: `Failed to start Podio OAuth flow: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      
      if (data && data.access_token && !data.error) {
        setPodioConnected(true);
        
        // Safely parse the expiry date
        const expiryDate = data.expires_at ? new Date(data.expires_at) : null;
        
        if (expiryDate && !isNaN(expiryDate.getTime())) {
          setLastAuth(expiryDate.toLocaleString());
          updateExpiryInfo(expiryDate);
        } else {
          console.warn('Invalid or missing expires_at date in refresh:', data.expires_at);
          setLastAuth('Unknown');
          setTimeUntilExpiry('Unknown');
        }
        
        toast({
          title: "Status Refreshed",
          description: data.refreshed 
            ? "Podio token was refreshed successfully" 
            : "Podio connection is valid",
          variant: "default"
        });
      } else {
        setPodioConnected(false);
        setLastAuth(null);
        setTimeUntilExpiry(null);
        
        let errorMessage = "No valid Podio connection found";
        if (data && data.error) {
          errorMessage = data.error;
        }
        
        toast({
          title: "Not Connected",
          description: errorMessage,
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
