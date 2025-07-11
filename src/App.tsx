
import React from 'react';
import { Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PackingSpecPage from './pages/PackingSpecDetailsPage';
import SimplePodioSetupPage from './pages/SimplePodioSetupPage';
import PodioOAuthCallbackPage from './pages/PodioOAuthCallbackPage';


import { useEffect } from 'react';
import { useToast } from './components/ui/use-toast';
import Index from './pages/Index';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import AdminRoute from './components/AdminRoute';

// ProtectedRoute component to handle authentication
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="md" text="Checking authentication..." />
      </div>
    );
  }

  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/login" replace /> // Redirect to login page if not authenticated
  );
};

// Component to handle OAuth callbacks at root route
const RootRouteHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if this is an OAuth callback (has code and state parameters)
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    if (code && state) {
      // This is an OAuth callback, redirect to the callback page with parameters
      navigate(`/podio-oauth-callback${location.search}`, { replace: true });
    }
  }, [location.search, navigate]);

  // If not an OAuth callback, show the normal setup page
  return <SimplePodioSetupPage />;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRouteHandler />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/podio-setup" element={<SimplePodioSetupPage />} />
      <Route path="/podio-oauth-callback" element={<PodioOAuthCallbackPage />} />
      
      
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
      <Route path="/admin/*" element={<AdminRoute />} />
    </Routes>
  );
};

export default App;
