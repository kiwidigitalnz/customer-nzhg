
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute = () => {
  const { user, isAuthenticated } = useAuth();
  
  // Only render these routes in an authenticated admin context
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <Routes>
      {/* Admin routes can be added here in the future */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AdminRoute;
