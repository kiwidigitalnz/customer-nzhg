
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
import { ensureInitialPodioAuth, isRateLimited, getPodioClientId, getPodioApiDomain } from '../services/podioApi';

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

    // Check if we're rate limited first
    if (isRateLimited()) {
      const limitUntil = parseInt(localStorage.getItem('podio_rate_limit_until') || '0', 10);
      const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
      
      toast({
        title: 'Rate Limit Reached',
        description: `Please wait ${waitSecs} seconds before trying again.`,
        variant: 'destructive',
      });
      return;
    }

    console.log(`[Login] Attempting login with username: ${username}`);
    console.log('[Login] Environment:', import.meta.env.DEV ? 'development' : 'production');
    
    // Log Podio API domain
    const apiDomain = getPodioApiDomain();
    console.log('[Login] Using Podio API domain:', apiDomain);
    
    // Log client ID details (partial, for security)
    const clientId = getPodioClientId();
    if (clientId) {
      console.log('[Login] Using client ID (first 5 chars):', clientId.substring(0, 5) + '...');
    } else {
      console.error('[Login] No client ID available');
    }
    
    try {
      // First ensure we're connected to Podio using Password Flow
      console.log('[Login] Ensuring initial Podio authentication...');
      setConnectingToPodio(true);
      const podioConnected = await ensureInitialPodioAuth();
      setConnectingToPodio(false);
      
      if (!podioConnected) {
        console.error('[Login] Failed to connect to Podio');
        
        // Check if failure was due to rate limiting
        if (isRateLimited()) {
          const limitUntil = parseInt(localStorage.getItem('podio_rate_limit_until') || '0', 10);
          const waitSecs = Math.ceil((limitUntil - Date.now()) / 1000);
          
          console.log(`[Login] Rate limited for ${waitSecs} seconds`);
          toast({
            title: 'Rate Limit Reached',
            description: `Please wait ${waitSecs} seconds before trying again.`,
            variant: 'destructive',
          });
        } else {
          console.error('[Login] Connection error, but not rate limited');
          toast({
            title: 'Connection Error',
            description: 'Could not connect to the service. Please try again later.',
            variant: 'destructive',
          });
        }
        return;
      }
      
      console.log('[Login] Podio connected successfully, proceeding with login');
      const success = await login(username, password);
      
      if (success) {
        console.log('[Login] Login successful');
        toast({
          title: 'Login successful',
          description: 'Welcome back',
          variant: 'default',
        });
        navigate('/dashboard');
      } else {
        console.error('[Login] Login failed but no error was thrown');
      }
    } catch (err) {
      console.error('[Login] Unhandled login error:', err);
      
      // Check if error is due to rate limiting
      if (err && typeof err === 'object' && 'message' in err && 
          typeof err.message === 'string' && err.message.includes('rate limit')) {
        const waitMatch = err.message.match(/wait\s+(\d+)\s+seconds/i);
        const waitSecs = waitMatch ? waitMatch[1] : '60';
        
        console.log(`[Login] Rate limited for ${waitSecs} seconds based on error message`);
        toast({
          title: 'Rate Limit Reached',
          description: `Please wait ${waitSecs} seconds before trying again.`,
          variant: 'destructive',
        });
      }
    }
  };

  // Generate a message for rate limiting if needed
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
              ? 'Connecting to service...' 
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
