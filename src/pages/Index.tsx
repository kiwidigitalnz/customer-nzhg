
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isPodioConfigured } from '../services/podioAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import LandingPage from './LandingPage';

const Index = () => {
  const { isAuthenticated, loading } = useAuth();
  const podioConfigured = isPodioConfigured();
  const [searchParams] = useSearchParams();
  
  // Check if this is an OAuth callback (has code and state parameters)
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  // If this is an OAuth callback, redirect to the callback page with parameters
  if (code && state) {
    const callbackUrl = `/podio-callback?${searchParams.toString()}`;
    return <Navigate to={callbackUrl} replace />;
  }
  
  // If there's an OAuth error, redirect to callback page to handle it
  if (error) {
    const callbackUrl = `/podio-callback?${searchParams.toString()}`;
    return <Navigate to={callbackUrl} replace />;
  }
  
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
  
  // If not authenticated, show the landing page
  return <LandingPage />;
};

export default Index;
