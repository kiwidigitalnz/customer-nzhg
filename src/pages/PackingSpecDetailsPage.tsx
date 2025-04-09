
import { useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { Package, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const PackingSpecDetailsPage = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Simulate loading for better UX
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Function to handle navigating back to dashboard
  const handleBackToDashboard = () => {
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
      ) : (
        <div className="container mx-auto px-4 py-8">
          <Button variant="outline" onClick={handleBackToDashboard} className="mb-6">
            Back to Dashboard
          </Button>
          
          <Alert variant="destructive" className="mb-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Feature Unavailable</AlertTitle>
            <AlertDescription>
              The packing specification feature is currently being rebuilt.
            </AlertDescription>
          </Alert>
          
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Packing Specification System</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              The packing specification system is being redeveloped. Please check back later.
            </p>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default PackingSpecDetailsPage;
