
import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

const MainLayout = ({ children, requireAuth = false }: MainLayoutProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
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
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow">
          {children}
        </main>
        <footer className="border-t py-6 bg-muted/30">
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
