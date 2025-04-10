
import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export type SectionStatus = 'pending' | 'approved' | 'changes-requested';

interface SectionApprovalProps {
  sectionName: string;
  status: SectionStatus;
  onApprove: (section: string) => Promise<void>;
  onRequestChanges: (section: string, comments: string) => Promise<void>;
  className?: string;
}

const SectionApproval: React.FC<SectionApprovalProps> = ({
  sectionName,
  status,
  onApprove,
  onRequestChanges,
  className,
}) => {
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(sectionName);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRequestChanges = async () => {
    if (!comments.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onRequestChanges(sectionName, comments);
      setComments('');
      setChangeDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'approved') {
    return (
      <div className={`flex items-center text-green-700 ${className}`}>
        <CheckCircle2 className="mr-2 h-4 w-4" />
        <span className="text-sm">Approved</span>
      </div>
    );
  }
  
  if (status === 'changes-requested') {
    return (
      <div className={`flex items-center text-amber-700 ${className}`}>
        <AlertTriangle className="mr-2 h-4 w-4" />
        <span className="text-sm">Changes Requested</span>
      </div>
    );
  }
  
  return (
    <>
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <Button 
          size="sm" 
          variant="outline"
          className="text-green-700 border-green-200 hover:bg-green-50 hover:text-green-800"
          onClick={handleApprove}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3 w-3 mr-1" />
          )}
          Approve
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          className="text-amber-700 border-amber-200 hover:bg-amber-50 hover:text-amber-800"
          onClick={() => setChangeDialogOpen(true)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <AlertTriangle className="h-3 w-3 mr-1" />
          )}
          Request Changes
        </Button>
      </div>
      
      <Dialog open={changeDialogOpen} onOpenChange={setChangeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Changes for {sectionName}</DialogTitle>
            <DialogDescription>
              Please provide details about what changes are needed for this section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Please specify what changes are needed..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setChangeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRequestChanges}
              disabled={!comments.trim() || isSubmitting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SectionApproval;
