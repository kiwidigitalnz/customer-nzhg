
import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from './ui/loading-spinner';

interface MainLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

const MainLayout = ({ children, requireAuth = false }: MainLayoutProps) => {
  const { user, loading } = useAuth();

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
        <footer className="border-t py-5 bg-white shadow-sm mt-10">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground mb-2 sm:mb-0">
              &copy; {new Date().getFullYear()} NZ Honey Group Ltd. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Customer Portal v1.0
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default MainLayout;
