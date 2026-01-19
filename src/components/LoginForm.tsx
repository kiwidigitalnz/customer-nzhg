import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, LogIn, User, Lock, EyeOff, Eye, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const { login, loading, error, connectionIssue, retryStatus, resetConnection } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const loginAttemptInProgress = useRef(false);
  const loginButtonRef = useRef<HTMLButtonElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (authenticating) {
      setLoadingProgress(10);
      
      const timer = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) {
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

  const parseErrorMessage = (error: any): { message: string, details?: string } => {
    if (!error) return { message: 'An unknown error occurred' };
    
    if (typeof error === 'string') return { message: error };
    
    if (typeof error === 'object') {
      if (error.data && typeof error.data === 'object') {
        if (error.data.error) {
          return { 
            message: error.data.error,
            details: error.data.details ? JSON.stringify(error.data.details) : undefined
          };
        }
        
        if (error.data.message) {
          return { 
            message: error.data.message,
            details: error.data.details ? JSON.stringify(error.data.details) : undefined
          };
        }
      }
      
      if (error.message) {
        if (error.message.includes('Edge Function returned a non-2xx status code')) {
          if (error.details) {
            return { 
              message: 'Authentication failed',
              details: typeof error.details === 'string' 
                ? error.details 
                : JSON.stringify(error.details)
            };
          }
          
          if (error.data) {
            const dataMessage = typeof error.data === 'object' ? 
              (error.data.error || error.data.message || JSON.stringify(error.data)) : 
              String(error.data);
              
            return { 
              message: 'Authentication failed: ' + dataMessage,
              details: typeof error.data === 'object' ? JSON.stringify(error.data) : undefined
            };
          }
          
          if (error.status) {
            switch(error.status) {
              case 401:
                return { message: 'Invalid credentials. Please check your username and password.' };
              case 404:
                return { message: 'User not found. Please check your username.' };
              case 429:
                return { message: 'Too many login attempts. Please try again later.' };
              default:
                return { 
                  message: `Error ${error.status}: ${error.message}`,
                  details: error.details ? JSON.stringify(error.details) : undefined
                };
            }
          }
          
          return { 
            message: 'Server error. Please try again later.', 
            details: 'Edge function returned a non-2xx status code. The server may need configuration.'
          };
        }
        
        return { message: error.message };
      }
      
      if (error.error) {
        return { 
          message: typeof error.error === 'string' ? error.error : 'Authentication failed',
          details: typeof error.error !== 'string' ? JSON.stringify(error.error) : undefined
        };
      }
      
      if (error.details) {
        return { 
          message: 'Authentication failed', 
          details: typeof error.details === 'string' ? error.details : JSON.stringify(error.details)
        };
      }
      
      if (error.status) {
        if (error.status === 404) return { message: 'User not found. Please check your username.' };
        if (error.status === 401) return { message: 'Invalid credentials. Please try again.' };
        if (error.status === 429) return { message: 'Too many login attempts. Please try again later.' };
        if (error.status >= 500) return { message: 'Server error. Please try again later.' };
        return {
          message: `Error ${error.status}: ${error.statusText || 'Something went wrong'}`,
          details: error.details ? JSON.stringify(error.details) : undefined
        };
      }
      
      return { message: 'Login failed', details: JSON.stringify(error) };
    }
    
    return { message: 'Login failed. Please try again.' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoginError(null);
    setErrorDetails(null);
    
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
      
      if (loginButtonRef.current) {
        loginButtonRef.current.disabled = true;
      }
      
      const success = await login(username, password);
      
      if (success) {
        setLoadingProgress(100);
        
        toast({
          title: 'Login successful',
          description: 'Welcome to your customer portal',
          variant: 'default',
        });
        
        navigate('/dashboard');
      } else if (error) {
        const parsedError = parseErrorMessage(error);
        setLoginError(parsedError.message);
        setErrorDetails(parsedError.details || null);
        
        if (error.retry && !connectionIssue) {
          toast({
            title: 'Login issue',
            description: `Retrying... (${retryStatus.authRetries}/${retryStatus.maxAuthRetries})`,
            variant: 'default',
          });
        } else {
          toast({
            title: 'Login Failed',
            description: parsedError.message,
            variant: 'destructive',
          });
        }
      }
    } catch (loginErr: any) {
      const parsedError = parseErrorMessage(loginErr);
      
      setLoginError(parsedError.message);
      setErrorDetails(parsedError.details || null);
      
      toast({
        title: 'Login Failed',
        description: parsedError.message,
        variant: 'destructive',
      });
    } finally {
      setAuthenticating(false);
      loginAttemptInProgress.current = false;
      
      if (loginButtonRef.current) {
        loginButtonRef.current.disabled = false;
      }
      
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    }
  };

  const isLoading = loading || authenticating;
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const displayError = loginError || (typeof error === 'string' ? error : error?.message);

  useEffect(() => {
    if (connectionIssue) {
      setPassword('');
    }
  }, [connectionIssue]);
  
  const handleResetConnection = () => {
    resetConnection();
    toast({
      title: 'Connection reset',
      description: 'Attempting to reconnect to the authentication service',
      variant: 'default',
    });
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
        {connectionIssue && (
          <Alert variant="destructive" className="mb-4">
            <WifiOff className="h-4 w-4" />
            <AlertTitle>Connection Issue</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                Unable to connect to the authentication service. Please check your internet connection.
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResetConnection}
                className="whitespace-nowrap"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset Connection
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {isLoading && (
          <Progress value={loadingProgress} className="h-1 mb-2" />
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
              <AlertDescription>
                <div>{displayError}</div>
                {errorDetails && (
                  <div className="mt-2 text-xs opacity-80 max-h-20 overflow-y-auto">
                    <details>
                      <summary className="cursor-pointer">Technical details</summary>
                      <pre className="mt-1 p-2 bg-black/5 rounded text-xs whitespace-pre-wrap">
                        {errorDetails}
                      </pre>
                    </details>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            ref={loginButtonRef}
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700" 
            disabled={isLoading || connectionIssue}
          >
            {connectionIssue ? (
              <WifiOff className="mr-2 h-4 w-4" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            {connectionIssue ? 'Reconnect Required' : 'Log In'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Having trouble logging in? <a href="mailto:support@nzgh.com" className="text-blue-600 hover:underline">Contact support</a>.
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;
