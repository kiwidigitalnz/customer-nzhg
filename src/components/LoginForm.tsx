
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isPodioConfigured, isRateLimited, authenticateWithClientCredentials } from '../services/podioAuth';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [connectingToPodio, setConnectingToPodio] = useState(false);
  const { login, loading, error } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      // First ensure we're connected to Podio
      setConnectingToPodio(true);
      const podioConnected = await authenticateWithClientCredentials();
      setConnectingToPodio(false);
      
      if (!podioConnected) {
        toast({
          title: 'Connection Error',
          description: 'Could not connect to Podio. Please try again later.',
          variant: 'destructive',
        });
        return;
      }
      
      const success = await login(username, password);
      
      if (success) {
        toast({
          title: 'Login successful',
          description: 'Welcome back',
          variant: 'default',
        });
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      
      toast({
        title: 'Login Failed',
        description: err instanceof Error ? err.message : 'An error occurred during login',
        variant: 'destructive',
      });
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
              disabled={loading || connectingToPodio || isRateLimited()}
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
              disabled={loading || connectingToPodio || isRateLimited()}
              autoComplete="current-password"
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          {(error || rateLimitMessage) && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{rateLimitMessage ? "Rate Limit Reached" : "Login Error"}</AlertTitle>
              <AlertDescription>{rateLimitMessage || error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700" 
            disabled={loading || connectingToPodio || isRateLimited()}
          >
            {connectingToPodio 
              ? 'Connecting to Podio...' 
              : loading 
                ? 'Logging in...' 
                : isRateLimited() 
                  ? 'Rate limited' 
                  : 'Login'}
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
