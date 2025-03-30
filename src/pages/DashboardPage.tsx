
import { useState, useEffect } from 'react';
import Dashboard from '../components/Dashboard';
import MainLayout from '../components/MainLayout';
import { LayoutDashboard } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const DashboardPage = () => {
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
          <LoadingSpinner 
            size="lg" 
            icon={<LayoutDashboard />}
            text="Loading dashboard..."
            subtext="This may take a moment"
          />
        </div>
      ) : (
        <Dashboard />
      )}
    </MainLayout>
  );
};

export default DashboardPage;
