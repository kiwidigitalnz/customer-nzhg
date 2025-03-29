
import PackingSpecDetails from '../components/PackingSpecDetails';
import MainLayout from '../components/MainLayout';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const PackingSpecDetailsPage = () => {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading for better UX
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <MainLayout requireAuth>
      {loading ? (
        <div className="flex justify-center items-center h-[80vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Loading specification...</p>
          </div>
        </div>
      ) : (
        <PackingSpecDetails />
      )}
    </MainLayout>
  );
};

export default PackingSpecDetailsPage;
