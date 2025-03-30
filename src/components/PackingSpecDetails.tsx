
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

// Types
interface PackingSpec {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
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

// Form Schemas
const approvalFormSchema = z.object({
  approvedByName: z.string().min(2, { message: "Please enter your name" }),
  comments: z.string().optional(),
  signature: z.string().min(1, { message: "Signature is required" }),
});

const rejectionFormSchema = z.object({
  customerRequestedChanges: z.string().min(10, { message: "Please provide detailed feedback on why you're rejecting this specification" })
});

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

  // Fetch spec details
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
      } catch (err) {
        console.error('Error fetching spec details:', err);
        setError('Failed to load specification details');
      } finally {
        setLoading(false);
      }
    };

    fetchSpecDetails();
  }, [specId, user, navigate]);

  // Handlers
  const handleGoBack = () => {
    navigate('/dashboard');
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Approval and rejection handlers
  const handleApprove = async (data: z.infer<typeof approvalFormSchema>) => {
    if (!spec) return;
    
    setIsSubmitting(true);
    
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
        'approved', 
        comments,
        approvalData
      );
      
      if (success) {
        toast({
          title: "Specification approved successfully",
          description: "The packing specification has been marked as approved.",
          variant: 'default',
        });
        
        setSpec(prev => prev ? {
          ...prev, 
          status: 'approved',
          details: {
            ...prev.details,
            approvedByName: data.approvedByName,
            approvalDate: new Date().toISOString(),
            signature: data.signature
          }
        } : null);
      } else {
        toast({
          title: 'Error',
          description: "Failed to approve the specification. Please try again.",
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: "An unexpected error occurred. Please try again.",
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (data: z.infer<typeof rejectionFormSchema>) => {
    if (!spec) return;
    
    setIsSubmitting(true);
    
    try {
      const rejectionData = {
        customerRequestedChanges: data.customerRequestedChanges,
        status: 'request-changes'
      };
      
      const success = await updatePackingSpecStatus(
        spec.id, 
        'rejected', 
        data.customerRequestedChanges,
        rejectionData
      );
      
      if (success) {
        toast({
          title: "Specification rejected",
          description: "Feedback has been sent to the team.",
          variant: 'default',
        });
        
        setSpec(prev => prev ? {
          ...prev, 
          status: 'rejected',
          details: {
            ...prev.details,
            customerRequestedChanges: data.customerRequestedChanges
          }
        } : null);
      } else {
        toast({
          title: 'Error',
          description: "Failed to reject the specification. Please try again.",
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: "An unexpected error occurred. Please try again.",
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!spec || !newComment.trim()) return;
    
    setIsAddingComment(true);
    
    try {
      const success = await addCommentToPackingSpec(
        spec.id, 
        newComment, 
        user?.name || 'Anonymous User'
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
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingComment(false);
    }
  };

  // Loading state
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

  // Error state
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

  // Main rendering
  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="outline" onClick={handleGoBack} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>
      
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
                <TabsNavigation newCommentsCount={newCommentsCount} hideApprovalsTab={true} />
                
                {/* Honey Specification Tab */}
                <TabsContent value="overview">
                  <HoneySpecificationTab details={spec.details} />
                </TabsContent>
                
                {/* Requirements Tab */}
                <TabsContent value="requirements">
                  <RequirementsTab details={spec.details} />
                </TabsContent>
                
                {/* Packaging Tab */}
                <TabsContent value="packaging">
                  <PackagingTab details={spec.details} />
                </TabsContent>
                
                {/* Label Tab */}
                <TabsContent value="label">
                  <LabelingTab details={spec.details} />
                </TabsContent>
                
                {/* Shipping Tab */}
                <TabsContent value="shipping">
                  <ShippingTab details={spec.details} />
                </TabsContent>
                
                {/* Comments Tab */}
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
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default PackingSpecDetails;
