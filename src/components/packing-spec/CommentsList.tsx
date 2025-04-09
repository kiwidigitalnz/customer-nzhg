
import React from 'react';
import { formatDate } from '@/utils/formatters';
import { MessageSquare, Clock, User, RefreshCcw, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CommentItem } from '@/services/podio/podioComments';

interface CommentsListProps {
  comments: CommentItem[];
  specId?: number;
  isActive?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const CommentsList: React.FC<CommentsListProps> = ({ 
  comments, 
  specId, 
  isActive = true,
  isLoading = false,
  onRefresh
}) => {
  const { user } = useAuth();
  
  console.log('CommentsList rendered with:', { 
    specId, 
    isActive, 
    commentsCount: comments?.length || 0,
    isLoading
  });
  
  const formatNZTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'h:mm a');
    } catch (err) {
      console.error('Error formatting time:', err);
      return '';
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <LoadingSpinner size="sm" text="Loading comments..." />
      </div>
    );
  }
  
  if (!comments || comments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No comments yet</p>
        {onRefresh && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-4" 
            onClick={onRefresh}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Check for comments
          </Button>
        )}
      </div>
    );
  }
  
  // Sort comments by creation date (newest first)
  const sortedComments = [...comments].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  console.log('Sorted comments:', sortedComments.map(c => ({ id: c.id, text: c.text.substring(0, 20) })));
  
  const companyName = user?.name || "Unknown Company";
  const authUsername = user?.username || null;
  
  return (
    <div className="space-y-4">
      {sortedComments.map(comment => {
        const isCurrentUserComment = 
          comment.createdBy === authUsername || 
          comment.createdBy === "Customer Portal User" ||
          comment.createdBy.includes(authUsername || '');
        
        let displayName = comment.createdBy;
        let commentText = comment.text;
        
        // Try to extract company name from comment format [CompanyName] Message
        const companyMatch = comment.text.match(/^\[(.*?)\]\s(.*)/);
        if (companyMatch && companyMatch.length > 2) {
          if (!isCurrentUserComment) {
            displayName = companyMatch[1];
          }
          commentText = companyMatch[2];
        }
        
        if (isCurrentUserComment) {
          displayName = companyName;
        }
        
        const commentDate = new Date(comment.createdAt);
        const timeString = formatNZTime(comment.createdAt);
        
        return (
          <div 
            key={comment.id} 
            className="bg-card rounded-md p-4 border"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="font-medium text-sm">{displayName}</p>
              </div>
              <div className="flex flex-col items-end text-xs">
                <div className="text-muted-foreground">
                  {formatDate(comment.createdAt)}
                </div>
                <div className="text-muted-foreground/60 mt-0.5">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {timeString}
                </div>
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
