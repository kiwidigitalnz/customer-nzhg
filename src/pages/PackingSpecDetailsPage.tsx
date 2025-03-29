
import { useState, useEffect } from 'react';
import PackingSpecDetails from '../components/PackingSpecDetails';
import MainLayout from '../components/MainLayout';
import { Loader2, Package } from 'lucide-react';

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
            <div className="relative mx-auto mb-4 w-16 h-16">
              <Loader2 className="h-16 w-16 animate-spin text-primary absolute" />
              <Package className="h-8 w-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary/80" />
            </div>
            <p className="text-lg text-muted-foreground">Loading specification details...</p>
            <p className="text-sm text-muted-foreground/70 mt-2">This may take a moment</p>
          </div>
        </div>
      ) : (
        <PackingSpecDetails />
      )}
    </MainLayout>
  );
};

export default PackingSpecDetailsPage;
