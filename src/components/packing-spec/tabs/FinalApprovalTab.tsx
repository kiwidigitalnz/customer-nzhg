
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, MessageSquare, PenLine, CheckSquare } from 'lucide-react';
import { useSectionApproval } from '@/contexts/SectionApprovalContext';
import EnhancedApprovalDialog from '@/components/approval/EnhancedApprovalDialog';
import CommentsList from '../CommentsList';
import { Textarea } from '@/components/ui/textarea';
import { CommentItem } from '@/services/podio/podioComments';
import ApprovalChecklist from '@/components/approval/ApprovalChecklist';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface FinalApprovalTabProps {
  spec: {
    id: number;
    comments?: CommentItem[];
  };
  isActive: boolean;
  newComment: string;
  onNewCommentChange: (comment: string) => void;
  onAddComment: () => Promise<void>;
  isAddingComment: boolean;
  onStatusUpdated: () => void;
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
  const { sectionStates, getSectionFeedback, allSectionsApproved, anySectionsWithChangesRequested } = useSectionApproval();
  const [checklistCompleted, setChecklistCompleted] = useState(false);
  
  // Get all sections that need changes
  const sectionsWithChanges = Object.entries(sectionStates)
    .filter(([_, state]) => state.status === 'changes-requested')
    .map(([section]) => section);
  
  // Get feedback from all sections
  const allFeedback = getSectionFeedback();
  
  return (
    <div className="space-y-6 animate-in fade-in-50">
      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2 bg-muted/30">
          <CardTitle className="text-lg flex items-center">
            {allSectionsApproved ? (
              <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
            ) : anySectionsWithChangesRequested ? (
              <AlertTriangle className="mr-2 h-5 w-5 text-amber-600" />
            ) : (
              <CheckSquare className="mr-2 h-5 w-5 text-primary/80" />
            )}
            {allSectionsApproved 
              ? "Final Approval" 
              : anySectionsWithChangesRequested 
                ? "Submit Change Requests" 
                : "Review Summary"}
          </CardTitle>
          <CardDescription>
            {allSectionsApproved 
              ? "All sections have been approved. Please provide your final approval." 
              : anySectionsWithChangesRequested 
                ? "Review your requested changes and submit them." 
                : "Please review all sections before proceeding."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Conditional UI based on approval state */}
            {anySectionsWithChangesRequested && (
              <div className="space-y-4">
                <Alert variant="warning" className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Changes Requested</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    You've requested changes to {sectionsWithChanges.length} {sectionsWithChanges.length === 1 ? 'section' : 'sections'}.
                    Please review your feedback below before submitting.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4 rounded-md border p-4">
                  <h3 className="font-medium">Your Feedback Summary</h3>
                  
                  {Object.entries(allFeedback).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(allFeedback).map(([section, feedback]) => (
                        <div key={section} className="space-y-1">
                          <h4 className="text-sm font-medium capitalize">{section.replace('-', ' ')}</h4>
                          <p className="text-sm bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{feedback}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No detailed feedback has been provided yet.
                    </p>
                  )}
                </div>
                
                <div className="flex justify-end">
                  <EnhancedApprovalDialog
                    specId={spec.id}
                    onStatusUpdated={onStatusUpdated}
                    type="reject"
                    buttonText="Submit Change Requests"
                    buttonClassName="bg-amber-600 hover:bg-amber-700 text-white"
                  />
                </div>
              </div>
            )}
            
            {allSectionsApproved && (
              <div className="space-y-4">
                <Alert variant="default" className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">All Sections Approved</AlertTitle>
                  <AlertDescription className="text-green-700">
                    You've approved all sections of this specification. Please provide your final approval.
                  </AlertDescription>
                </Alert>
                
                <ApprovalChecklist onComplete={setChecklistCompleted} />
                
                <div className="flex justify-end">
                  <EnhancedApprovalDialog
                    specId={spec.id}
                    onStatusUpdated={onStatusUpdated}
                    type="approve"
                    buttonText="Submit Final Approval"
                    buttonClassName="bg-green-600 hover:bg-green-700 text-white"
                    disabled={!checklistCompleted}
                  />
                </div>
              </div>
            )}
            
            {!allSectionsApproved && !anySectionsWithChangesRequested && (
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Review in Progress</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    Please review and approve all sections before submitting your final decision.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-1 sm:col-span-2 flex justify-end space-x-2">
                    <Button variant="outline" disabled className="opacity-50">
                      Not all sections have been reviewed
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <Separator className="my-6" />
            
            {/* Comments Section - Always visible */}
            <div className="space-y-4">
              <div className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-4 text-primary/80" />
                <h3 className="font-medium">Comments & Discussion</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground mb-1">
                    You can use markdown to format your comments (e.g. **bold**, *italic*, ## heading)
                  </p>
                  <Textarea
                    placeholder="Add a comment to the discussion..."
                    value={newComment}
                    onChange={(e) => onNewCommentChange(e.target.value)}
                    className="flex-grow min-h-[100px] font-mono text-sm"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={onAddComment}
                    disabled={!newComment.trim() || isAddingComment}
                    className="flex items-center gap-2"
                  >
                    <PenLine className="h-4 w-4" />
                    Add Comment
                  </Button>
                </div>
              </div>
              
              <CommentsList
                comments={spec.comments || []}
                specId={spec.id}
                isActive={isActive}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinalApprovalTab;
