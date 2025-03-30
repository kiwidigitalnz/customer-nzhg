
import { useState, useEffect } from 'react';
import PackingSpecDetails from '../components/PackingSpecDetails';
import MainLayout from '../components/MainLayout';
import { Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
      ) : (
        <PackingSpecDetails />
      )}
    </MainLayout>
  );
};

export default PackingSpecDetailsPage;
