
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MainLayout from '../components/MainLayout';
import { useNavigate } from 'react-router-dom';

const PodioSetupPage = () => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [manualCode, setManualCode] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSaveCredentials = () => {
    if (!clientId || !clientSecret) {
      toast({
        title: "Error",
        description: "Please enter both Client ID and Client Secret",
        variant: "destructive"
      });
      return;
    }

    // Store in localStorage for development
    localStorage.setItem('podio_client_id', clientId);
    localStorage.setItem('podio_client_secret', clientSecret);
    
    toast({
      title: "Success",
      description: "Podio API credentials saved"
    });
  };

  const handleAuthorizePodio = () => {
    const storedClientId = localStorage.getItem('podio_client_id');
    
    if (!storedClientId) {
      toast({
        title: "Error",
        description: "Please save Client ID and Secret first",
        variant: "destructive"
      });
      return;
    }

    // Redirect to Podio OAuth authorization
    const redirectUri = encodeURIComponent(`${window.location.origin}/podio-callback`);
    const authUrl = `https://podio.com/oauth/authorize?client_id=${storedClientId}&redirect_uri=${redirectUri}&scope=global`;
    
    window.location.href = authUrl;
  };

  const handleManualCodeSubmit = async () => {
    if (!manualCode) {
      toast({
        title: "Error",
        description: "Please enter the authorization code",
        variant: "destructive"
      });
      return;
    }

    const clientId = localStorage.getItem('podio_client_id');
    const clientSecret = localStorage.getItem('podio_client_secret');

    if (!clientId || !clientSecret) {
      toast({
        title: "Error",
        description: "Please save Client ID and Secret first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Exchange code for access token
      const redirectUri = `${window.location.origin}/podio-callback`;
      const tokenUrl = 'https://podio.com/oauth/token';
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code: manualCode,
          redirect_uri: redirectUri,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error_description || 'Failed to exchange code for token');
      }

      const tokenData = await response.json();
      
      // Store tokens locally (for development only)
      localStorage.setItem('podio_access_token', tokenData.access_token);
      localStorage.setItem('podio_refresh_token', tokenData.refresh_token);
      localStorage.setItem('podio_token_expiry', (Date.now() + tokenData.expires_in * 1000).toString());
      
      toast({
        title: "Success",
        description: "Connected to Podio API successfully",
      });

      // Navigate to dashboard or where appropriate
      navigate('/dashboard');
    } catch (error) {
      console.error('Error exchanging code:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect to Podio API",
        variant: "destructive",
      });
    }
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
            <div className="space-y-2">
              <label htmlFor="client-id" className="text-sm font-medium">
                Client ID
              </label>
              <Input
                id="client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter Podio Client ID"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="client-secret" className="text-sm font-medium">
                Client Secret
              </label>
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
                <li>For domain, enter only: <strong>localhost</strong> (for development)</li>
                <li>Copy the Client ID and Client Secret provided by Podio</li>
                <li>Paste them in the fields above and save</li>
              </ol>
            </div>
            
            <Tabs defaultValue="automatic" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="automatic">Automatic</TabsTrigger>
                <TabsTrigger value="manual">Manual Code</TabsTrigger>
              </TabsList>
              <TabsContent value="automatic" className="py-4">
                <p className="mb-4 text-sm text-muted-foreground">
                  Click the button below to initiate the automatic OAuth flow with Podio.
                </p>
                <Button onClick={handleAuthorizePodio} className="w-full">
                  Authorize with Podio
                </Button>
              </TabsContent>
              <TabsContent value="manual" className="py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="manual-code" className="text-sm font-medium">
                      Authorization Code
                    </label>
                    <Input
                      id="manual-code"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Enter the authorization code from Podio"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    1. Go to <a href={`https://podio.com/oauth/authorize?client_id=${localStorage.getItem('podio_client_id') || '[CLIENT_ID]'}&redirect_uri=${encodeURIComponent(`${window.location.origin}/podio-callback`)}&scope=global`} target="_blank" rel="noopener noreferrer" className="underline">
                      Podio Authorization Page
                    </a><br />
                    2. Authorize the application<br />
                    3. Copy the 'code' parameter from the resulting URL<br />
                    4. Paste the code in the field above
                  </p>
                  <Button onClick={handleManualCodeSubmit} className="w-full">
                    Submit Code
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleSaveCredentials}>
              Save Credentials
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PodioSetupPage;
