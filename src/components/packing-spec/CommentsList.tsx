
import React from 'react';
import { formatDate } from '@/utils/formatters';
import { MessageSquare, Clock } from 'lucide-react';

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
  
  return (
    <div className="space-y-4">
      {comments.map(comment => (
        <div key={comment.id} className="bg-card rounded-md p-4 border">
          <div className="flex justify-between items-start">
            <p className="font-medium text-sm">{comment.createdBy}</p>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {formatDate(comment.createdAt)}
            </div>
          </div>
          <p className="mt-2">{comment.text}</p>
        </div>
      ))}
    </div>
  );
};

export default CommentsList;
