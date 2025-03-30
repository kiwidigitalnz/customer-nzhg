
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
  const [loginAttempted, setLoginAttempted] = useState(false);
  const { login, loading, error } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if Podio is configured - only used for UI feedback
  const podioConfigured = isPodioConfigured();
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginAttempted(true);
    
    if (!podioConfigured && isDevelopment) {
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
        description: error || 'Invalid username or password. Please check your credentials.',
        variant: 'destructive',
      });
      console.error('Login failed. Error:', error);
    }
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
              disabled={loading}
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
              disabled={loading}
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Login Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Only show technical Podio connection messages in development mode */}
          {isDevelopment && !podioConfigured && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Connection Issue</AlertTitle>
              <AlertDescription>
                Podio connection not configured. Please contact an administrator.
              </AlertDescription>
            </Alert>
          )}
          
          {isDevelopment && podioConfigured && loginAttempted && !error && !loading && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Connection Status</AlertTitle>
              <AlertDescription>
                Podio is configured, but login attempt failed. Check console for details.
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700" 
            disabled={loading || (isDevelopment && !podioConfigured)}
          >
            {loading ? 'Logging in...' : 'Login'}
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
