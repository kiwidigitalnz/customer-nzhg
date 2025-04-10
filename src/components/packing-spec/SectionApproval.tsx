
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Check, ThumbsUp } from 'lucide-react';
import { useSectionApproval, SectionName } from '@/contexts/SectionApprovalContext';

interface SectionApprovalProps {
  sectionName: string;
  onApproveSection: (section: string) => Promise<void>;
  onRequestChanges: (section: string, comments: string) => Promise<void>;
  onNavigateToNextTab?: () => void;
}

const SectionApproval: React.FC<SectionApprovalProps> = ({
  sectionName,
  onApproveSection,
  onRequestChanges,
  onNavigateToNextTab,
}) => {
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const { sectionStates, updateSectionStatus } = useSectionApproval();
  
  const normalizedSectionName = sectionName.toLowerCase().replace(/\s+/g, '-') as SectionName;
  const sectionState = sectionStates[normalizedSectionName];
  const isApproved = sectionState?.status === 'approved';
  const hasChangesRequested = sectionState?.status === 'changes-requested';
  
  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApproveSection(sectionName);
      if (onNavigateToNextTab) {
        onNavigateToNextTab();
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRequestChanges = async () => {
    setIsSubmitting(true);
    try {
      await onRequestChanges(sectionName, comments);
      setOpen(false);
      setComments('');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isApproved) {
    return (
      <div className="flex items-center space-x-2 text-green-600 mt-2">
        <Check className="h-5 w-5" />
        <span className="text-sm font-medium">Approved</span>
      </div>
    );
  }
  
  if (hasChangesRequested) {
    return (
      <div className="flex items-center space-x-2 text-amber-600 mt-2">
        <AlertTriangle className="h-5 w-5" />
        <span className="text-sm font-medium">Changes Requested</span>
      </div>
    );
  }
  
  return (
    <div className="flex space-x-2 mt-4">
      {/* Request Changes button - Now positioned first */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="border-amber-200 hover:bg-amber-50" size="sm">
            Request Changes
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Changes to {sectionName}</DialogTitle>
            <DialogDescription>
              Please provide details about what changes are needed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Describe the changes needed..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="min-h-32"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleRequestChanges}
              className="bg-amber-600 hover:bg-amber-700"
              disabled={isSubmitting || !comments.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Change Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Approve button - Now positioned second */}
      <Button
        onClick={handleApprove}
        className="bg-green-600 hover:bg-green-700 text-white"
        size="sm"
        disabled={isSubmitting}
      >
        <ThumbsUp className="mr-1 h-4 w-4" />
        Approve {sectionName}
      </Button>
    </div>
  );
};

export default SectionApproval;
