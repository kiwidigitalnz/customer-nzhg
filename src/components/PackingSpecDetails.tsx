
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPackingSpecDetails, updatePackingSpecStatus, addCommentToPackingSpec, getCommentsFromPodio } from '../services/podioApi';
import { useToast } from '@/hooks/use-toast';
import { formatTextContent } from '@/utils/formatters';
import * as z from 'zod';

// UI Components
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

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
  CommentsTab
} from './packing-spec/tabs';

// Import shared approval interface
import { ApprovalSharedInterface, approvalFormSchema, rejectionFormSchema } from './approval';
import { SpecStatus } from './packing-spec/StatusBadge';

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
}

interface CommentItem {
  id: number;
  text: string;
  createdBy: string;
  createdAt: string;
}

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
        
        if (data.details.customerId && data.details.customerId !== user.id) {
          setError('You do not have permission to view this specification');
          return;
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

  const handleGoBack = () => {
    // Navigate back to dashboard with replace to force a refresh
    navigate('/dashboard', { replace: true });
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleApprove = async (data: z.infer<typeof approvalFormSchema>) => {
    if (!spec) return;
    console.log('Approving with data:', data);
    
    setIsSubmitting(true);
    setIsApprovalPending(true);
    setIsUpdatingStatus(true);
    
    try {
      const approvalData = {
        approvedByName: data.approvedByName,
        comments: data.comments || '',
        signature: data.signature,
        status: 'approve-specification'
      };
      
      const comments = data.comments ? `Approved by ${data.approvedByName}. ${data.comments}` : `Approved by ${data.approvedByName}`;
      
      const success = await updatePackingSpecStatus(
        spec.id, 
        'approved-by-customer',
        comments,
        approvalData
      );
      
      if (success) {
        toast({
          title: "Specification approved successfully",
          description: "The packing specification has been marked as approved.",
          variant: 'default',
        });
        
        // Update state after a brief delay to avoid UI conflicts
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
      // Use a timeout to ensure all state updates settle
      setTimeout(() => {
        setIsSubmitting(false);
        setIsApprovalPending(false);
        setIsUpdatingStatus(false);
      }, 300);
    }
  };

  const handleReject = async (data: z.infer<typeof rejectionFormSchema>) => {
    if (!spec) return;
    console.log('Rejecting with data:', data);
    
    setIsSubmitting(true);
    setIsUpdatingStatus(true);
    
    try {
      const rejectionData = {
        customerRequestedChanges: data.customerRequestedChanges,
        status: 'request-changes'
      };
      
      const success = await updatePackingSpecStatus(
        spec.id, 
        'changes-requested',
        data.customerRequestedChanges,
        rejectionData
      );
      
      if (success) {
        toast({
          title: "Feedback submitted successfully",
          description: "Your requested changes have been sent to the team.",
          variant: 'default',
        });
        
        // Update state after a brief delay to avoid UI conflicts
        setTimeout(() => {
          setSpec(prev => prev ? {
            ...prev, 
            status: 'changes-requested',
            details: {
              ...prev.details,
              customerRequestedChanges: data.customerRequestedChanges
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
      // Use a timeout to ensure all state updates settle
      setTimeout(() => {
        setIsSubmitting(false);
        setIsUpdatingStatus(false);
      }, 300);
    }
  };

  const handleAddComment = async () => {
    if (!spec || !newComment.trim()) return;
    
    setIsAddingComment(true);
    
    try {
      const success = await addCommentToPackingSpec(
        spec.id, 
        newComment
      );
      
      if (success) {
        toast({
          title: 'Comment added successfully',
          variant: 'default',
        });
        
        const newCommentItem: CommentItem = {
          id: Date.now(),
          text: newComment,
          createdBy: user?.name || 'You',
          createdAt: new Date().toISOString()
        };
        
        setSpec(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            comments: [...(prev.comments || []), newCommentItem]
          };
        });
        
        setNewComment('');
        
        setTimeout(async () => {
          try {
            const updatedComments = await getCommentsFromPodio(spec.id);
            if (updatedComments && updatedComments.length > 0) {
              setSpec(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  comments: updatedComments
                };
              });
            }
          } catch (error) {
            console.error('Error refreshing comments after adding a new one:', error);
          }
        }, 1000);
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading specification details...</p>
        </div>
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

  // Determine if there are any pending changes by checking if a signature has been provided
  // but not yet submitted for approval
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-t-4 border-t-primary shadow-md">
            <HeaderSection
              title={spec.title}
              productCode={spec.details.productCode}
              versionNumber={spec.details.versionNumber}
              dateReviewed={spec.details.dateReviewed}
              status={spec.status}
            />
            <CardContent>
              <Tabs defaultValue="overview" className="w-full" onValueChange={handleTabChange}>
                <TabsNavigation newCommentsCount={newCommentsCount} />
                
                <TabsContent value="overview">
                  <HoneySpecificationTab details={spec.details} />
                </TabsContent>
                
                <TabsContent value="requirements">
                  <RequirementsTab details={spec.details} />
                </TabsContent>
                
                <TabsContent value="packaging">
                  <PackagingTab details={spec.details} />
                </TabsContent>
                
                <TabsContent value="label">
                  <LabelingTab details={spec.details} />
                </TabsContent>
                
                <TabsContent value="shipping">
                  <ShippingTab details={spec.details} />
                </TabsContent>
                
                <TabsContent value="comments">
                  <CommentsTab 
                    spec={spec}
                    isActive={activeTab === 'comments'}
                    newComment={newComment}
                    onNewCommentChange={setNewComment}
                    onAddComment={handleAddComment}
                    isAddingComment={isAddingComment}
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
            onOpenApproval={handleOpenApproval}
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
