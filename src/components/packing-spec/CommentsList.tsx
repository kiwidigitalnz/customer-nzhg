
import React from 'react';
import { formatDate } from '@/utils/formatters';
import { MessageSquare, Clock, User } from 'lucide-react';

interface Comment {
  id: number;
  text: string;
  createdBy: string;
  createdAt: string;
}

interface CommentsListProps {
  comments: Comment[];
}

const CommentsList: React.FC<CommentsListProps> = ({ comments }) => {
  if (!comments || comments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No comments yet</p>
      </div>
    );
  }
  
  // Sort comments by creation date (newest first)
  const sortedComments = [...comments].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Function to process comment text to handle embedded company names
  const processCommentText = (text: string): { companyName: string | null, content: string } => {
    // Look for pattern [CompanyName] at the beginning of comment
    const companyMatch = text.match(/^\[(.*?)\]\s(.*)/);
    
    if (companyMatch && companyMatch.length >= 3) {
      return {
        companyName: companyMatch[1],
        content: companyMatch[2]
      };
    }
    
    return { companyName: null, content: text };
  };
  
  return (
    <div className="space-y-4">
      {sortedComments.map(comment => {
        const { companyName, content } = processCommentText(comment.text);
        
        return (
          <div key={comment.id} className="bg-card rounded-md p-4 border">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="font-medium text-sm">
                  {companyName ? `${companyName} (${comment.createdBy})` : comment.createdBy}
                </p>
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {formatDate(comment.createdAt)}
              </div>
            </div>
            <p className="mt-2 whitespace-pre-line break-words">{content}</p>
          </div>
        );
      })}
    </div>
  );
};

export default CommentsList;
