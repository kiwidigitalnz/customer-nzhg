
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
    // Only show this toast to admins or in development environment
    if (!podioConfigured && process.env.NODE_ENV === 'development') {
      toast({
        title: "Podio Setup Required",
        description: "Please configure Podio API settings before using this application",
        duration: 5000,
      });
    }
  }, [podioConfigured, toast]);
  
  // If Podio is not configured, we'll only redirect to setup if we're in development mode
  // In production, we'll still let the user see the landing page but they won't be able to login
  if (!podioConfigured && process.env.NODE_ENV === 'development') {
    return <Navigate to="/podio-setup" replace />;
  }
  
  // If the user is logged in, redirect them to the dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // For everyone else, show the landing page
  return <LandingPage />;
};

export default Index;
