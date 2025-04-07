
import LoginForm from '../components/LoginForm';
import MainLayout from '../components/MainLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, Info, Shield } from 'lucide-react';
import { isPodioConfigured, validateContactsAppAccess } from '../services/podioAuth';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const podioConfigured = isPodioConfigured();
  const { forceReauthenticate, isAuthenticated } = useAuth();
  const [reAuthenticating, setReAuthenticating] = useState(false);
  const [appAccessStatus, setAppAccessStatus] = useState<'checking' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [checkingAccess, setCheckingAccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Check Podio app access on mount
    const checkPodioAccess = async () => {
      if (!podioConfigured) return;
      
      setCheckingAccess(true);
      setAppAccessStatus('checking');
      
      try {
        const hasAccess = await validateContactsAppAccess();
        setAppAccessStatus(hasAccess ? 'granted' : 'denied');
        
        if (!hasAccess) {
          console.error('No access to Contacts app');
          toast({
            title: "API Permission Issue",
            description: "The app doesn't have permission to access the Contacts database. Please try reauthorizing.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error checking Podio access:', error);
        setAppAccessStatus('unknown');
      } finally {
        setCheckingAccess(false);
      }
    };
    
    checkPodioAccess();
  }, [podioConfigured, toast]);

  const handleForceReauth = async () => {
    setReAuthenticating(true);
    try {
      const success = await forceReauthenticate();
      if (success) {
        toast({
          title: "Podio App Authentication Successful",
          description: "Your app has been successfully authenticated with Podio."
        });
        
        // Check access again after reauth
        setAppAccessStatus('checking');
        const hasAccess = await validateContactsAppAccess();
        setAppAccessStatus(hasAccess ? 'granted' : 'denied');
        
        if (!hasAccess) {
          toast({
            title: "Permission Issue Persists",
            description: "Still unable to access Contacts app. Please check API permissions in Podio.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Podio Authentication Failed",
          description: "Failed to authenticate app with Podio. Please check your API credentials.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setReAuthenticating(false);
    }
  };

  const navigateToSetup = () => {
    navigate('/podio-setup');
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
          
          {!podioConfigured && (
            <Alert className="mb-4" variant="destructive">
              <Info className="h-4 w-4" />
              <AlertTitle>Podio Not Configured</AlertTitle>
              <AlertDescription className="flex flex-col">
                <p>Podio API credentials are not configured. Please set up the API connection first.</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={navigateToSetup}
                  className="mt-2 self-start"
                >
                  Go to Podio Setup
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {appAccessStatus === 'denied' && (
            <Alert className="mb-4" variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertTitle>API Permission Issue</AlertTitle>
              <AlertDescription>
                The app doesn't have access to the Contacts database. This is likely a Podio API permission issue.
                Try reauthorizing below or contact your administrator.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Only show the reconnect button if Podio is configured */}
          {podioConfigured && (
            <div className="mb-4 flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleForceReauth}
                disabled={reAuthenticating || checkingAccess}
                className="text-xs"
              >
                {(reAuthenticating || appAccessStatus === 'checking') && (
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                )}
                {!reAuthenticating && appAccessStatus !== 'checking' && (
                  <RefreshCw className="mr-1 h-3 w-3" />
                )}
                Reconnect to Podio API
              </Button>
            </div>
          )}
          
          <LoginForm />
        </div>
      </div>
    </MainLayout>
  );
};

export default LoginPage;
