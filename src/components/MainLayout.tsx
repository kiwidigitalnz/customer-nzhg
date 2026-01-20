import { ReactNode } from 'react';
import { Mail } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <div className="flex flex-col min-h-screen bg-slate-50">
        <main className="flex-grow">
          {children}
        </main>
        <footer className="py-6 bg-white border-t border-gray-200 mt-auto">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-gray-500">
              &copy; {currentYear} NZ Honey Group Ltd. All rights reserved.
            </p>
            <a 
              href="mailto:support@nzhg.com" 
              className="inline-flex items-center gap-1.5 text-xs text-honey-gold hover:text-honey-amber transition-colors font-medium"
            >
              <Mail className="h-3.5 w-3.5" />
              support@nzhg.com
            </a>
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
