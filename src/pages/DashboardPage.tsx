
import { useState, useEffect } from 'react';
import Dashboard from '../components/Dashboard';
import MainLayout from '../components/MainLayout';
import { LayoutDashboard, AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isPodioConfigured, isRateLimited, clearRateLimit } from '../services/podioApi';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import RateLimitWarning from '../components/RateLimitWarning';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [podioError, setPodioError] = useState(false);
  const [isRateLimitReached, setIsRateLimitReached] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check Podio configuration and rate limit status
    const podioConfigured = isPodioConfigured();
    const rateLimited = isRateLimited();
    
    if (!podioConfigured) {
      setPodioError(true);
    }
    
    setIsRateLimitReached(rateLimited);
    
    // Simulate loading for better UX (just brief enough to avoid flicker)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleReturnHome = () => {
    navigate('/');
  };
  
  const handleRetry = () => {
    // Clear rate limit and reload the page
    clearRateLimit();
    window.location.reload();
  };
  
  return (
    <MainLayout requireAuth>
      {loading ? (
        <div className="flex justify-center items-center h-[80vh]">
          <LoadingSpinner 
            size="lg" 
            icon={<LayoutDashboard className="text-primary/70" />}
            text="Loading dashboard..."
            subtext="This may take a moment"
          />
        </div>
      ) : podioError ? (
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="mb-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Connection Issue</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                We're having trouble connecting to our data service. Please check your Podio configuration settings.
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReturnHome}
                className="whitespace-nowrap"
              >
                Return Home
              </Button>
            </AlertDescription>
          </Alert>
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Service Temporarily Unavailable</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              We're working to restore full functionality as soon as possible. 
              Please check back later or contact our support team for assistance.
            </p>
          </div>
        </div>
      ) : (
        <>
          {isRateLimitReached && (
            <div className="container mx-auto px-4 pt-6">
              <RateLimitWarning 
                onRetry={handleRetry}
                usingCachedData={true}
              />
            </div>
          )}
          <Dashboard />
        </>
      )}
    </MainLayout>
  );
};

export default DashboardPage;
