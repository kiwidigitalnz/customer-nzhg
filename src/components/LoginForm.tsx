
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { isPodioConfigured } from '../services/podioApi';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, AlertCircle } from 'lucide-react';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);
  const { login, loading, error } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if Podio is configured
  const podioConfigured = isPodioConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginAttempted(true);
    
    if (!podioConfigured) {
      toast({
        title: 'Podio Not Configured',
        description: 'Please set up Podio API credentials first',
        variant: 'destructive',
      });
      navigate('/podio-setup');
      return;
    }
    
    if (!username || !password) {
      toast({
        title: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    console.log(`Attempting login with username: ${username}`);
    
    const success = await login(username, password);
    
    if (success) {
      toast({
        title: 'Login successful',
        description: 'Welcome back',
        variant: 'default',
      });
      navigate('/dashboard');
    } else {
      toast({
        title: 'Login failed',
        description: error || 'No matching contact found in Podio. Please check your credentials.',
        variant: 'destructive',
      });
      console.error('Login failed. Error:', error);
    }
  };

  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };

  return (
    <Card className="w-full max-w-md">
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
              disabled={loading}
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
              disabled={loading}
            />
          </div>
          
          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Login Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!podioConfigured && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Connection Issue</AlertTitle>
              <AlertDescription>
                Podio connection not configured. Please contact an administrator.
              </AlertDescription>
            </Alert>
          )}
          
          {podioConfigured && loginAttempted && !error && !loading && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Connection Status</AlertTitle>
              <AlertDescription>
                Podio is configured, but login attempt failed. Check console for details.
              </AlertDescription>
            </Alert>
          )}
          
          <Button type="submit" className="w-full" disabled={loading || !podioConfigured}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
          
          {/* Debug mode toggle - always visible for troubleshooting */}
          <div className="mt-4 text-center">
            <button 
              type="button" 
              onClick={toggleDebugMode}
              className="text-xs text-muted-foreground underline"
            >
              {debugMode ? 'Hide Debug Info' : 'Show Debug Info'}
            </button>
            
            {debugMode && (
              <div className="mt-2 p-2 bg-muted text-left rounded text-xs">
                <p>Podio configured: {podioConfigured ? 'Yes' : 'No'}</p>
                <p>Username: {username}</p>
                <p>Password: {password ? '********' : '(empty)'}</p>
                <p>Login state: {loading ? 'Loading' : error ? 'Error' : 'Ready'}</p>
                {error && <p>Error: {error}</p>}
                <p className="mt-2 font-semibold">Field IDs used:</p>
                <p>Username field: customer-portal-username</p>
                <p>Password field: customer-portal-password</p>
                <p>Title field: title</p>
                <p className="mt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/podio-setup')}
                    className="text-blue-500 underline"
                  >
                    Go to Podio Setup
                  </button>
                </p>
              </div>
            )}
          </div>
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
