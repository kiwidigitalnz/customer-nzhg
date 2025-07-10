import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ExternalLink, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { usePodioAuth } from '@/hooks/usePodioAuth';
import MainLayout from '../components/MainLayout';

const SimplePodioSetupPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  
  const {
    isAuthenticated,
    isConfigured,
    user,
    loading,
    error,
    initiateOAuth,
    disconnect,
    checkAuthentication
  } = usePodioAuth();

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const authUrl = await initiateOAuth();
      // Open in a new window for OAuth flow
      const popup = window.open(authUrl, 'podio-oauth', 'width=600,height=700');
      
      // Poll for completion
      const pollForCompletion = setInterval(() => {
        try {
          if (popup?.closed) {
            clearInterval(pollForCompletion);
            setIsConnecting(false);
            // Check if authentication was successful
            setTimeout(() => {
              checkAuthentication();
            }, 1000);
          }
        } catch (error) {
          // Ignore cross-origin errors
        }
      }, 1000);
      
    } catch (error) {
      console.error('OAuth initiation failed:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Podio",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from Podio",
      });
    } catch (error) {
      toast({
        title: "Disconnection Failed",
        description: error instanceof Error ? error.message : "Failed to disconnect from Podio",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    if (loading) {
      return (
        <Badge variant="secondary" className="flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking...
        </Badge>
      );
    }
    
    if (!isConfigured) {
      return (
        <Badge variant="destructive" className="flex items-center gap-2">
          <AlertCircle className="h-3 w-3" />
          Not Configured
        </Badge>
      );
    }
    
    if (isAuthenticated) {
      return (
        <Badge variant="default" className="flex items-center gap-2">
          <CheckCircle className="h-3 w-3" />
          Connected
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="flex items-center gap-2">
        <AlertCircle className="h-3 w-3" />
        Not Connected
      </Badge>
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Podio Integration Setup</CardTitle>
            <CardDescription>
              {isAuthenticated 
                ? "Your Podio account is connected and ready to use"
                : "Connect your Podio account to access packing specifications"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium">Connection Status</div>
              </div>
              {getStatusBadge()}
            </div>
            
            {/* Error Display */}
            {error && (
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <div className="font-medium text-red-800">Connection Error</div>
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* User Info Display */}
            {isAuthenticated && user && (
              <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="font-medium text-green-800">Connected to Podio</div>
                    <div className="text-sm text-green-700 space-y-1">
                      <div><strong>Name:</strong> {user.name}</div>
                      <div><strong>Email:</strong> {user.email}</div>
                      {user.username && <div><strong>Username:</strong> {user.username}</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {!isConfigured && (
              <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <div className="font-medium text-orange-800">OAuth Not Configured</div>
                    <div className="text-sm text-orange-700">
                      Podio OAuth credentials need to be configured in the Supabase environment. 
                      Please contact your administrator to set up the required PODIO_CLIENT_ID and PODIO_CLIENT_SECRET.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <Separator />
            
            {/* Information Section */}
            <div className="space-y-3">
              <h3 className="font-medium">Available Features</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  Once connected to Podio, you'll have access to:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Packing specification management</li>
                  <li>Approval status tracking</li>
                  <li>Comment and update systems</li>
                  <li>Document generation and review</li>
                  <li>Real-time synchronization with Podio</li>
                </ul>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex gap-3 justify-center">
            {isAuthenticated ? (
              <>
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2"
                >
                  Go to Dashboard
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={handleDisconnect}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={handleConnect}
                  disabled={!isConfigured || isConnecting}
                  className="flex items-center gap-2"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect to Podio
                      <ExternalLink className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  Go to Dashboard
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SimplePodioSetupPage;