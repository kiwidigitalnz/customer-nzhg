
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, MessageSquare, Send, Loader2, AlertCircle, InfoIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import CommentsList from '../CommentsList';
import { useCommentPolling } from '@/hooks/useCommentPolling';
import { CommentItem } from '@/services/podio/podioComments';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import EnhancedApprovalDialog from '@/components/approval/EnhancedApprovalDialog';
import { SpecStatus } from '../StatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSectionApproval } from '@/contexts/SectionApprovalContext';

interface FinalApprovalTabProps {
  spec: {
    id: number;
    comments?: CommentItem[];
    status: string;
  };
  isActive: boolean;
  newComment: string;
  onNewCommentChange: (comment: string) => void;
  onAddComment: () => Promise<void>;
  isAddingComment: boolean;
  onStatusUpdated?: () => void;
}

const FinalApprovalTab: React.FC<FinalApprovalTabProps> = ({
  spec,
  isActive,
  newComment,
  onNewCommentChange,
  onAddComment,
  isAddingComment,
  onStatusUpdated
}) => {
  const [activeTab, setActiveTab] = useState<string>('comments');
  const { toast } = useToast();
  const { allSectionsApproved, getSectionFeedback } = useSectionApproval();
  
  // Format section feedback for the change request form
  const formattedSectionFeedback = React.useMemo(() => {
    const feedbackItems = getSectionFeedback();
    if (Object.keys(feedbackItems).length === 0) return '';
    
    let formattedText = '';
    
    Object.entries(feedbackItems).forEach(([section, feedback]) => {
      if (feedback && feedback.trim()) {
        // Format the section name to be more readable
        const readableSection = section
          .replace(/-/g, ' ')
          .replace(/\b\w/g, char => char.toUpperCase());
        
        formattedText += `\n\n== ${readableSection} ==\n${feedback}`;
      }
    });
    
    return formattedText.trim();
  }, [getSectionFeedback]);
  
  // Use our enhanced comment polling hook but disable automatic polling
  const { 
    comments, 
    isLoading: isLoadingComments, 
    refreshComments,
    newCommentsCount,
    newCommentIds
  } = useCommentPolling(
    spec.id,
    spec.comments || [],
    isActive && activeTab === 'comments',
    false,  // Disable automatic polling
    0       // No polling interval
  );

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await onAddComment();
      
      // Immediately refresh comments after successful submission
      setTimeout(() => {
        refreshComments();
      }, 500);
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (newComment.trim() && !isAddingComment) {
        handleSubmitComment();
      }
    }
  };
  
  // Show a notification when new comments arrive if we're not on the comments tab
  useEffect(() => {
    if (newCommentsCount > 0 && activeTab !== 'comments' && isActive) {
      toast({
        title: 'New comments',
        description: `${newCommentsCount} new comment${newCommentsCount > 1 ? 's' : ''} received`,
        variant: 'default',
      });
    }
  }, [newCommentsCount, activeTab, isActive, toast]);

  // Determine if we should show approval buttons based on status
  const shouldShowApprovalButtons = spec.status !== 'approved-by-customer';
  const specStatus = spec.status as SpecStatus;

  return (
    <div className="space-y-6">
      {/* First card: Approval instructions and actions */}
      <Card className="shadow-md border-green-100 border-2">
        <CardHeader className="bg-green-50 pb-2 border-b border-green-100">
          <CardTitle className="text-xl flex items-center">
            <CheckCircle className="mr-2 h-6 w-6 text-green-600" />
            Final Approval
          </CardTitle>
          <CardDescription className="text-base">
            Review the packing specification and provide your final decision
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          {spec.status === 'approved-by-customer' ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertTitle>Approved</AlertTitle>
              <AlertDescription>
                This packing specification has been approved and is now finalized.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert className="mb-6 bg-blue-50 border-blue-200">
                <InfoIcon className="h-5 w-5 text-blue-600" />
                <AlertTitle>How to approve or request changes</AlertTitle>
                <AlertDescription>
                  <ol className="list-decimal ml-5 mt-2 space-y-1 text-sm">
                    <li>Review all tabs in the specification (Honey Specification, Requirements, Packaging, etc.)</li>
                    <li>You can approve individual sections as you review them</li>
                    <li>{allSectionsApproved ? 
                      "All sections have been approved. You can now submit your final approval." : 
                      "Complete reviewing all sections before submitting final approval"}</li>
                    <li>When approved, the specification will be used for production</li>
                  </ol>
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-wrap gap-3">
                {allSectionsApproved && (
                  <EnhancedApprovalDialog
                    specId={spec.id}
                    onStatusUpdated={onStatusUpdated || (() => {})}
                    type="approve"
                    buttonText="Submit Approval"
                    buttonClassName="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-base"
                    specStatus={specStatus}
                  />
                )}
                
                <EnhancedApprovalDialog
                  specId={spec.id}
                  onStatusUpdated={onStatusUpdated || (() => {})}
                  type="reject"
                  buttonText="Submit Changes"
                  buttonClassName="border-amber-300 text-amber-700 hover:bg-amber-50 px-6 py-3 text-base"
                  specStatus={specStatus}
                  prefilledFeedback={formattedSectionFeedback}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Second card: Comments section */}
      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2 bg-muted/30">
          <CardTitle className="text-lg flex items-center">
            <MessageSquare className="mr-2 h-5 w-5 text-primary/80" />
            Comments & Discussion
          </CardTitle>
          <CardDescription>
            Discuss this packing specification with the team
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-4">
          <Tabs defaultValue="comments" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="comments" className="relative">
                Comments
                {newCommentsCount > 0 && activeTab !== 'comments' && (
                  <Badge 
                    variant="outline" 
                    className="ml-2 bg-primary text-primary-foreground border-none absolute -top-1 -right-1 px-1.5 py-0 text-xs"
                  >
                    {newCommentsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="docs">Documentation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="comments" className="pt-4">
              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground mb-1">
                    You can use markdown to format your comments (e.g. **bold**, *italic*, ## heading)
                  </p>
                  <Textarea
                    placeholder="Add a comment to the discussion..."
                    value={newComment}
                    onChange={(e) => onNewCommentChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-grow min-h-[100px] font-mono text-sm"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isAddingComment}
                    className="flex items-center gap-2"
                  >
                    {isAddingComment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding Comment...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Add Comment
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="flex justify-end mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshComments}
                    disabled={isLoadingComments}
                    className="flex items-center gap-1 text-xs"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Click to refresh comments
                  </Button>
                </div>
                
                <CommentsList 
                  comments={comments} 
                  specId={spec.id}
                  isActive={isActive && activeTab === 'comments'}
                  isLoading={isLoadingComments}
                  onRefresh={refreshComments}
                  newCommentIds={newCommentIds}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="docs" className="pt-4">
              <div className="prose prose-sm max-w-none">
                <h3>Approval Process Documentation</h3>
                <p>
                  This section provides guidance on the approval process for packing specifications. 
                  Please review all sections of the document carefully before providing your final approval.
                </p>
                
                <h4>Key Points to Consider:</h4>
                <ul>
                  <li>Verify all product details including name, code, and version</li>
                  <li>Check that all regulatory requirements are listed correctly</li>
                  <li>Confirm that packaging specifications match your requirements</li>
                  <li>Review labeling details, including all required information</li>
                  <li>Ensure shipping specifications are appropriate for your needs</li>
                </ul>
                
                <h4>What Happens After Approval:</h4>
                <p>
                  Once approved, the packing specification will be finalized and used for production.
                  Any changes after approval will require a new version of the specification to be created.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinalApprovalTab;
