import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isPodioConfigured } from '../services/podioApi';

const Index = () => {
  const { user } = useAuth();
  
  // Check if Podio is configured
  const podioConfigured = isPodioConfigured();
  
  // If user is logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // If Podio is not configured, redirect to Podio setup
  if (!podioConfigured) {
    return <Navigate to="/podio-setup" replace />;
  }
  
  // Otherwise, redirect to login
  return <Navigate to="/login" replace />;
};

export default Index;
