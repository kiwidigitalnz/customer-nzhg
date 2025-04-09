
import { useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { LayoutDashboard, AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Simple loading for better UX (just brief enough to avoid flicker)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleReturnHome = () => {
    navigate('/');
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
      ) : !isAuthenticated ? (
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="mb-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Authentication Issue</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                You need to be logged in to access this page.
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
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Authentication Required</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Please log in to view your dashboard.
            </p>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Welcome to Your Dashboard</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              This is a placeholder for your dashboard content.
            </p>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default DashboardPage;
