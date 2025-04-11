
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, MessageSquare, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import CommentsList from '../CommentsList';
import { useCommentPolling } from '@/hooks/useCommentPolling';
import { CommentItem } from '@/services/podio/podioComments';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import EnhancedApprovalDialog from '@/components/approval/EnhancedApprovalDialog';
import { SpecStatus } from '../StatusBadge';

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
  
  // Use our enhanced comment polling hook
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
    true,  // Enable automatic polling
    10000  // Poll every 10 seconds
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
      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
            Final Review & Approval
          </CardTitle>
          <CardDescription>
            Review all sections and provide feedback or approval
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Add approval buttons at the top of the card when appropriate */}
          {shouldShowApprovalButtons && (
            <div className="mb-6 flex flex-wrap gap-3">
              <EnhancedApprovalDialog
                specId={spec.id}
                onStatusUpdated={onStatusUpdated || (() => {})}
                type="approve"
                buttonText="Approve Specification"
                buttonClassName="bg-green-600 hover:bg-green-700"
                specStatus={specStatus}
              />
              
              <EnhancedApprovalDialog
                specId={spec.id}
                onStatusUpdated={onStatusUpdated || (() => {})}
                type="reject"
                buttonText="Request Changes"
                buttonClassName="border-amber-300 text-amber-700 hover:bg-amber-50"
                specStatus={specStatus}
              />
            </div>
          )}
          
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
