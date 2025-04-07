
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isPodioConfigured } from '../services/podioAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const Index = () => {
  const { isAuthenticated, loading } = useAuth();
  const podioConfigured = isPodioConfigured();
  
  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg" text="Checking authentication..." />
      </div>
    );
  }
  
  // If Podio is not configured, redirect to setup page
  if (!podioConfigured) {
    return <Navigate to="/podio-setup" replace />;
  }
  
  // If authenticated, go to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // If not authenticated, redirect to login
  return <Navigate to="/login" replace />;
};

export default Index;
