
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import MainLayout from '../components/MainLayout';
import { useNavigate } from 'react-router-dom';
import { authenticateWithClientCredentials } from '@/services/podioApi';

const PodioSetupPage = () => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
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

    // Store in localStorage for development
    localStorage.setItem('podio_client_id', clientId);
    localStorage.setItem('podio_client_secret', clientSecret);
    
    toast({
      title: "Success",
      description: "Podio API credentials saved"
    });
  };

  const handleConnectPodio = async () => {
    const storedClientId = localStorage.getItem('podio_client_id');
    const storedClientSecret = localStorage.getItem('podio_client_secret');
    
    if (!storedClientId || !storedClientSecret) {
      toast({
        title: "Error",
        description: "Please save Client ID and Secret first",
        variant: "destructive"
      });
      return;
    }

    try {
      await authenticateWithClientCredentials();
      
      toast({
        title: "Success",
        description: "Connected to Podio API successfully",
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error connecting to Podio:', error);
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
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleSaveCredentials}>
              Save Credentials
            </Button>
            <Button onClick={handleConnectPodio}>
              Connect to Podio
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PodioSetupPage;
