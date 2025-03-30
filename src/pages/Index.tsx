
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isPodioConfigured } from '../services/podioApi';
import { useToast } from '@/components/ui/use-toast';
import { useEffect } from 'react';
import LandingPage from './LandingPage';

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Check if Podio is configured - this is the first and most important check
  const podioConfigured = isPodioConfigured();
  
  useEffect(() => {
    if (!podioConfigured) {
      toast({
        title: "Podio Setup Required",
        description: "Please configure Podio API settings before using this application",
        duration: 5000,
      });
    }
  }, [podioConfigured, toast]);
  
  // If Podio is not configured, redirect to Podio setup as the highest priority
  if (!podioConfigured) {
    return <Navigate to="/podio-setup" replace />;
  }
  
  // Only if Podio is configured, check if user is logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // If Podio is configured but no user is logged in, show the landing page
  // instead of redirecting to login
  return <LandingPage />;
};

export default Index;
