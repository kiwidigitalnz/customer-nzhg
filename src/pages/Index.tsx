
import { Navigate } from 'react-router-dom';

const Index = () => {
  // With auth removed, we always redirect to dashboard
  return <Navigate to="/dashboard" replace />;
};

export default Index;
