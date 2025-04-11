
import { useState, useEffect } from 'react';
import PackingSpecDetails from '../components/PackingSpecDetails';
import MainLayout from '../components/MainLayout';
import { Package, AlertTriangle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { isPodioConfigured } from '../services/podioApi';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SectionApprovalProvider } from '@/contexts/SectionApprovalContext';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

const PackingSpecDetailsPage = () => {
  const [loading, setLoading] = useState(true);
  const [podioError, setPodioError] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check Podio configuration
    const podioConfigured = isPodioConfigured();
    
    if (!podioConfigured) {
      setPodioError(true);
    }
    
    // Simulate loading for better UX
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    
    // Check if user has seen the guide before
    const hasSeenGuide = localStorage.getItem('packing_spec_guide_seen');
    if (!hasSeenGuide) {
      // Wait for loading to complete before showing guide
      setTimeout(() => {
        setShowGuide(true);
      }, 500);
    }
    
    return () => clearTimeout(timer);
  }, []);
  
  // Function to handle navigating back to dashboard
  const handleBackToDashboard = () => {
    // Force a refresh of the dashboard when going back
    navigate('/dashboard', { replace: true });
  };
  
  // Close guide and remember user preference
  const handleCloseGuide = () => {
    setShowGuide(false);
    localStorage.setItem('packing_spec_guide_seen', 'true');
  };
  
  return (
    <MainLayout requireAuth>
      {loading ? (
        <div className="flex justify-center items-center h-[80vh]">
          <LoadingSpinner 
            size="lg" 
            icon={<Package className="text-primary/70" />}
            text="Loading specification details..."
            subtext="This may take a moment"
          />
        </div>
      ) : podioError ? (
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="mb-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Connection Issue</AlertTitle>
            <AlertDescription>
              We're having trouble connecting to our data service. Please try again later or contact support.
            </AlertDescription>
          </Alert>
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Service Temporarily Unavailable</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              We're working to restore full functionality as soon as possible. 
              Please check back later or contact our support team for assistance.
            </p>
          </div>
        </div>
      ) : (
        <SectionApprovalProvider>
          <PackingSpecDetails />
          
          {/* Getting Started Guide Dialog */}
          <Dialog open={showGuide} onOpenChange={setShowGuide}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center">
                  <Info className="h-5 w-5 mr-2 text-blue-600" />
                  Welcome to Packing Specification Review
                </DialogTitle>
                <DialogDescription className="text-base">
                  Follow these steps to review and approve a packing specification
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border rounded-lg p-4 bg-muted/20">
                  <div className="md:col-span-1 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                      <span className="text-2xl font-bold text-blue-600">1</span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <h3 className="font-medium text-lg">Review each section</h3>
                    <p className="text-muted-foreground">
                      Navigate through each tab (Honey Specification, Requirements, Packaging, etc.) 
                      and review the information provided. Each section can be approved individually
                      as you go through them.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border rounded-lg p-4 bg-muted/20">
                  <div className="md:col-span-1 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                      <span className="text-2xl font-bold text-green-600">2</span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <h3 className="font-medium text-lg">Provide feedback</h3>
                    <p className="text-muted-foreground">
                      You can request changes for specific sections by clicking the "Request Changes" 
                      button and providing detailed feedback. You can also add general comments on 
                      the "Final Approval" tab.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border rounded-lg p-4 bg-muted/20">
                  <div className="md:col-span-1 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                      <span className="text-2xl font-bold text-amber-600">3</span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <h3 className="font-medium text-lg">Final decision</h3>
                    <p className="text-muted-foreground">
                      Once you've reviewed all sections, navigate to the "Final Approval" tab
                      to either approve the entire specification or request changes. Your signature 
                      will be required for final approval.
                    </p>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={handleCloseGuide} className="w-full sm:w-auto">
                  Got it, let's start reviewing
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SectionApprovalProvider>
      )}
    </MainLayout>
  );
};

export default PackingSpecDetailsPage;
