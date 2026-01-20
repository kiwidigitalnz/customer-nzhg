
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, RefreshCcw } from 'lucide-react';
import CommentsList from '../CommentsList';
import { CommentItem } from '@/services/podio/podioComments';
import { getCommentsFromPodio } from '@/services/podioApi';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCommentPolling } from '@/hooks/useCommentPolling';
import { InlineSpinner } from '@/components/ui/loading-spinner';

interface CommentsTabProps {
  spec: {
    id: number;
    comments?: CommentItem[];
  };
  isActive: boolean;
  newComment: string;
  onNewCommentChange: (comment: string) => void;
  onAddComment: () => Promise<void>;
  isAddingComment: boolean;
}

const CommentsTab: React.FC<CommentsTabProps> = ({ 
  spec, 
  isActive, 
  newComment, 
  onNewCommentChange, 
  onAddComment, 
  isAddingComment 
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Use our enhanced comment polling hook
  const { 
    comments, 
    isLoading: isLoadingComments, 
    refreshComments,
    newCommentsCount
  } = useCommentPolling(
    spec.id,
    spec.comments || [],
    isActive,
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

  return (
    <div className="space-y-6 animate-in fade-in-50">
      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2 bg-muted/30">
          <CardTitle className="text-lg flex items-center">
            <MessageSquare className="mr-2 h-5 w-4 text-primary/80" />
            Comments & Discussion
          </CardTitle>
          <CardDescription>
            Discuss this packing specification with the team
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
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
                    <InlineSpinner className="h-4 w-4 mr-1" />
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
            
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground font-open">
                {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                {newCommentsCount > 0 && (
                  <span className="ml-2 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {newCommentsCount} new
                  </span>
                )}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshComments}
                disabled={isLoadingComments}
                className="flex items-center gap-1 text-xs font-open"
              >
                <RefreshCcw className={`h-3 w-3 ${isLoadingComments ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            <CommentsList 
              comments={comments} 
              specId={spec.id}
              isActive={isActive}
              isLoading={isLoadingComments}
              onRefresh={refreshComments}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommentsTab;
