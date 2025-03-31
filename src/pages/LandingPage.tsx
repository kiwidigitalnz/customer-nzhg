
import { Suspense, lazy } from 'react';
import { Card } from '@/components/ui/card';
import { AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import MainLayout from '../components/MainLayout';

// Lazy load the LoginForm to improve initial page load performance
const LoginForm = lazy(() => import('../components/LoginForm'));

interface LandingPageProps {
  podioAuthError?: string | null;
  isDevelopmentMode?: boolean;
}

const LandingPage = ({ podioAuthError, isDevelopmentMode = false }: LandingPageProps) => {
  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 sm:py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Welcome to NZHG Customer Portal
            </h1>
            <p className="text-lg text-gray-600 max-w-md">
              Access your packing specifications, review documents, and track approvals all in one place.
            </p>
            
            {isDevelopmentMode && (
              <Alert className="max-w-md bg-amber-50 border-amber-200">
                <Info className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-amber-800">Development Mode</AlertTitle>
                <AlertDescription className="text-amber-700">
                  The application is running in development mode with API validation bypassed.
                </AlertDescription>
              </Alert>
            )}
            
            {podioAuthError && (
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>{podioAuthError}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md">
              <Card className="overflow-hidden shadow-lg">
                <Suspense fallback={<div className="p-8 text-center">Loading login form...</div>}>
                  <LoginForm />
                </Suspense>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default LandingPage;
