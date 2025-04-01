
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  isPodioConfigured, 
  isRateLimited, 
  authenticateWithContactsAppToken,
  authenticateWithPackingSpecAppToken,
  authenticateWithClientCredentials
} from '../services/podioAuth';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [podioAPIError, setPodioAPIError] = useState<string | null>(null);
  const { login, loading, error } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Debug information state
  const [debugInfo, setDebugInfo] = useState<{
    steps: Array<{ step: string, status: 'pending' | 'success' | 'error', details?: string }>,
    showDetails: boolean
  }>({
    steps: [],
    showDetails: true // Set to true by default for easier debugging
  });

  // Add a debug step
  const addDebugStep = (step: string, status: 'pending' | 'success' | 'error', details?: string) => {
    setDebugInfo(prev => ({
      ...prev,
      steps: [...prev.steps, { step, status, details }]
    }));
  };

  // Update the last debug step
  const updateLastDebugStep = (status: 'pending' | 'success' | 'error', details?: string) => {
    setDebugInfo(prev => {
      if (prev.steps.length === 0) return prev;
      
      const updatedSteps = [...prev.steps];
      const lastStepIndex = updatedSteps.length - 1;
      updatedSteps[lastStepIndex] = {
        ...updatedSteps[lastStepIndex],
        status,
        details: details || updatedSteps[lastStepIndex].details
      };
      
      return {
        ...prev,
        steps: updatedSteps
      };
    });
  };

  // Clear debug info
  const clearDebugInfo = () => {
    setDebugInfo({
      steps: [],
      showDetails: debugInfo.showDetails
    });
  };

  const toggleDebugDetails = () => {
    setDebugInfo(prev => ({
      ...prev,
      showDetails: !prev.showDetails
    }));
  };

  // Listen for debug events from the podio auth service
  useEffect(() => {
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key?.startsWith('podio_auth_debug')) {
        try {
          const debugData = JSON.parse(event.newValue || '{}');
          if (debugData.step && debugData.status) {
            addDebugStep(debugData.step, debugData.status, debugData.details);
          }
        } catch (e) {
          console.error('Failed to parse debug info', e);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state and debug info
    setPodioAPIError(null);
    clearDebugInfo();
    
    if (!username || !password) {
      toast({
        title: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    // Check if Podio is configured
    if (!isPodioConfigured()) {
      setPodioAPIError('Podio API is not configured properly');
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
    addDebugStep(`Attempting login with username: ${username}`, 'pending');
    
    try {
      setAuthenticating(true);
      
      // Try to authenticate with Contacts app token
      addDebugStep('Authenticating with Contacts app token', 'pending');
      let contactsAuthSuccess = await authenticateWithContactsAppToken();
      
      if (!contactsAuthSuccess) {
        updateLastDebugStep('error', 'Contacts app authentication failed, falling back to client credentials');
        
        // Fall back to client credentials if app auth fails
        addDebugStep('Falling back to client credentials authentication', 'pending');
        contactsAuthSuccess = await authenticateWithClientCredentials();
        
        if (contactsAuthSuccess) {
          updateLastDebugStep('success', 'Client credentials authentication successful');
        } else {
          updateLastDebugStep('error', 'Client credentials authentication failed');
        }
      } else {
        updateLastDebugStep('success', 'Contacts app authentication successful');
      }
      
      if (!contactsAuthSuccess) {
        setPodioAPIError('Authentication failed. Please check your Podio API credentials.');
        setAuthenticating(false);
        return;
      }
      
      // Pre-authenticate with Packing Spec app in parallel (don't wait for it)
      addDebugStep('Pre-authenticating with Packing Spec app for later use', 'pending');
      authenticateWithPackingSpecAppToken()
        .then(success => {
          if (success) {
            updateLastDebugStep('success', 'Successfully pre-authenticated with Packing Spec app');
          } else {
            updateLastDebugStep('error', 'Failed to pre-authenticate with Packing Spec app (will try again later when needed)');
          }
        })
        .catch(error => {
          updateLastDebugStep('error', `Error pre-authenticating with Packing Spec app: ${error.message}`);
        });
      
      // If authentication was successful, try to login the user
      try {
        addDebugStep('Searching for user in Contacts app', 'pending');
        const success = await login(username, password);
        
        if (success) {
          updateLastDebugStep('success', 'User found in Contacts app');
          addDebugStep('Login successful', 'success');
          
          toast({
            title: 'Login successful',
            description: 'Welcome back',
            variant: 'default',
          });
          navigate('/dashboard');
        } else {
          updateLastDebugStep('error', 'User not found in Contacts app');
          setPodioAPIError('Invalid username or password');
        }
      } catch (loginErr) {
        // Handle specific unauthorized errors differently
        const errorMessage = loginErr instanceof Error ? loginErr.message : 'An error occurred during login';
        updateLastDebugStep('error', `Login failed: ${errorMessage}`);
        
        if (errorMessage.includes('Invalid contacts app token') || errorMessage.includes('Invalid app token')) {
          setPodioAPIError('Authentication error. Please check your Podio configuration.');
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
      addDebugStep('Login error', 'error', errorMessage);
      
      // Check for specific permission issues related to Podio API
      if (errorMessage.includes('Invalid contacts app token')) {
        setPodioAPIError('Authentication error. Please check your Podio configuration.');
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
      setAuthenticating(false);
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
  const isLoading = loading || authenticating;
  
  // Generate appropriate loading message
  const getLoadingMessage = () => {
    if (authenticating) return 'Authenticating...';
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
          
          {debugInfo.steps.length > 0 && (
            <Collapsible open={debugInfo.showDetails} onOpenChange={toggleDebugDetails} className="w-full border rounded-md p-2 mt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Authentication Process Details</h4>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 h-7 w-7">
                    {debugInfo.showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <ScrollArea className="h-60 w-full mt-2">
                  <div className="space-y-2">
                    {debugInfo.steps.map((step, i) => (
                      <div key={i} className="text-xs border-l-2 pl-2 py-1 mb-1" 
                           style={{ 
                             borderColor: step.status === 'success' ? 'green' : 
                                          step.status === 'error' ? 'red' : 'blue' 
                           }}>
                        <div className="font-semibold">
                          {step.step}
                          <span className={`ml-2 inline-block rounded-full px-2 text-xs ${
                            step.status === 'success' ? 'bg-green-100 text-green-800' : 
                            step.status === 'error' ? 'bg-red-100 text-red-800' : 
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {step.status}
                          </span>
                        </div>
                        {step.details && (
                          <pre className="text-xs mt-1 whitespace-pre-wrap overflow-x-auto bg-gray-50 p-1 rounded">
                            {step.details}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
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
