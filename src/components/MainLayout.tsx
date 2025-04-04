
import { ReactNode, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from './ui/loading-spinner';

interface MainLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

const MainLayout = ({ children, requireAuth = false }: MainLayoutProps) => {
  const { user, loading, checkSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentYear = new Date().getFullYear();
  const isCallbackPage = location.pathname === '/podio-callback';

  // Check session validity periodically
  useEffect(() => {
    if (requireAuth && user) {
      const interval = setInterval(() => {
        if (!checkSession()) {
          // Session expired, redirect to login
          navigate('/', { replace: true });
        }
      }, 60 * 1000); // Check every minute
      
      return () => clearInterval(interval);
    }
  }, [requireAuth, user, checkSession, navigate]);

  if (loading) {
    return (
      <LoadingSpinner 
        fullscreen 
        size="lg" 
        text="Loading..."
        subtext="Please wait while we set things up for you"
      />
    );
  }

  // Special case for the callback page - don't redirect
  if (isCallbackPage) {
    return (
      <>
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20">
          <main className="flex-grow">
            {children}
          </main>
          <footer className="border-t border-gray-100 py-4 bg-white/80 backdrop-blur-sm mt-auto">
            <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center">
              <p className="text-xs text-gray-400 mb-1 sm:mb-0">
                &copy; {currentYear} NZ Honey Group Ltd. All rights reserved.
              </p>
              <p className="text-xs text-gray-400">
                Customer Portal v1.0
              </p>
            </div>
          </footer>
        </div>
      </>
    );
  }

  // If authentication is required but user isn't logged in, redirect to login
  if (requireAuth && !user) {
    return <Navigate to="/" replace />;
  }

  // If user is logged in but on the login page, redirect to dashboard
  if (user && !requireAuth) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20">
        <main className="flex-grow">
          {children}
        </main>
        <footer className="border-t border-gray-100 py-4 bg-white/80 backdrop-blur-sm mt-auto">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-xs text-gray-400 mb-1 sm:mb-0">
              &copy; {currentYear} NZ Honey Group Ltd. All rights reserved.
            </p>
            <p className="text-xs text-gray-400">
              Customer Portal v1.0
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default MainLayout;
