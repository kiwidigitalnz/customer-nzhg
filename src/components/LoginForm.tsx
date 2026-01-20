import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, LogIn, User, Lock, EyeOff, Eye, RefreshCw, WifiOff } from 'lucide-react';
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
    <div className="relative">
      {/* Glass card */}
      <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-honey-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center relative z-10">
          <h1 className="text-2xl font-playfair font-bold text-honey-dark mb-2">
            Customer Portal
          </h1>
          <p className="text-honey-dark/60 font-open text-sm">
            Enter your credentials to access your account
          </p>
        </div>
        
        {/* Content */}
        <div className="px-8 pb-8 relative z-10">
          {connectionIssue && (
            <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
              <WifiOff className="h-4 w-4" />
              <AlertTitle>Connection Issue</AlertTitle>
              <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-sm">
                  Unable to connect to the authentication service.
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleResetConnection}
                  className="whitespace-nowrap border-red-300 hover:bg-red-100"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {isLoading && (
            <div className="mb-4">
              <Progress value={loadingProgress} className="h-1 bg-honey-light" />
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2 text-honey-dark font-medium">
                <User className="h-4 w-4 text-honey-gold" />
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
                className="border-honey-light/50 bg-white/50 focus:border-honey-gold focus:ring-honey-gold/20 rounded-xl h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2 text-honey-dark font-medium">
                <Lock className="h-4 w-4 text-honey-gold" />
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
                  className="border-honey-light/50 bg-white/50 focus:border-honey-gold focus:ring-honey-gold/20 rounded-xl h-12 pr-12"
                />
                <button 
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-honey-dark/40 hover:text-honey-dark transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            
            {displayError && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">Login Error</AlertTitle>
                <AlertDescription>
                  <div className="text-sm">{displayError}</div>
                  {errorDetails && (
                    <div className="mt-2 text-xs opacity-80 max-h-20 overflow-y-auto">
                      <details>
                        <summary className="cursor-pointer">Technical details</summary>
                        <pre className="mt-1 p-2 bg-red-100 rounded text-xs whitespace-pre-wrap">
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
              className="w-full h-12 bg-gradient-to-r from-honey-gold to-honey-amber hover:opacity-90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5" 
              disabled={isLoading || connectionIssue}
            >
              {connectionIssue ? (
                <WifiOff className="mr-2 h-5 w-5" />
              ) : (
                <LogIn className="mr-2 h-5 w-5" />
              )}
              {connectionIssue ? 'Reconnect Required' : 'Sign In'}
            </Button>
          </form>
        </div>
        
        {/* Footer */}
        <div className="px-8 py-4 bg-honey-cream/30 border-t border-honey-light/30 text-center">
          <p className="text-sm text-honey-dark/60 font-open">
            Having trouble logging in?{' '}
            <a href="mailto:support@nzhg.com" className="text-honey-gold hover:text-honey-amber font-medium transition-colors">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
