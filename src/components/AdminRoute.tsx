
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SimplePodioSetupPage from '../pages/SimplePodioSetupPage';
import DebugPage from '../pages/DebugPage';

const AdminRoute = () => {
  const { user, isAuthenticated } = useAuth();
  
  // Only render these routes in an authenticated admin context
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/podio-setup" replace />} />
      <Route path="/podio-setup" element={<SimplePodioSetupPage />} />
      <Route path="/debug" element={<DebugPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AdminRoute;
