
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { ArrowRight, CheckCircle, Beaker, FileCheck, LineChart } from 'lucide-react';

const LandingPage = () => {
  return (
    <MainLayout>
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-white">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-8">
              <img 
                src="https://dl.dropbox.com/scl/fi/ln475joiipgz6wb0vqos8/NZHG-Logo.png?rlkey=yh8katmkzr3h2lnd7mvswilul" 
                alt="NZ Honey Group" 
                className="h-24 md:h-28"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://placehold.co/320x120/FFF6E5/FFB800?text=NZ+Honey+Group';
                }}
              />
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-amber-900 leading-tight">
                Customer Portal for Premium Honey Products
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Streamline your product approvals, access specifications, and collaborate with our team through our secure customer portal.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild size="lg" className="bg-amber-600 hover:bg-amber-700 text-white">
                  <Link to="/login" className="gap-2">
                    Sign In to Portal <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="relative z-10 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-amber-100">
                <div className="absolute -top-3 -left-3 bg-amber-100 text-amber-800 px-4 py-1 rounded-lg text-sm font-medium">
                  Customer Access
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-500 h-5 w-5" />
                    <p className="text-gray-700">Real-time product specifications</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-500 h-5 w-5" />
                    <p className="text-gray-700">Approve packaging and labeling</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-500 h-5 w-5" />
                    <p className="text-gray-700">Access honey quality reports</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-500 h-5 w-5" />
                    <p className="text-gray-700">View product images and documents</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-500 h-5 w-5" />
                    <p className="text-gray-700">Secure and encrypted access</p>
                  </div>
                </div>
              </div>
              <div className="absolute top-10 -right-16 w-32 h-32 bg-amber-300 rounded-full opacity-20 blur-3xl"></div>
              <div className="absolute -bottom-10 -left-16 w-40 h-40 bg-amber-500 rounded-full opacity-10 blur-3xl"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-amber-900 mb-4">Streamline Your Product Approvals</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our customer portal provides everything you need to manage your honey products efficiently
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-amber-50 p-8 rounded-xl shadow-sm border border-amber-100 hover:shadow-md transition-shadow">
              <div className="bg-amber-100 p-3 rounded-lg w-fit mb-6">
                <FileCheck className="h-6 w-6 text-amber-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-amber-900">Product Specifications</h3>
              <p className="text-muted-foreground">
                Access and review all your product packing specifications in one secure location. Download detailed reports and stay informed.
              </p>
            </div>
            
            <div className="bg-amber-50 p-8 rounded-xl shadow-sm border border-amber-100 hover:shadow-md transition-shadow">
              <div className="bg-amber-100 p-3 rounded-lg w-fit mb-6">
                <Beaker className="h-6 w-6 text-amber-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-amber-900">Quality Approvals</h3>
              <p className="text-muted-foreground">
                Approve honey specifications and packaging details with an intuitive interface. Provide feedback directly to our team.
              </p>
            </div>
            
            <div className="bg-amber-50 p-8 rounded-xl shadow-sm border border-amber-100 hover:shadow-md transition-shadow">
              <div className="bg-amber-100 p-3 rounded-lg w-fit mb-6">
                <LineChart className="h-6 w-6 text-amber-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-amber-900">Progress Tracking</h3>
              <p className="text-muted-foreground">
                Monitor the status of your honey products throughout the approval process with real-time updates and notifications.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-amber-100 to-amber-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-amber-900 mb-6">Ready to Manage Your Products?</h2>
          <p className="text-xl text-amber-800/80 max-w-2xl mx-auto mb-8">
            Sign in to access your personalized customer portal and start managing your honey product approvals today.
          </p>
          <Button asChild size="lg" className="bg-amber-600 hover:bg-amber-700">
            <Link to="/login" className="gap-2">
              Access Customer Portal <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default LandingPage;
