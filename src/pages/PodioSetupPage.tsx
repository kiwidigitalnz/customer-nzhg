
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import MainLayout from '../components/MainLayout';
import { useNavigate } from 'react-router-dom';

const PodioSetupPage = () => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [currentDomain, setCurrentDomain] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Load stored credentials if available
    const storedClientId = localStorage.getItem('podio_client_id');
    const storedClientSecret = localStorage.getItem('podio_client_secret');
    
    if (storedClientId) setClientId(storedClientId);
    if (storedClientSecret) setClientSecret(storedClientSecret);
    
    // Use the new domain for authentication
    setCurrentDomain('https://customer.nzhg.com');
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

    // Generate a random state parameter for security
    const state = Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
    localStorage.setItem('podio_auth_state', state);

    // Build the authorization URL with the new domain
    const params = new URLSearchParams({
      client_id: storedClientId,
      redirect_uri: `https://customer.nzhg.com/podio-callback`,
      response_type: 'code',
      state: state
      // Removed the scope parameter to match the automatic flow
      // This will default to 'global:all' which works in both flows
    });
    
    const authUrl = `https://podio.com/oauth/authorize?${params.toString()}`;
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
      // Use the new domain for redirect URI
      const redirectUri = `https://customer.nzhg.com/podio-callback`;
      const tokenUrl = 'https://podio.com/oauth/token';
      
      // Log information for debugging
      console.log('Exchanging code with params:', {
        client_id: clientId,
        redirect_uri: redirectUri,
        code: manualCode
      });
      
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
                <li>For domain, enter: <strong>https://customer.nzhg.com</strong></li>
                <li>Copy the Client ID and Client Secret provided by Podio</li>
                <li>Paste them in the fields above and save</li>
              </ol>
              <p className="mt-2 text-amber-800 font-medium">Important:</p>
              <p className="text-amber-700">Make sure the domain entered in Podio exactly matches: <strong>https://customer.nzhg.com</strong></p>
            </div>
            
            <Tabs defaultValue="automatic" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="automatic">Automatic</TabsTrigger>
                <TabsTrigger value="manual">Manual Code</TabsTrigger>
              </TabsList>
              <TabsContent value="automatic" className="py-4">
                <p className="mb-4 text-sm text-muted-foreground">
                  Click the button below to initiate the automatic OAuth flow with Podio.
                  Note: This may not work in development environments due to domain restrictions.
                </p>
                <Button onClick={handleAuthorizePodio} className="w-full">
                  Authorize with Podio
                </Button>
              </TabsContent>
              <TabsContent value="manual" className="py-4">
                <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded-md text-sm mb-4">
                    <p className="font-medium text-blue-800">Manual Authorization Steps:</p>
                    <ol className="list-decimal list-inside mt-1 space-y-1 text-blue-700">
                      <li>Open this URL in a new tab: 
                        <div className="mt-1 mb-2">
                          <Input 
                            readOnly
                            value={`https://podio.com/oauth/authorize?client_id=${clientId || '[CLIENT_ID]'}&redirect_uri=${encodeURIComponent('https://customer.nzhg.com/podio-callback')}&response_type=code`}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            className="text-xs font-mono p-2 bg-blue-100"
                          />
                        </div>
                      </li>
                      <li>After authorizing, you'll be redirected to a page that might show an error</li>
                      <li>Copy the <strong>code</strong> parameter from the URL in your browser address bar</li>
                      <li>The URL will look like: https://customer.nzhg.com/podio-callback?code=<strong>abc123...</strong></li>
                      <li>Paste only the code value below (not the full URL)</li>
                    </ol>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="manual-code">Authorization Code</Label>
                    <Input
                      id="manual-code"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Paste only the code value here"
                    />
                  </div>
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
