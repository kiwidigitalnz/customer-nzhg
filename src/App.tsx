
import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
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

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SimplePodioSetupPage />} />
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
