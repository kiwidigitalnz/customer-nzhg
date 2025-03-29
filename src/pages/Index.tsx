
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isPodioConfigured } from '../services/podioApi';
import { useToast } from '@/components/ui/use-toast';
import { useEffect } from 'react';

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Check if Podio is configured
  const podioConfigured = isPodioConfigured();
  
  useEffect(() => {
    // Show a message if Podio is not configured
    if (!podioConfigured) {
      toast({
        title: "Podio Setup Required",
        description: "Please configure Podio API settings to continue",
        duration: 5000,
      });
    }
  }, [podioConfigured, toast]);
  
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
