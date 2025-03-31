
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { ArrowRight, CheckCircle, Beaker, FileCheck, LineChart, AlertTriangle } from 'lucide-react';

interface LandingPageProps {
  podioAuthError: string | null;
}

const LandingPage: React.FC<LandingPageProps> = ({ podioAuthError }) => {
  return (
    <MainLayout>
      {/* Display error banner if there's a Podio auth error */}
      {podioAuthError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-sm text-red-700">
              <span className="font-medium">Connection Error:</span> {podioAuthError}
            </p>
          </div>
        </div>
      )}
      
      {/* Hero Section - Modern design with gradient background */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="absolute inset-0">
          <div className="absolute top-10 right-10 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute bottom-10 left-10 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <img 
              src="https://dl.dropbox.com/scl/fi/ln475joiipgz6wb0vqos8/NZHG-Logo.png?rlkey=yh8katmkzr3h2lnd7mvswilul" 
              alt="NZ Honey Group" 
              className="h-24 md:h-28 mx-auto"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://placehold.co/320x120/F0F8FF/0078D7?text=NZ+Honey+Group';
              }}
            />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 leading-tight">
              Premium Honey <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">Customer Portal</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your gateway to streamlined product approvals, specifications, and collaboration with our team through our intuitive customer portal.
            </p>
            <div className="pt-6">
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
                <Link to="/login" className="gap-2">
                  Sign In <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
      </div>

      {/* Features Section - More organic and flowing design */}
      <div className="bg-white py-16 md:py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50/30 to-white"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Streamlined Product Management</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our portal brings together everything you need to manage your honey products with ease
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:translate-y-[-5px] group">
              <div className="bg-blue-100 p-3 rounded-full w-fit mb-6 group-hover:bg-blue-200 transition-colors">
                <FileCheck className="h-6 w-6 text-blue-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Product Specifications</h3>
              <p className="text-gray-600">
                Access and review all your product packing specifications in one secure location. Download detailed reports and stay informed.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:translate-y-[-5px] group">
              <div className="bg-blue-100 p-3 rounded-full w-fit mb-6 group-hover:bg-blue-200 transition-colors">
                <Beaker className="h-6 w-6 text-blue-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Quality Approvals</h3>
              <p className="text-gray-600">
                Approve honey specifications and packaging details with an intuitive interface. Provide feedback directly to our team.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:translate-y-[-5px] group">
              <div className="bg-blue-100 p-3 rounded-full w-fit mb-6 group-hover:bg-blue-200 transition-colors">
                <LineChart className="h-6 w-6 text-blue-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Progress Tracking</h3>
              <p className="text-gray-600">
                Monitor the status of your honey products throughout the approval process with real-time updates and notifications.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section - More modern design with subtle wave background */}
      <div className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-blue-50 opacity-70"></div>
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
        
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="bg-white/80 backdrop-blur-sm py-12 px-6 rounded-2xl shadow-sm border border-blue-100 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Ready to Manage Your Products?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Sign in to access your personalized customer portal and start managing your honey product approvals today.
            </p>
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Link to="/login" className="gap-2">
                Access Customer Portal <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default LandingPage;
