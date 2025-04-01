
import LoginForm from '../components/LoginForm';
import MainLayout from '../components/MainLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, Info } from 'lucide-react';
import { isPodioConfigured } from '../services/podioAuth';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const LoginPage = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const podioConfigured = isPodioConfigured();
  const { forceReauthenticate } = useAuth();
  const [reAuthenticating, setReAuthenticating] = useState(false);
  const { toast } = useToast();

  const handleForceReauth = async () => {
    setReAuthenticating(true);
    try {
      const success = await forceReauthenticate();
      if (success) {
        toast({
          title: "Podio Reauthentication Successful",
          description: "Your app has been successfully reauthenticated with Podio."
        });
      } else {
        toast({
          title: "Podio Reauthentication Failed",
          description: "Failed to reauthenticate with Podio. Please check your API credentials.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Reauthentication Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setReAuthenticating(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <div className="w-full max-w-md mb-8">
          <div className="flex flex-col items-center mb-8">
            <img 
              src="https://dl.dropbox.com/scl/fi/ln475joiipgz6wb0vqos8/NZHG-Logo.png?rlkey=yh8katmkzr3h2lnd7mvswilul" 
              alt="NZ Honey Group" 
              className="h-16 mx-auto mb-4"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://placehold.co/240x80/F0F8FF/0078D7?text=NZ+Honey+Group';
              }}
            />
          </div>
          
          {isDevelopment && !podioConfigured && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Development Mode</AlertTitle>
              <AlertDescription>
                Podio API not configured. You may need to set up the connection first.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Force Reauthentication Button */}
          <div className="mb-4 flex justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleForceReauth}
              disabled={reAuthenticating}
              className="text-xs"
            >
              {reAuthenticating && (
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              )}
              {!reAuthenticating && (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              Reauthorize with Podio
            </Button>
          </div>
          
          <LoginForm />
        </div>
      </div>
    </MainLayout>
  );
};

export default LoginPage;
