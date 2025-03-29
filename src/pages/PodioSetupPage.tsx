
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import MainLayout from '../components/MainLayout';

const PodioSetupPage = () => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const { toast } = useToast();

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
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleSaveCredentials}>
              Save Credentials
            </Button>
            <Button onClick={handleAuthorizePodio}>
              Authorize with Podio
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PodioSetupPage;
