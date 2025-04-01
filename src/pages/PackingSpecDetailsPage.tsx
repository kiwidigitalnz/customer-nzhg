
import { useState, useEffect } from 'react';
import PackingSpecDetails from '../components/PackingSpecDetails';
import MainLayout from '../components/MainLayout';
import { Package, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { isPodioConfigured, isRateLimitedWithInfo } from '../services/podioApi';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import RateLimitError from '@/components/errors/RateLimitError';

const PackingSpecDetailsPage = () => {
  const [loading, setLoading] = useState(true);
  const [podioError, setPodioError] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitResetTime, setRateLimitResetTime] = useState(3600);
  const navigate = useNavigate();
  
  const checkPodioStatus = () => {
    // Check Podio configuration
    const podioConfigured = isPodioConfigured();
    
    if (!podioConfigured) {
      setPodioError(true);
      setLoading(false);
      return;
    }
    
    // Check for rate limiting
    const rateLimitInfo = isRateLimitedWithInfo();
    if (rateLimitInfo.isLimited) {
      setRateLimited(true);
      setRateLimitResetTime(Math.ceil((rateLimitInfo.limitUntil - Date.now()) / 1000));
      setLoading(false);
      return;
    }
    
    // Simulate loading for better UX
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    
    return timer;
  };
  
  useEffect(() => {
    const timer = checkPodioStatus();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);
  
  // Function to handle retry after rate limit
  const handleRetry = () => {
    setLoading(true);
    setRateLimited(false);
    setPodioError(false);
    checkPodioStatus();
  };
  
  // Function to handle navigating back to dashboard
  const handleBackToDashboard = () => {
    // Force a refresh of the dashboard when going back
    navigate('/', { replace: true });
  };
  
  return (
    <MainLayout requireAuth>
      {loading ? (
        <div className="flex justify-center items-center h-[80vh]">
          <LoadingSpinner 
            size="lg" 
            icon={<Package className="text-primary/70" />}
            text="Loading specification details..."
            subtext="This may take a moment"
          />
        </div>
      ) : rateLimited ? (
        <div className="container mx-auto px-4 py-8">
          <RateLimitError 
            retryTime={rateLimitResetTime} 
            onRetry={handleRetry} 
          />
        </div>
      ) : podioError ? (
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="mb-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Connection Issue</AlertTitle>
            <AlertDescription>
              We're having trouble connecting to our data service. Please try again later or contact support.
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
        <PackingSpecDetails />
      )}
    </MainLayout>
  );
};

export default PackingSpecDetailsPage;
