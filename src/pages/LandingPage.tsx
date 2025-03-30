
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';

const LandingPage = () => {
  return (
    <MainLayout>
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-gradient-to-b from-amber-50 to-white">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <img 
            src="/nz-honey-group-logo.png" 
            alt="NZ Honey Group" 
            className="h-24 mx-auto mb-8"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://placehold.co/320x120/FFF6E5/FFB800?text=NZ+Honey+Group';
            }}
          />
          <h1 className="text-4xl font-bold text-amber-900 mb-4">Welcome to NZ Honey Group</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Access your packing specifications and product approvals through our customer portal
          </p>
          
          <Button asChild size="lg" className="bg-amber-600 hover:bg-amber-700">
            <Link to="/login">Sign In to Customer Portal</Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2 text-amber-800">View Specifications</h3>
            <p className="text-muted-foreground">
              Access and review all your product packing specifications in one place.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2 text-amber-800">Approve Products</h3>
            <p className="text-muted-foreground">
              Easily approve packing specifications and provide feedback.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2 text-amber-800">Track Progress</h3>
            <p className="text-muted-foreground">
              Monitor the status of your products throughout the approval process.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default LandingPage;
