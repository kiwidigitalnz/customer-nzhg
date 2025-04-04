
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import CommentsList from '../CommentsList';

interface CommentsTabProps {
  spec: {
    id: number;
    comments?: Array<{
      id: number;
      text: string;
      createdBy: string;
      createdAt: string;
    }>;
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
            <div className="flex gap-3">
              <Textarea
                placeholder="Add a comment to the discussion..."
                value={newComment}
                onChange={(e) => onNewCommentChange(e.target.value)}
                className="flex-grow min-h-[100px]"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={onAddComment}
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
              comments={spec.comments || []} 
              specId={spec.id}
              isActive={isActive}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommentsTab;
