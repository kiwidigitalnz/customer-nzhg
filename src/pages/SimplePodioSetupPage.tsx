import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Loader2, Settings, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePodioAuth } from '@/hooks/usePodioAuth';
import { useToast } from '@/hooks/use-toast';

export default function SimplePodioSetupPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    isAuthenticated,
    isConfigured,
    user,
    isLoading,
    error,
    initiateOAuth,
    disconnect,
    checkAuthentication
  } = usePodioAuth();

  const handleConnect = async () => {
    try {
      const authUrl = await initiateOAuth();
      
      // Open popup window
      const popup = window.open(
        authUrl,
        'podio-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Poll for popup closure
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          // Check authentication after popup closes
          checkAuthentication();
          toast({
            title: "Connection completed",
            description: "Please wait while we verify your connection...",
          });
        }
      }, 1000);

      // Cleanup after 5 minutes
      setTimeout(() => {
        clearInterval(pollTimer);
        if (popup && !popup.closed) {
          popup.close();
        }
      }, 5 * 60 * 1000);
    } catch (error) {
      console.error('Connection failed:', error);
      toast({
        title: "Connection failed",
        description: "Failed to initiate Podio connection. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from Podio.",
      });
    } catch (error) {
      console.error('Disconnect failed:', error);
      toast({
        title: "Disconnect failed",
        description: "Failed to disconnect from Podio. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    if (isLoading) {
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
      <Badge variant="outline" className="flex items-center gap-2">
        <AlertCircle className="h-3 w-3" />
        Not Connected
      </Badge>
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Podio Integration Setup</h1>
            <p className="text-muted-foreground mt-2">
              Connect your Podio account to access packing specifications and manage workflows.
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Connection Status
                  </CardTitle>
                  <CardDescription>
                    Current status of your Podio integration
                  </CardDescription>
                </div>
                {getStatusBadge()}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!isConfigured && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Podio OAuth is not configured. Please contact your administrator to set up the integration.
                  </AlertDescription>
                </Alert>
              )}

              {user && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Connected Account</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {user.name}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Podio ID:</strong> {user.podio_user_id}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {isConfigured && !isAuthenticated && (
                  <Button onClick={handleConnect} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Connect to Podio
                  </Button>
                )}

                {isAuthenticated && (
                  <Button variant="outline" onClick={handleDisconnect} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Disconnect
                  </Button>
                )}

                {isAuthenticated && (
                  <Button onClick={() => navigate('/dashboard')}>
                    Go to Dashboard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Available Features
              </CardTitle>
              <CardDescription>
                What you can do once connected to Podio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Packing Specifications</h4>
                  <p className="text-sm text-muted-foreground">
                    View and manage packing specifications with approval workflows
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Document Management</h4>
                  <p className="text-sm text-muted-foreground">
                    Access and download documents, images, and specifications
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Approval Workflows</h4>
                  <p className="text-sm text-muted-foreground">
                    Participate in approval processes with digital signatures
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Real-time Updates</h4>
                  <p className="text-sm text-muted-foreground">
                    Get live updates on specification changes and comments
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}