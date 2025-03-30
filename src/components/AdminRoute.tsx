
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Lazy load admin pages to reduce initial bundle size
const PodioSetupPage = lazy(() => import('../pages/PodioSetupPage'));
const PodioCallbackPage = lazy(() => import('../pages/PodioCallbackPage'));

const AdminRoute = () => {
  // Only render these routes in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Suspense fallback={<LoadingSpinner fullscreen size="lg" text="Loading admin page..." />}>
      <Routes>
        <Route path="podio-setup" element={<PodioSetupPage />} />
        <Route path="podio-callback" element={<PodioCallbackPage />} />
      </Routes>
    </Suspense>
  );
};

export default AdminRoute;
