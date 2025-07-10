import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import MainLayout from '../components/MainLayout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw, ExternalLink, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';


const SimplePodioSetupPage = () => {
  const [podioConnected, setPodioConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAuth, setLastAuth] = useState<string | null>(null);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<string | null>(null);
  const [expiryPercentage, setExpiryPercentage] = useState(100);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  const success = searchParams.get('success');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  useEffect(() => {
    const checkPodioConnection = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('podio-authenticate', {
          method: 'GET'
        });
        
        if (error || !data?.success) {
          setPodioConnected(false);
          setLastAuth(null);
          setTimeUntilExpiry(null);
          return;
        }
        
        setPodioConnected(true);
        
        if (data.expires_at) {
          const expiryDate = new Date(data.expires_at);
          if (!isNaN(expiryDate.getTime())) {
            setLastAuth(expiryDate.toLocaleString());
            updateExpiryInfo(expiryDate);
            
            const intervalId = setInterval(() => {
              updateExpiryInfo(expiryDate);
            }, 60000);
            
            return () => clearInterval(intervalId);
          }
        }
      } catch (error) {
        setPodioConnected(false);
        setLastAuth(null);
        setTimeUntilExpiry(null);
      }
    };
    
    checkPodioConnection();
  }, []);

  const updateExpiryInfo = (expiryDate: Date) => {
    if (!expiryDate || isNaN(expiryDate.getTime())) {
      setTimeUntilExpiry("Invalid Date");
      setExpiryPercentage(0);
      return;
    }
    
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      setTimeUntilExpiry("Expired");
      setExpiryPercentage(0);
      setPodioConnected(false);
      return;
    }
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    setTimeUntilExpiry(`${diffHrs}h ${diffMins}m`);
    
    // Calculate percentage remaining (assuming 8-hour token lifespan)
    const totalMs = 8 * 60 * 60 * 1000;
    const percentage = Math.max(0, Math.min(100, (diffMs / totalMs) * 100));
    setExpiryPercentage(percentage);
    
    // Auto-disconnect if less than 5 minutes remaining
    if (diffMs < 5 * 60 * 1000) {
      setPodioConnected(false);
    }
  };

  useEffect(() => {
    if (success === 'oauth_complete') {
      toast({
        title: "Podio Connected Successfully",
        description: "Your app is now authenticated with Podio.",
        variant: "default"
      });
      // Refresh the page to update status
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else if (error) {
      toast({
        title: "Podio Connection Failed",
        description: errorDescription || error,
        variant: "destructive"
      });
    }
  }, [success, error, errorDescription, toast]);

  const handleConnectPodio = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('podio-oauth-url', {
        method: 'GET'
      });
      
      if (error || !data?.success) {
        toast({
          title: "Configuration Error",
          description: data?.error || error?.message || 'Failed to initialize OAuth flow',
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      localStorage.setItem('podio_oauth_state', data.state);
      window.location.href = data.authUrl;
      
    } catch (error) {
      toast({
        title: "Connection Error",
        description: `Failed to start OAuth flow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('podio-authenticate', {
        method: 'GET'
      });
      
      if (error || !data?.success) {
        setPodioConnected(false);
        setLastAuth(null);
        setTimeUntilExpiry(null);
        toast({
          title: "Not Connected",
          description: data?.error || "No valid Podio connection found",
          variant: "destructive"
        });
      } else {
        setPodioConnected(true);
        
        if (data.expires_at) {
          const expiryDate = new Date(data.expires_at);
          if (!isNaN(expiryDate.getTime())) {
            setLastAuth(expiryDate.toLocaleString());
            updateExpiryInfo(expiryDate);
          }
        }
        
        toast({
          title: "Status Refreshed",
          description: data.refreshed 
            ? "Token was refreshed successfully" 
            : "Connection is valid",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to connect to backend services.",
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
          </CardContent>
          <CardFooter>
            <div className="w-full flex flex-col sm:flex-row sm:justify-between gap-2">
              <Button 
                variant="outline" 
                onClick={handleRefreshStatus}
                disabled={isLoading}
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
                  disabled={isLoading}
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