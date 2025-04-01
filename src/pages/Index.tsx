import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { isPodioConfigured } from '../services/podioAuth';
import LandingPage from './LandingPage';

const Index = () => {
  const { user, checkSession } = useAuth();
  const { toast } = useToast();
  const [podioAuthError, setPodioAuthError] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if Podio is configured
    console.log('Checking Podio configuration');
    const configured = isPodioConfigured();
    console.log('Podio configured:', configured);
    
    if (!configured) {
      console.log('Podio not properly configured');
      setPodioAuthError('Podio API is not configured properly');
    }
    
    // Check if there's a stale session
    if (user && !checkSession()) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        duration: 5000,
      });
    }
  }, [toast, user, checkSession]);
  
  // If the user is logged in and session is valid, redirect to dashboard
  if (user && checkSession()) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Otherwise show the landing page
  return <LandingPage podioAuthError={podioAuthError} />;
};

export default Index;
