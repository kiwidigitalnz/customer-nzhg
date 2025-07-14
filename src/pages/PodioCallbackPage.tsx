
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import MainLayout from '../components/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { validatePodioAuthState } from '@/services/podio/podioOAuth';

const PodioCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Extract OAuth parameters
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  useEffect(() => {
    // Check if this is an OAuth callback
    if (code && state) {
      // First validate the state parameter to prevent CSRF attacks
      const isValidState = validatePodioAuthState(state);
      
      if (!isValidState) {
        console.error('Invalid state parameter - possible CSRF attack');
        toast({
          title: "Security Error",
          description: "Invalid authentication state. Please try again.",
          variant: "destructive"
        });
        navigate('/podio-setup?error=invalid_state');
        return;
      }
      
      // Call the Edge Function to handle the token exchange
      const handleOAuthCallback = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('podio-oauth-callback', {
            method: 'POST',
            body: { code, state }
          });
          
          if (error) {
            console.error('Error processing callback:', error);
            toast({
              title: "Authentication Failed",
              description: error.message || "Failed to complete Podio authentication",
              variant: "destructive"
            });
            navigate('/podio-setup?error=callback_failed');
            return;
          }
          
          if (data && data.success) {
            // Store token information when the user is redirected back
            if (data.tokenInfo) {
              localStorage.setItem('podio_token_expiry', new Date(data.tokenInfo.expires_at).getTime().toString());
            }
            
            toast({
              title: "Podio Connected",
              description: "Successfully authenticated with Podio",
            });
            navigate('/podio-setup?success=true');
          } else {
            const errorMsg = data?.error || 'unknown';
            const errorDesc = data?.error_description || '';
            navigate(`/podio-setup?error=${errorMsg}&error_description=${errorDesc}`);
          }
        } catch (err) {
          console.error('Unexpected error in callback handler:', err);
          toast({
            title: "Authentication Error",
            description: "An unexpected error occurred during authentication",
            variant: "destructive"
          });
          navigate('/podio-setup?error=unexpected');
        }
      };
      
      handleOAuthCallback();
    } else if (error) {
      // If there's an OAuth error, redirect to the setup page with the error
      toast({
        title: "Authentication Failed",
        description: errorDescription || error,
        variant: "destructive"
      });
      navigate(`/podio-setup?error=${error}&error_description=${errorDescription || ''}`);
    } else {
      // If this isn't an OAuth callback, redirect to the home page
      navigate('/');
    }
  }, [code, state, error, errorDescription, navigate, toast]);

  return (
    <MainLayout>
      <div className="container mx-auto py-10">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Processing Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
            <Alert className="bg-blue-50 text-blue-700 border-blue-200">
              <AlertTitle className="font-semibold">Please wait</AlertTitle>
              <AlertDescription>
                Completing your Podio authentication...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PodioCallbackPage;
