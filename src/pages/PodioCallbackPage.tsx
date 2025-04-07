
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import MainLayout from '../components/MainLayout';
import { Info } from 'lucide-react';

const PodioCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home after a brief delay
    const redirectTimer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 3000);
    
    return () => clearTimeout(redirectTimer);
  }, [navigate]);

  return (
    <MainLayout>
      <div className="container mx-auto py-10">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Authentication Removed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 text-blue-700 border-blue-200">
              <Info className="h-4 w-4" />
              <AlertTitle className="font-semibold">Information</AlertTitle>
              <AlertDescription>
                Authentication has been removed from this application.
                You will be redirected to the dashboard...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PodioCallbackPage;
