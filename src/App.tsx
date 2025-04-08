
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PackingSpecPage from './pages/PackingSpecDetailsPage';
import SimplePodioSetupPage from './pages/SimplePodioSetupPage';
import PodioCallbackPage from './pages/PodioCallbackPage';
import { supabase } from './integrations/supabase/client';
import { useEffect } from 'react';
import { useToast } from './components/ui/use-toast';

// Root path handler that checks for OAuth callback params
const RootPathHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if this is a Podio OAuth callback
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (code && state) {
      console.log('Detected Podio OAuth callback parameters at root URL');
      
      // Call the Edge Function manually to handle the token exchange
      const handleOAuthCallback = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('podio-oauth-callback', {
            method: 'POST',
            body: { code, state }
          });
          
          if (error) {
            console.error('Error processing OAuth callback:', error);
            toast({
              title: "Authentication Failed",
              description: error.message || "Failed to complete Podio authentication",
              variant: "destructive"
            });
            navigate('/podio-setup?error=callback_failed');
            return;
          }
          
          if (data.success) {
            toast({
              title: "Podio Connected",
              description: "Successfully authenticated with Podio",
            });
            navigate('/podio-setup?success=true');
          } else {
            navigate(`/podio-setup?error=${data.error || 'unknown'}`);
          }
        } catch (err) {
          console.error('Error handling OAuth callback:', err);
          toast({
            title: "Authentication Error",
            description: "An unexpected error occurred during authentication",
            variant: "destructive"
          });
          navigate('/podio-setup?error=unexpected');
        }
      };
      
      handleOAuthCallback();
    }
  }, [searchParams, navigate, toast]);
  
  // Render nothing while processing, or redirect to dashboard afterward
  return <Navigate to="/dashboard" replace />;
};

// ProtectedRoute component to handle authentication
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Show a loading indicator while checking authentication
  }

  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/login" replace /> // Redirect to login page if not authenticated
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<RootPathHandler />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/podio-setup" element={<SimplePodioSetupPage />} />
          <Route path="/podio-callback" element={<PodioCallbackPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/packing-spec/:id"
            element={
              <ProtectedRoute>
                <PackingSpecPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
