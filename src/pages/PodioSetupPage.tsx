
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import MainLayout from '../components/MainLayout';
import { useNavigate } from 'react-router-dom';
import { authenticateWithClientCredentials, isPodioConfigured } from '@/services/podioAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

const PodioSetupPage = () => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

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
        description: "Podio API credentials saved",
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

  const handleConnectPodio = async () => {    
    if (!isPodioConfigured()) {
      toast({
        title: "Error",
        description: "Please save Client ID and Secret first",
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
          variant: "default"
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
            
            <div className="bg-amber-50 p-4 rounded-md text-sm">
              <p className="font-medium text-amber-800">Podio API Setup Instructions:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-amber-700">
                <li>Go to <a href="https://podio.com/settings/api" target="_blank" rel="noopener noreferrer" className="underline">Podio API Settings</a></li>
                <li>Click "Generate API Key"</li>
                <li>Enter your application name (e.g., "NZHG Customer Portal")</li>
                <li>For domain, enter: <strong>{window.location.origin}</strong></li>
                <li>Copy the Client ID and Client Secret provided by Podio</li>
                <li>Paste them in the fields above and save</li>
              </ol>
              <p className="mt-2 text-amber-800 font-medium">Important:</p>
              <p className="text-amber-700">Make sure the domain entered in Podio exactly matches: <strong>{window.location.origin}</strong></p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleSaveCredentials}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Credentials'}
            </Button>
            
            <div className="space-x-2">
              {connectionStatus === 'success' && (
                <Button onClick={goToDashboard}>
                  Go to Dashboard
                </Button>
              )}
              
              <Button 
                onClick={handleConnectPodio}
                disabled={connecting}
                variant={connectionStatus === 'success' ? 'outline' : 'default'}
              >
                {connecting ? 'Connecting...' : 'Connect to Podio'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PodioSetupPage;
