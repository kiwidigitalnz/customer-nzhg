import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, LogIn, User, Lock, EyeOff, Eye, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  isPodioConfigured, 
  isRateLimitedWithInfo
} from '../services/podioAuth';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [podioAPIError, setPodioAPIError] = useState<string | null>(null);
  const [loginAttemptCount, setLoginAttemptCount] = useState(0);
  const { login, loading, error } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const loginAttemptInProgress = useRef(false);
  const loginButtonRef = useRef<HTMLButtonElement>(null);

  // Reset error state when inputs change
  useEffect(() => {
    if (podioAPIError) {
      setPodioAPIError(null);
    }
  }, [username, password]);

  // Add a cool-down period for multiple login attempts
  useEffect(() => {
    if (loginAttemptCount > 3) {
      const timer = setTimeout(() => {
        setLoginAttemptCount(0);
        setPodioAPIError(null);
      }, 30000); // 30 second cool-down
      
      setPodioAPIError(`Too many login attempts. Please wait 30 seconds before trying again.`);
      
      return () => clearTimeout(timer);
    }
  }, [loginAttemptCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate login attempts
    if (loginAttemptInProgress.current || authenticating) {
      console.log('Login attempt already in progress, preventing duplicate submission');
      return;
    }
    
    // Check for too many attempts
    if (loginAttemptCount > 3) {
      return;
    }
    
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
      const secondsLeft = Math.ceil((rateLimitInfo.limitUntil - Date.now()) / 1000);
      const reason = rateLimitInfo.lastEndpoint ? 
        `Rate limit reached for ${rateLimitInfo.lastEndpoint}` : 
        'Rate limit reached';
      setPodioAPIError(`${reason}. Please wait ${secondsLeft} seconds.`);
      return;
    }
    
    try {
      loginAttemptInProgress.current = true;
      setAuthenticating(true);
      
      // Increment attempt counter
      setLoginAttemptCount(prev => prev + 1);
      
      // Disable the login button to prevent multiple clicks
      if (loginButtonRef.current) {
        loginButtonRef.current.disabled = true;
      }
      
      // Try to login the user
      const success = await login();
      
      if (success) {
        toast({
          title: 'Login successful',
          description: 'Welcome back',
          variant: 'default',
        });
        
        // Reset attempt counter on success
        setLoginAttemptCount(0);
        
        navigate('/dashboard');
      } else if (error && typeof error === 'string' && (
          error.includes('permission') || 
          error.includes('access') || 
          error.includes('403')
      )) {
        // Special handling for permission errors
        setPodioAPIError(error);
        toast({
          title: 'API Permission Error',
          description: 'The application lacks necessary access permissions',
          variant: 'destructive',
        });
      } else {
        setPodioAPIError(error || 'Invalid username or password');
      }
    } catch (loginErr) {
      // Handle specific unauthorized errors differently
      const errorMessage = loginErr instanceof Error ? loginErr.message : 'An error occurred during login';
      
      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('access') || errorMessage.includes('permission') || errorMessage.includes('403')) {
          setPodioAPIError('The application cannot access the Contacts app. Please check your Podio API permissions.');
        } else if (errorMessage.includes('Rate limit')) {
          setPodioAPIError('Rate limit reached. Please try again later.');
        } else if (errorMessage.includes('User not found') || errorMessage.includes('Invalid password')) {
          setPodioAPIError('Invalid username or password');
        } else {
          toast({
            title: 'Login Failed',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      }
    } finally {
      setAuthenticating(false);
      loginAttemptInProgress.current = false;
      
      // Re-enable the login button
      if (loginButtonRef.current) {
        loginButtonRef.current.disabled = false;
      }
    }
  };

  // Generate a message if rate limited
  const getRateLimitMessage = () => {
    const rateLimitInfo = isRateLimitedWithInfo();
    if (rateLimitInfo.isLimited) {
      const secondsLeft = Math.ceil((rateLimitInfo.limitUntil - Date.now()) / 1000);
      const reason = rateLimitInfo.lastEndpoint ? 
        `Rate limited for ${rateLimitInfo.lastEndpoint}` : 
        'Rate limited';
      return `${reason}. Please wait ${secondsLeft} seconds.`;
    }
    return null;
  };

  // Check if the error is a permission error
  const isPermissionError = () => {
    return podioAPIError && typeof podioAPIError === 'string' && (
      podioAPIError.includes('permission') || 
      podioAPIError.includes('access') ||
      podioAPIError.includes('403') ||
      podioAPIError.includes('forbidden')
    );
  };

  const rateLimitMessage = getRateLimitMessage();
  const displayError = podioAPIError || error || rateLimitMessage;
  const isLoading = loading || authenticating;
  const isDisabled = isLoading || isRateLimitedWithInfo().isLimited || loginAttemptCount > 3;
  
  // Generate appropriate loading message
  const getLoadingMessage = () => {
    if (authenticating) return 'Authenticating...';
    if (loading) return 'Logging in...';
    if (isRateLimitedWithInfo().isLimited) return 'Rate limited';
    if (loginAttemptCount > 3) return 'Too many attempts';
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
        {isPermissionError() && (
          <Alert variant="destructive" className="mb-4">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>API Permission Error</AlertTitle>
            <AlertDescription>
              <p>{podioAPIError}</p>
              <p className="mt-2 text-sm">This is likely a configuration issue with the Podio API access. Please contact your administrator.</p>
            </AlertDescription>
          </Alert>
        )}
        
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
              disabled={isDisabled || isPermissionError()}
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
                disabled={isDisabled || isPermissionError()}
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
          
          {displayError && !isPermissionError() && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {rateLimitMessage ? "Rate Limit Reached" : "Login Error"}
              </AlertTitle>
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            ref={loginButtonRef}
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700" 
            disabled={isDisabled || isPermissionError()}
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
