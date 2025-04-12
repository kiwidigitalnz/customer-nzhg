
import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '../contexts/AuthContext';

// Lazy load admin pages to reduce initial bundle size
const PodioSetupPage = lazy(() => import('../pages/PodioSetupPage'));
const PodioCallbackPage = lazy(() => import('../pages/PodioCallbackPage'));

const AdminRoute = () => {
  const { user, isAuthenticated } = useAuth();
  
  // Only render these routes in an authenticated admin context
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <Routes>
      <Route 
        path="podio-setup" 
        element={
          <Suspense fallback={<LoadingSpinner size="md" text="Loading admin page..." />}>
            <PodioSetupPage />
          </Suspense>
        } 
      />
      <Route 
        path="podio-callback" 
        element={
          <Suspense fallback={<LoadingSpinner size="md" text="Loading callback handler..." />}>
            <PodioCallbackPage />
          </Suspense>
        } 
      />
    </Routes>
  );
};

export default AdminRoute;
