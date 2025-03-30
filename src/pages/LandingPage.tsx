import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { ArrowRight, CheckCircle, Beaker, FileCheck, LineChart } from 'lucide-react';
const LandingPage = () => {
  return <MainLayout>
      {/* Hero Section - With honey packing image */}
      <div className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full blur-3xl"></div>
          <div className="absolute top-60 -left-20 w-72 h-72 bg-blue-100 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-8">
              <img src="https://dl.dropbox.com/scl/fi/ln475joiipgz6wb0vqos8/NZHG-Logo.png?rlkey=yh8katmkzr3h2lnd7mvswilul" alt="NZ Honey Group" className="h-24 md:h-28" onError={e => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://placehold.co/320x120/F0F8FF/0078D7?text=NZ+Honey+Group';
            }} />
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 leading-tight">
                Premium Honey <span className="text-blue-600">Welcome to your Customer Portal</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl">
                Your gateway to streamlined product approvals, specifications, and collaboration with our team through our intuitive customer portal.
              </p>
              <div className="pt-4">
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Link to="/login" className="gap-2">
                    Sign In <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="flex-1 relative">
              <img src="https://dl.dropbox.com/scl/fi/jzfwk0tz6y49mzqc8bpn2/honey-jar-packaging-transparent.png?rlkey=0h3nwxddpnx5n6b5k6wj4f20t" alt="Honey Packaging" className="max-w-full h-auto" onError={e => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://placehold.co/600x400/F0F8FF/0078D7?text=Honey+Packaging';
            }} />
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-white"></div>
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
    </MainLayout>;
};
export default LandingPage;