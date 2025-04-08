
import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, LogIn, User, Lock, EyeOff, Eye } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { login, loading, error } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const loginAttemptInProgress = useRef(false);
  const loginButtonRef = useRef<HTMLButtonElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setLoginError(null);
    
    // Prevent duplicate login attempts
    if (loginAttemptInProgress.current || authenticating) {
      console.log('Login attempt already in progress, preventing duplicate submission');
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
      
      // Try to login the user
      const success = await login(username, password);
      
      if (success) {
        toast({
          title: 'Login successful',
          description: 'Welcome to your customer portal',
          variant: 'default',
        });
        
        navigate('/dashboard');
      } else if (error) {
        // Parse error message
        const errorMsg = typeof error === 'object' && error !== null 
          ? error.message || 'Login failed' 
          : String(error);
          
        setLoginError(errorMsg);
        
        toast({
          title: 'Login Failed',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    } catch (loginErr) {
      const errorMessage = loginErr instanceof Error ? loginErr.message : 'An error occurred during login';
      
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
    }
  };

  const isLoading = loading || authenticating;
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Display either the component's local error or the error from the auth context
  const displayError = loginError || (typeof error === 'string' ? error : error?.message);

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
            {isLoading && (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-opacity-25 border-t-white"></span>
            )}
            <LogIn className="mr-2 h-4 w-4" />
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
