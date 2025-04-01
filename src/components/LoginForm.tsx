
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  isPodioConfigured, 
  isRateLimited, 
  authenticateWithClientCredentials, 
  getContactsAppToken,
  authenticateWithContactsAppToken,
  validateContactsAppAccess 
} from '../services/podioApi';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [connectingToPodio, setConnectingToPodio] = useState(false);
  const [validatingAppAccess, setValidatingAppAccess] = useState(false);
  const [podioAPIError, setPodioAPIError] = useState<string | null>(null);
  const { login, loading, error } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Initial Podio configuration check
  useEffect(() => {
    const checkPodioConfig = async () => {
      console.log('Checking Podio configuration');
      const configured = isPodioConfigured();
      console.log('Podio configured:', configured);
      
      if (configured) {
        console.log('Attempting initial Podio authentication');
        setConnectingToPodio(true);
        
        try {
          // First authenticate with client credentials
          const result = await authenticateWithClientCredentials();
          console.log('Initial Podio authentication result:', result ? 'Success' : 'Failed');
          
          if (result) {
            // Validate app access
            setValidatingAppAccess(true);
            const appAccess = await validateContactsAppAccess();
            if (!appAccess) {
              setPodioAPIError('The application does not have permission to access the Contacts app. Please check your Podio API permissions.');
            }
            setValidatingAppAccess(false);
          } else {
            setPodioAPIError('Could not connect to Podio API. Please check your credentials.');
          }
        } catch (err) {
          console.error('Error during Podio configuration check:', err);
          setPodioAPIError('Failed to connect to Podio API.');
        } finally {
          setConnectingToPodio(false);
        }
      }
    };
    
    checkPodioConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setPodioAPIError(null);
    
    if (!username || !password) {
      toast({
        title: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    // Check if we're rate limited
    if (isRateLimited()) {
      toast({
        title: 'Rate Limit Reached',
        description: 'Please wait before trying again.',
        variant: 'destructive',
      });
      return;
    }

    console.log(`Attempting login with username: ${username}`);
    
    try {
      // Check if we have the Contacts app token
      const contactsAppToken = getContactsAppToken();
      if (!contactsAppToken) {
        toast({
          title: 'Configuration Error',
          description: 'Missing Contacts app token. Please check your configuration.',
          variant: 'destructive',
        });
        return;
      }
      
      // First ensure we're connected to Podio
      setConnectingToPodio(true);
      const podioConnected = await authenticateWithClientCredentials();
      
      if (!podioConnected) {
        toast({
          title: 'Connection Error',
          description: 'Could not connect to Podio. Please check credentials and try again later.',
          variant: 'destructive',
        });
        setConnectingToPodio(false);
        return;
      }
      
      // Validate Contacts app access
      setValidatingAppAccess(true);
      const appAccess = await validateContactsAppAccess();
      setValidatingAppAccess(false);
      
      if (!appAccess) {
        setPodioAPIError('The application does not have permission to access the Contacts app. Please check your Podio API permissions.');
        setConnectingToPodio(false);
        return;
      }
      
      setConnectingToPodio(false);
      
      try {
        const success = await login(username, password);
        
        if (success) {
          toast({
            title: 'Login successful',
            description: 'Welcome back',
            variant: 'default',
          });
          navigate('/dashboard');
        }
      } catch (loginErr) {
        // Handle specific unauthorized errors differently
        const errorMessage = loginErr instanceof Error ? loginErr.message : 'An error occurred during login';
        
        if (errorMessage.includes('Invalid contacts app token') || errorMessage.includes('Invalid app token')) {
          setPodioAPIError('The Contacts app token is invalid. Please check your configuration.');
        } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('Authentication') || errorMessage.includes('access user data')) {
          setPodioAPIError('The application cannot access the Contacts app. Please check your Podio API permissions.');
        } else {
          toast({
            title: 'Login Failed',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during login';
      
      // Check for specific permission issues related to Podio API
      if (errorMessage.includes('Invalid contacts app token')) {
        setPodioAPIError('The Contacts app token is invalid. Please check your configuration.');
      } else if (errorMessage.includes('Authentication') && errorMessage.includes('not allowed')) {
        setPodioAPIError('The application does not have permission to access contact data. Please check your Podio API credentials and permissions.');
      } else {
        toast({
          title: 'Login Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setConnectingToPodio(false);
      setValidatingAppAccess(false);
    }
  };

  // Generate a message if rate limited
  const getRateLimitMessage = () => {
    if (isRateLimited()) {
      const limitUntil = parseInt(localStorage.getItem('podio_rate_limit_until') || '0', 10);
      const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
      return `Rate limited. Please wait ${waitSecs} seconds before trying again.`;
    }
    return null;
  };

  const rateLimitMessage = getRateLimitMessage();
  const displayError = podioAPIError || error || rateLimitMessage;
  const isLoading = loading || connectingToPodio || validatingAppAccess;
  
  // Generate appropriate loading message
  const getLoadingMessage = () => {
    if (connectingToPodio) return 'Connecting to Podio...';
    if (validatingAppAccess) return 'Validating app access...';
    if (loading) return 'Logging in...';
    if (isRateLimited()) return 'Rate limited';
    return 'Login';
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-gray-100">
      <CardHeader>
        <CardTitle>Customer Portal Login</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              disabled={isLoading || isRateLimited()}
              autoComplete="username"
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              disabled={isLoading || isRateLimited()}
              autoComplete="current-password"
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          {displayError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {podioAPIError ? "Permission Error" : 
                 rateLimitMessage ? "Rate Limit Reached" : 
                 "Login Error"}
              </AlertTitle>
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700" 
            disabled={isLoading || isRateLimited()}
          >
            {getLoadingMessage()}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Having trouble logging in? Contact support.
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;
