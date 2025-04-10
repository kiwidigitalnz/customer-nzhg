import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPackingSpecDetails, updatePackingSpecStatus } from '../services/podioApi';
import { useToast } from '@/hooks/use-toast';
import { formatTextContent } from '@/utils/formatters';
import * as z from 'zod';

// UI Components
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Custom Components
import HeaderSection from './packing-spec/HeaderSection';
import OverviewSidebar from './packing-spec/OverviewSidebar';
import TabsNavigation from './packing-spec/TabsNavigation';
import {
  HoneySpecificationTab,
  RequirementsTab,
  PackagingTab,
  LabelingTab,
  ShippingTab,
  DocumentsTab,
  CommentsTab
} from './packing-spec/tabs';
import FinalApprovalTab from './packing-spec/tabs/FinalApprovalTab';

// Import shared approval interface
import { ApprovalSharedInterface, approvalFormSchema, rejectionFormSchema } from './approval';
import { SpecStatus } from './packing-spec/StatusBadge';
import { useSectionApproval, SectionName } from '@/contexts/SectionApprovalContext';
import { addCommentToPackingSpec, getCommentsFromPodio } from '../services/podioApi';

// Types
interface PackingSpec {
  id: number;
  title: string;
  description: string;
  status: SpecStatus;
  createdAt: string;
  details: {
    [key: string]: any;
  };
  comments?: CommentItem[];
  files?: {
    id: number;
    name: string;
    link: string;
    size?: string;
    mimetype?: string;
  }[];
}

interface CommentItem {
  id: number;
  text: string;
  createdBy: string;
  createdAt: string;
}

// Order of tabs for navigation
const TAB_ORDER: SectionName[] = ['overview', 'requirements', 'packaging', 'label', 'shipping', 'documents'];
const TAB_NAMES: Record<SectionName, string> = {
  'overview': 'Honey Specification',
  'requirements': 'Requirements',
  'packaging': 'Packaging',
  'label': 'Labeling',
  'shipping': 'Shipping',
  'documents': 'Documents'
};

// Main component that uses the section approval context
const PackingSpecDetails = () => {
  const { id } = useParams<{ id: string }>();
  const specId = id ? parseInt(id) : 0;
  const { user } = useAuth();
  const [spec, setSpec] = useState<PackingSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const navigate = useNavigate();
  const [newCommentsCount, setNewCommentsCount] = useState<number>(0);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [isApprovalPending, setIsApprovalPending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { sectionStates, updateSectionStatus, allSectionsApproved, anySectionsWithChangesRequested } = useSectionApproval();
  const [sectionFeedback, setSectionFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchSpecDetails = async () => {
      if (!specId) return;
      
      setLoading(true);
      try {
        const data = await getPackingSpecDetails(specId);
        
        if (!data) {
          setError('Packing specification not found');
          return;
        }
        
        const customerIdFromData = data.details?.customerId;
        const userIdFromAuth = user?.id;
        
        if (customerIdFromData && userIdFromAuth && customerIdFromData !== userIdFromAuth) {
          console.log('Permission check failed:', { 
            customerId: customerIdFromData, 
            userId: userIdFromAuth 
          });
          setError('You do not have permission to view this specification');
          return;
        }
        
        if (!data.comments) {
          data.comments = [];
        }
        
        setSpec(data);
        console.log('Loaded specification:', data);
      } catch (err) {
        console.error('Error fetching spec details:', err);
        setError('Failed to load specification details');
      } finally {
        setLoading(false);
      }
    };

    fetchSpecDetails();
  }, [specId, user, navigate]);

  const handleAddComment = async () => {
    if (!spec || !newComment.trim()) return;
    
    setIsAddingComment(true);
    
    try {
      console.log(`Attempting to add comment to spec ID ${spec.id}`);
      
      const companyName = user?.name || "Customer";
      const formattedComment = `[${companyName}] ${newComment}`;
      
      const success = await addCommentToPackingSpec(
        spec.id, 
        formattedComment
      );
      
      if (success) {
        toast({
          title: 'Comment added successfully',
          variant: 'default',
        });
        
        setNewComment('');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add comment. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleOpenApproval = () => {
    setApprovalDialogOpen(true);
  };

  const handleSectionApproval = async (section: string): Promise<void> => {
    if (!spec) return;
    
    try {
      const sectionName = section.toLowerCase().replace(/\s+/g, '-');
      
      // We're no longer adding a comment here, just updating the section status
      updateSectionStatus(sectionName as SectionName, 'approved');
      
      toast({
        title: `${section} approved`,
        description: "This section has been marked as approved.",
        variant: 'default',
      });
      
      // Navigate to the next section that needs approval
      setTimeout(() => {
        navigateToNextTab();
      }, 500);
    } catch (error) {
      console.error(`Error approving section ${section}:`, error);
      toast({
        title: 'Error',
        description: `Failed to approve ${section}. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  const handleSectionRequestChanges = async (section: string, comments: string): Promise<void> => {
    if (!spec) return;
    
    try {
      // Save feedback to state for later inclusion in the final rejection
      setSectionFeedback(prev => ({
        ...prev,
        [section]: comments
      }));
      
      const sectionName = section.toLowerCase().replace(/\s+/g, '-');
      
      // Update section status in context without adding a comment
      updateSectionStatus(sectionName as SectionName, 'changes-requested');
      
      toast({
        title: `Changes requested for ${section}`,
        description: "Your feedback has been saved and will be submitted with final changes.",
        variant: 'default',
      });
    } catch (error) {
      console.error(`Error requesting changes for section ${section}:`, error);
      toast({
        title: 'Error',
        description: `Failed to save feedback for ${section}. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  // Find the next tab in the sequence
  const findNextTabInSequence = (currentTab: string): string => {
    const tabOrder = [...TAB_ORDER, 'final-approval'];
    const currentIndex = tabOrder.indexOf(currentTab as any);
    
    if (currentIndex === -1 || currentIndex === tabOrder.length - 1) {
      return currentTab; // Stay on current tab if not found or already on the last tab
    }
    
    return tabOrder[currentIndex + 1];
  };
  
  // Navigate to the next tab in the sequence
  const navigateToNextTab = () => {
    const nextTab = findNextTabInSequence(activeTab);
    setActiveTab(nextTab);
  };

  const handleGoBack = () => {
    navigate('/dashboard', { replace: true });
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const collectAllSectionFeedback = () => {
    let combinedFeedback = "";
    
    Object.entries(sectionFeedback).forEach(([section, feedback]) => {
      if (feedback && feedback.trim()) {
        combinedFeedback += `\n\n== ${section} ==\n${feedback}`;
      }
    });
    
    return combinedFeedback.trim();
  };

  const handleApprove = async (data: z.infer<typeof approvalFormSchema>) => {
    if (!spec) return;
    console.log('Approving with data:', data);
    
    setIsSubmitting(true);
    setIsApprovalPending(true);
    setIsUpdatingStatus(true);
    
    try {
      const comments = data.comments ? `Approved by ${data.approvedByName}. ${data.comments}` : `Approved by ${data.approvedByName}`;
      
      const success = await updatePackingSpecStatus(
        spec.id, 
        'approved-by-customer',
        comments
      );
      
      if (success) {
        toast({
          title: "Specification approved successfully",
          description: "The packing specification has been marked as approved.",
          variant: 'default',
        });
        
        setTimeout(() => {
          setSpec(prev => prev ? {
            ...prev, 
            status: 'approved-by-customer',
            details: {
              ...prev.details,
              approvedByName: data.approvedByName,
              approvalDate: new Date().toISOString(),
              signature: data.signature
            }
          } : null);
        }, 300);
      } else {
        toast({
          title: 'Error',
          description: "Failed to approve the specification. Please try again.",
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error in approval process:', error);
      toast({
        title: 'Error',
        description: "An unexpected error occurred. Please try again.",
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
        setIsApprovalPending(false);
        setIsUpdatingStatus(false);
      }, 300);
    }
  };

  // Update the handleReject function to include all section feedback
  const handleReject = async (data: z.infer<typeof rejectionFormSchema>) => {
    if (!spec) return;
    console.log('Rejecting with data:', data);
    
    setIsSubmitting(true);
    setIsUpdatingStatus(true);
    
    try {
      // Combine all section feedback with the final rejection comments
      let fullFeedback = data.customerRequestedChanges;
      const allSectionFeedback = collectAllSectionFeedback();
      
      if (allSectionFeedback) {
        fullFeedback = `${data.customerRequestedChanges}\n\n=== Section-specific feedback ===\n${allSectionFeedback}`;
      }
      
      const success = await updatePackingSpecStatus(
        spec.id, 
        'changes-requested',
        fullFeedback
      );
      
      if (success) {
        toast({
          title: "Feedback submitted successfully",
          description: "Your requested changes have been sent to the team.",
          variant: 'default',
        });
        
        setTimeout(() => {
          setSpec(prev => prev ? {
            ...prev, 
            status: 'changes-requested',
            details: {
              ...prev.details,
              customerRequestedChanges: fullFeedback
            }
          } : null);
        }, 300);
      } else {
        toast({
          title: 'Error',
          description: "Failed to submit your feedback. Please try again.",
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error in rejection process:', error);
      toast({
        title: 'Error',
        description: "An unexpected error occurred. Please try again.",
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
        setIsUpdatingStatus(false);
      }, 300);
    }
  };

  const handleStatusUpdated = () => {
    // Refresh spec data
    if (specId) {
      getPackingSpecDetails(specId).then(data => {
        if (data) {
          setSpec(data);
        }
      });
    }
  };

  const navigateToFinalApprovalTab = () => {
    setActiveTab('final-approval');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <LoadingSpinner size="lg" text="Loading specification details..." />
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Button variant="outline" onClick={handleGoBack} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <Card className="mx-auto max-w-3xl bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="font-medium text-lg">Error Loading Specification</h3>
                <p className="text-muted-foreground">{error || 'Specification not found'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const approvalPreview = (
    <div className="text-sm">
      <p><strong>Product:</strong> {spec.details.product || 'N/A'}</p>
      <p><strong>Code:</strong> {spec.details.productCode || 'N/A'}</p>
      <p><strong>Version:</strong> {spec.details.versionNumber || 'N/A'}</p>
    </div>
  );

  const hasPendingChanges = isApprovalPending;

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="outline" onClick={handleGoBack} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>
      
      {hasPendingChanges && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">Signature captured</h3>
              <p className="text-blue-700 text-sm mt-1">
                Your approval has been prepared but not yet submitted. Please complete the approval process.
              </p>
            </div>
          </div>
        </div>
      )}

      {allSectionsApproved && spec.status !== 'approved-by-customer' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-800">All sections approved</h3>
              <p className="text-green-700 text-sm mt-1">
                You have approved all sections. You can now provide final approval for the entire specification.
              </p>
            </div>
          </div>
        </div>
      )}

      {anySectionsWithChangesRequested && spec.status !== 'changes-requested' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">Changes requested</h3>
              <p className="text-amber-700 text-sm mt-1">
                You have requested changes for some sections. You may still review other sections or submit your final feedback.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-t-4 border-t-primary shadow-md">
            <HeaderSection
              title={spec.details.product || spec.title}
              productCode={spec.details.productCode}
              versionNumber={spec.details.versionNumber}
              dateReviewed={spec.details.dateReviewed}
              status={spec.status}
            />
            <CardContent>
              <Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
                <TabsNavigation newCommentsCount={newCommentsCount} />
                
                <TabsContent value="overview">
                  <HoneySpecificationTab 
                    details={spec.details} 
                    onApproveSection={handleSectionApproval}
                    onRequestChanges={handleSectionRequestChanges}
                    onNavigateToNextTab={navigateToNextTab}
                  />
                </TabsContent>
                
                <TabsContent value="requirements">
                  <RequirementsTab 
                    details={spec.details} 
                    onApproveSection={handleSectionApproval}
                    onRequestChanges={handleSectionRequestChanges}
                    onNavigateToNextTab={navigateToNextTab}
                  />
                </TabsContent>
                
                <TabsContent value="packaging">
                  <PackagingTab 
                    details={spec.details} 
                    onApproveSection={handleSectionApproval}
                    onRequestChanges={handleSectionRequestChanges}
                    onNavigateToNextTab={navigateToNextTab}
                  />
                </TabsContent>
                
                <TabsContent value="label">
                  <LabelingTab 
                    details={spec.details}
                    onApproveSection={handleSectionApproval}
                    onRequestChanges={handleSectionRequestChanges}
                    onNavigateToNextTab={navigateToNextTab}
                  />
                </TabsContent>
                
                <TabsContent value="shipping">
                  <ShippingTab 
                    details={spec.details} 
                    onApproveSection={handleSectionApproval}
                    onRequestChanges={handleSectionRequestChanges}
                    onNavigateToNextTab={navigateToNextTab}
                  />
                </TabsContent>
                
                <TabsContent value="documents">
                  <DocumentsTab 
                    details={spec.details} 
                    files={spec.files} 
                    onApproveSection={handleSectionApproval}
                    onRequestChanges={handleSectionRequestChanges}
                    onNavigateToNextTab={navigateToNextTab}
                  />
                </TabsContent>
                
                <TabsContent value="final-approval">
                  <FinalApprovalTab 
                    spec={spec}
                    isActive={activeTab === 'final-approval'}
                    newComment={newComment}
                    onNewCommentChange={setNewComment}
                    onAddComment={handleAddComment}
                    isAddingComment={isAddingComment}
                    onStatusUpdated={handleStatusUpdated}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <OverviewSidebar 
            details={spec.details}
            status={spec.status}
            createdAt={spec.createdAt}
            spec={spec}
            user={user}
            onApprove={handleApprove}
            onReject={handleReject}
            isSubmitting={isSubmitting || isUpdatingStatus}
            onNavigateToFinalTab={navigateToFinalApprovalTab}
          />
        </div>
      </div>

      <ApprovalSharedInterface
        isOpen={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        onApprove={handleApprove}
        onReject={handleReject}
        title="Review Packing Specification"
        description="Please review all details carefully before approving or requesting changes."
        isSubmitting={isSubmitting || isUpdatingStatus}
        defaultName={user?.name || ''}
        itemPreview={approvalPreview}
      />
    </div>
  );
};

export default PackingSpecDetails;
