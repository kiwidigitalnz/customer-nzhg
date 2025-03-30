
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { ensureInitialPodioAuth, isPodioConfigured } from '../services/podioApi';
import LandingPage from './LandingPage';

const Index = () => {
  const { user, checkSession } = useAuth();
  const { toast } = useToast();
  const [isAttemptingAuth, setIsAttemptingAuth] = useState(false);
  
  useEffect(() => {
    // In production, try to automatically authenticate with Podio
    if (import.meta.env.PROD && !isAttemptingAuth) {
      setIsAttemptingAuth(true);
      
      // Check if Podio is configured with environment variables
      console.log('Production environment detected, checking Podio configuration');
      const configured = isPodioConfigured();
      console.log('Podio configured:', configured);
      
      if (configured) {
        console.log('Attempting initial Podio authentication');
        
        // Only clear tokens if we don't already have valid ones
        if (!localStorage.getItem('podio_access_token')) {
          console.log('No existing Podio tokens found, initiating new authentication');
        } else {
          console.log('Using existing Podio tokens');
        }
        
        ensureInitialPodioAuth()
          .then(success => {
            console.log('Initial Podio authentication result:', success ? 'Success' : 'Failed');
            if (!success) {
              console.error('Could not automatically authenticate with Podio');
              toast({
                title: "Connection Error",
                description: "Could not connect to the service. Please try again later.",
                duration: 5000,
              });
            }
          })
          .catch(err => {
            console.error('Error during automatic Podio authentication:', err);
            
            toast({
              title: "Connection Error",
              description: "Could not connect to the service. Please try again later.",
              duration: 5000,
            });
          });
      } else {
        console.error('Podio not properly configured. Check environment variables.');
      }
    }
    
    // Check if there's a stale session
    if (user && !checkSession()) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        duration: 5000,
      });
    }
  }, [isAttemptingAuth, toast, user, checkSession]);
  
  // If the user is logged in and session is valid, redirect them to the dashboard
  if (user && checkSession()) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // For everyone else, show the landing page
  return <LandingPage />;
};

export default Index;
