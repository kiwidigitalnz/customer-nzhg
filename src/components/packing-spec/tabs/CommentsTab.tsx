
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Loader2, RefreshCcw } from 'lucide-react';
import CommentsList from '../CommentsList';
import { CommentItem } from '@/services/podio/podioComments';
import { getCommentsFromPodio } from '@/services/podioApi';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  const [comments, setComments] = useState<CommentItem[]>(spec.comments || []);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch comments when tab becomes active
  useEffect(() => {
    console.log(`Comments tab active state changed: ${isActive ? 'active' : 'inactive'} for spec ID: ${spec.id}`);
    
    if (isActive) {
      refreshComments();
    }
  }, [isActive, spec.id]);

  // Also refresh comments after a successful comment addition
  useEffect(() => {
    if (!isAddingComment && isActive && comments.length > 0) {
      // This will run after a comment is successfully added (isAddingComment transitions from true to false)
      const timer = setTimeout(() => {
        refreshComments();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isAddingComment, isActive]);

  const refreshComments = async () => {
    if (!spec.id) return;
    
    setIsLoadingComments(true);
    try {
      console.log(`Manually fetching comments for spec ID: ${spec.id}`);
      const fetchedComments = await getCommentsFromPodio(spec.id);
      
      if (fetchedComments && fetchedComments.length > 0) {
        console.log(`Retrieved ${fetchedComments.length} comments for spec ID: ${spec.id}`);
        setComments(fetchedComments);
      } else {
        console.log(`No comments found for spec ID: ${spec.id}`);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error loading comments',
        description: 'Failed to load comments. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingComments(false);
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
  
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      // Don't format the comment for display yet - we want the raw input 
      // from the user for the textarea
      await onAddComment();
      
      // After successful submission, refresh to get the updated comment list
      setTimeout(() => {
        refreshComments();
      }, 1000);
    } catch (error) {
      console.error('Error submitting comment:', error);
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
            
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshComments}
                disabled={isLoadingComments}
                className="flex items-center gap-1 text-xs"
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
