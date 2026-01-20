
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface MainLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();
  const currentYear = new Date().getFullYear();

  return (
    <>
      <div className="flex flex-col min-h-screen bg-slate-50">
        <main className="flex-grow">
          {children}
        </main>
        <footer className="py-4 bg-white border-t border-gray-200 mt-auto">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-xs text-gray-500 mb-1 sm:mb-0">
              &copy; {currentYear} NZ Honey Group Ltd. All rights reserved.
            </p>
            <p className="text-xs text-gray-500">
              Customer Portal v2.0
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default MainLayout;
