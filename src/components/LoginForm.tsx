
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, LogIn, User, Lock, EyeOff, Eye } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  isPodioConfigured, 
  isRateLimitedWithInfo, 
  authenticateWithContactsAppToken,
  authenticateWithPackingSpecAppToken,
  authenticateWithClientCredentials,
} from '../services/podioAuth';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [podioAPIError, setPodioAPIError] = useState<string | null>(null);
  const { login, loading, error } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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

    // Check if Podio is configured
    if (!isPodioConfigured()) {
      setPodioAPIError('Podio API is not configured properly');
      return;
    }

    // Check if we're rate limited
    const rateLimitInfo = isRateLimitedWithInfo();
    if (rateLimitInfo.isLimited) {
      const waitTime = Math.ceil((rateLimitInfo.limitUntil - Date.now()) / 1000);
      const retryMessage = rateLimitInfo.retryCount > 1 
        ? `Multiple attempts detected. Please wait ${waitTime} seconds.` 
        : `Please wait ${waitTime} seconds before trying again.`;
        
      toast({
        title: 'Rate Limit Reached',
        description: retryMessage,
        variant: 'destructive',
      });
      
      return;
    }
    
    try {
      setAuthenticating(true);
      
      // Try to authenticate with Contacts app token
      let contactsAuthSuccess = await authenticateWithContactsAppToken();
      
      if (!contactsAuthSuccess) {
        // Fall back to client credentials if app auth fails
        contactsAuthSuccess = await authenticateWithClientCredentials();
      }
      
      if (!contactsAuthSuccess) {
        setPodioAPIError('Authentication failed. Please check your Podio API credentials.');
        setAuthenticating(false);
        return;
      }
      
      // Pre-authenticate with Packing Spec app in parallel (don't wait for it)
      authenticateWithPackingSpecAppToken().catch(() => {
        // Silently fail, we'll try again later when needed
      });
      
      // If authentication was successful, try to login the user
      try {
        const success = await login(username, password);
        
        if (success) {
          toast({
            title: 'Login successful',
            description: 'Welcome back',
            variant: 'default',
          });
          navigate('/dashboard');
        } else {
          setPodioAPIError('Invalid username or password');
        }
      } catch (loginErr) {
        // Handle specific unauthorized errors differently
        const errorMessage = loginErr instanceof Error ? loginErr.message : 'An error occurred during login';
        
        if (errorMessage.includes('Invalid contacts app token') || errorMessage.includes('Invalid app token')) {
          setPodioAPIError('Authentication error. Please check your Podio configuration.');
        } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('Authentication') || errorMessage.includes('access user data')) {
          setPodioAPIError('The application cannot access the Contacts app. Please check your Podio API permissions.');
        } else if (errorMessage.includes('Rate limit')) {
          setPodioAPIError('Rate limit reached. Please try again later.');
        } else {
          toast({
            title: 'Login Failed',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during login';
      
      // Check for specific permission issues related to Podio API
      if (errorMessage.includes('Invalid contacts app token')) {
        setPodioAPIError('Authentication error. Please check your Podio configuration.');
      } else if (errorMessage.includes('Authentication') && errorMessage.includes('not allowed')) {
        setPodioAPIError('The application does not have permission to access contact data. Please check your Podio API credentials and permissions.');
      } else if (errorMessage.includes('Rate limit')) {
        setPodioAPIError('Rate limit reached. Please try again later.');
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
    const rateLimitInfo = isRateLimitedWithInfo();
    if (rateLimitInfo.isLimited) {
      const waitSecs = Math.ceil((rateLimitInfo.limitUntil - Date.now()) / 1000);
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
    if (isRateLimitedWithInfo().isLimited) return 'Rate limited';
    return 'Log In';
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-gray-100">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Customer Portal</CardTitle>
        <CardDescription className="text-center">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Username
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              disabled={isLoading || isRateLimitedWithInfo().isLimited}
              autoComplete="username"
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                disabled={isLoading || isRateLimitedWithInfo().isLimited}
                autoComplete="current-password"
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 pr-10"
              />
              <button 
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
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
            disabled={isLoading || isRateLimitedWithInfo().isLimited}
          >
            {isLoading && (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-opacity-25 border-t-white"></span>
            )}
            <LogIn className="mr-2 h-4 w-4" />
            {getLoadingMessage()}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Having trouble logging in? <a href="mailto:support@nzhoneygroup.com" className="text-blue-600 hover:underline">Contact support</a>.
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;
