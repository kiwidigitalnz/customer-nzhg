
import React, { useState } from 'react';
import { formatDate } from '@/utils/formatters';
import { MessageSquare, Clock, User, RefreshCcw, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCommentPolling } from '@/hooks/useCommentPolling';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: number;
  text: string;
  createdBy: string;
  createdAt: string;
}

interface CommentsListProps {
  comments: Comment[];
  specId?: number;
  isActive?: boolean;
}

const CommentsList: React.FC<CommentsListProps> = ({ 
  comments: initialComments, 
  specId, 
  isActive = true 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use our custom polling hook if we have a specId
  const {
    comments: polledComments,
    isLoading,
    error,
    refreshComments,
    lastPolled
  } = useCommentPolling(
    specId || 0,
    initialComments,
    isActive && !!specId
  );
  
  // Use polled comments if available, otherwise use passed in comments
  const comments = (specId && polledComments.length > 0) ? polledComments : initialComments;
  
  const handleRefresh = () => {
    refreshComments();
    toast({
      title: "Refreshing comments",
      description: "Checking for the latest comments from Podio...",
      duration: 2000
    });
  };
  
  if (!comments || comments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No comments yet</p>
        {specId && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-4" 
            onClick={handleRefresh} 
            disabled={isLoading}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Check for new comments
          </Button>
        )}
        
        {error && (
          <Alert variant="destructive" className="mt-4 mx-auto max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }
  
  // Sort comments by creation date (newest first)
  const sortedComments = [...comments].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Get current user's company name directly from auth context
  const companyName = user?.name || "Unknown Company";
  const authUsername = user?.username || null;
  
  return (
    <div className="space-y-4">
      {specId && (
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs text-muted-foreground">
            {isLoading ? 'Checking for new comments...' : `Last updated: ${formatDate(new Date(lastPolled).toISOString())}`}
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isLoading}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      )}
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {sortedComments.map(comment => {
        // Check if the comment was created by the current user
        const isCurrentUserComment = 
          comment.createdBy === authUsername || 
          comment.createdBy === "Customer Portal User" ||
          comment.createdBy.includes(authUsername || '');
        
        // Parse the comment text to extract the company name if it's in the format [CompanyName] Comment
        let displayName = comment.createdBy;
        let commentText = comment.text;
        
        // Check if the comment starts with [Company] format
        const companyMatch = comment.text.match(/^\[(.*?)\]\s(.*)/);
        if (companyMatch && companyMatch.length > 2) {
          // If it's not the current user's comment, use the company name from the comment
          if (!isCurrentUserComment) {
            displayName = companyMatch[1]; // Company name inside brackets
          }
          commentText = companyMatch[2]; // The rest of the comment after the company name
        }
        
        // For current user's comment, always use their company name from auth context
        if (isCurrentUserComment) {
          displayName = companyName;
        }
        
        return (
          <div key={comment.id} className="bg-card rounded-md p-4 border">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="font-medium text-sm">{displayName}</p>
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {formatDate(comment.createdAt)}
              </div>
            </div>
            <p className="mt-2 whitespace-pre-line break-words">{commentText}</p>
          </div>
        );
      })}
    </div>
  );
};

export default CommentsList;
