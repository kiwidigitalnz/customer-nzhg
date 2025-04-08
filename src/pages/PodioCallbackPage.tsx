
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import MainLayout from '../components/MainLayout';

const PodioCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Extract OAuth parameters
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  useEffect(() => {
    // Check if this is an OAuth callback
    if (code && state) {
      // The edge function will handle the actual token exchange
      // This page will be displayed briefly while the redirect happens
      console.log('OAuth callback received, redirecting to Supabase Edge Function');
    } else if (error) {
      // If there's an OAuth error, redirect to the setup page with the error
      navigate(`/podio-setup?error=${error}`);
    } else {
      // If this isn't an OAuth callback, redirect to the home page
      navigate('/');
    }
  }, [code, state, error, navigate]);

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
