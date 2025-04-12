
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, LogIn, User, Lock, EyeOff, Eye } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const { login, loading, error } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const loginAttemptInProgress = useRef(false);
  const loginButtonRef = useRef<HTMLButtonElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_RETRIES = 2;

  // Simulate progress during login to provide feedback
  useEffect(() => {
    if (authenticating) {
      setLoadingProgress(10); // Start with 10%
      
      // Gradually increase progress to simulate loading
      const timer = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) {
            // Don't go to 100% until actually done
            return 90;
          }
          return prev + 5;
        });
      }, 300);
      
      progressTimerRef.current = timer;
      
      return () => {
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
        }
        setLoadingProgress(0);
      };
    }
  }, [authenticating]);

  const parseErrorMessage = (error: any): string => {
    if (!error) return 'An unknown error occurred';
    
    // Handle string errors
    if (typeof error === 'string') return error;
    
    // Handle error objects
    if (typeof error === 'object') {
      // Check for specific error properties in order of preference
      if (error.message) return error.message;
      if (error.error) return typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
      if (error.details) return typeof error.details === 'string' ? error.details : JSON.stringify(error.details);
      
      // If it's a network error or unexpected format, check for status
      if (error.status) {
        if (error.status === 404) return 'User not found. Please check your username.';
        if (error.status === 401) return 'Invalid credentials. Please try again.';
        if (error.status === 429) return 'Too many login attempts. Please try again later.';
        if (error.status >= 500) return 'Server error. Please try again later.';
        return `Error ${error.status}: ${error.statusText || 'Something went wrong'}`;
      }
      
      // Last resort: stringify the object
      return JSON.stringify(error);
    }
    
    return 'Login failed. Please try again.';
  };

  const shouldRetry = (error: any): boolean => {
    // Only retry for network issues or 5xx errors
    if (retryCount >= MAX_RETRIES) return false;
    
    if (typeof error === 'object') {
      // Network error
      if (error.message && (
        error.message.includes('network') || 
        error.message.includes('connection') ||
        error.message.includes('timeout')
      )) return true;
      
      // Server error (5xx)
      if (error.status && error.status >= 500) return true;
    }
    
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setLoginError(null);
    
    // Prevent duplicate login attempts
    if (loginAttemptInProgress.current || authenticating) {
      return;
    }
    
    if (!username || !password) {
      toast({
        title: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      loginAttemptInProgress.current = true;
      setAuthenticating(true);
      
      // Disable the login button to prevent multiple clicks
      if (loginButtonRef.current) {
        loginButtonRef.current.disabled = true;
      }
      
      // Try to look up the user in the Contacts app
      const success = await login(username, password);
      
      if (success) {
        // Set progress to 100% on success
        setLoadingProgress(100);
        
        toast({
          title: 'Login successful',
          description: 'Welcome to your customer portal',
          variant: 'default',
        });
        
        navigate('/dashboard');
      } else if (error) {
        // Parse and handle error
        const errorMsg = parseErrorMessage(error);
        setLoginError(errorMsg);
        
        // Check if we should retry
        if (shouldRetry(error)) {
          setRetryCount(prev => prev + 1);
          toast({
            title: 'Connection issue',
            description: 'Retrying login...',
            variant: 'default',
          });
          
          // Small delay before retry
          setTimeout(() => {
            handleSubmit(e);
          }, 1000);
          return;
        }
        
        toast({
          title: 'Login Failed',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    } catch (loginErr: any) {
      // Enhanced error handling with more specific messages
      const errorMessage = parseErrorMessage(loginErr);
      
      setLoginError(errorMessage);
      
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setAuthenticating(false);
      loginAttemptInProgress.current = false;
      
      // Re-enable the login button
      if (loginButtonRef.current) {
        loginButtonRef.current.disabled = false;
      }
      
      // Clear progress timer
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    }
  };

  const isLoading = loading || authenticating;
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Display either the component's local error or the error from the auth context
  const displayError = loginError || (typeof error === 'string' ? error : error?.message);

  // Reset retry count when inputs change
  useEffect(() => {
    setRetryCount(0);
  }, [username, password]);

  return (
    <Card className="w-full max-w-md shadow-lg border-gray-100">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Customer Portal</CardTitle>
        <CardDescription className="text-center">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="mb-4">
            <Progress value={loadingProgress} className="h-1 mb-2" />
            <p className="text-xs text-center text-muted-foreground">Authenticating...</p>
          </div>
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
              placeholder="Your portal username"
              disabled={isLoading}
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
                disabled={isLoading}
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
              <AlertTitle>Login Error</AlertTitle>
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            ref={loginButtonRef}
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700" 
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Logging in...' : 'Log In'}
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
