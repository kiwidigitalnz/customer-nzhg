
import { useState, useEffect } from 'react';
import PackingSpecDetails from '../components/PackingSpecDetails';
import MainLayout from '../components/MainLayout';
import { Package, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { isPodioConfigured } from '../services/podioApi';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SectionApprovalProvider } from '@/contexts/SectionApprovalContext';

const PackingSpecDetailsPage = () => {
  const [loading, setLoading] = useState(true);
  const [podioError, setPodioError] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check Podio configuration
    const podioConfigured = isPodioConfigured();
    
    if (!podioConfigured) {
      setPodioError(true);
    }
    
    // Simulate loading for better UX
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
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
        <SectionApprovalProvider>
          <PackingSpecDetails />
        </SectionApprovalProvider>
      )}
    </MainLayout>
  );
};

export default PackingSpecDetailsPage;
