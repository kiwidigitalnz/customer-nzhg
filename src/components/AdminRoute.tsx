
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Lazy load admin pages to reduce initial bundle size
const PodioSetupPage = lazy(() => import('../pages/PodioSetupPage'));
const PodioCallbackPage = lazy(() => import('../pages/PodioCallbackPage'));

const AdminRoute = () => {
  // Only render these routes in an authenticated admin context, not in production
  // In a real production environment, this would use a proper auth check
  return null;
};

export default AdminRoute;
