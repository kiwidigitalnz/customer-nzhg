
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Check, ThumbsUp, Clock } from 'lucide-react';
import { useSectionApproval, SectionName } from '@/contexts/SectionApprovalContext';
import { SpecStatus } from './StatusBadge';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Export the type for use in other components
export type SectionStatus = 'pending' | 'approved' | 'changes-requested';

interface SectionApprovalProps {
  sectionName: string;
  onApproveSection: (section: string) => Promise<void>;
  onRequestChanges: (section: string, comments: string) => Promise<void>;
  onNavigateToNextTab?: () => void;
  specStatus?: SpecStatus;
}

const SectionApproval: React.FC<SectionApprovalProps> = ({
  sectionName,
  onApproveSection,
  onRequestChanges,
  onNavigateToNextTab,
  specStatus = 'pending-approval'
}) => {
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const { sectionStates, updateSectionStatus } = useSectionApproval();
  
  const normalizedSectionName = sectionName.toLowerCase().replace(/\s+/g, '-') as SectionName;
  const sectionState = sectionStates[normalizedSectionName];
  const isApproved = sectionState?.status === 'approved';
  const hasChangesRequested = sectionState?.status === 'changes-requested';
  const isPending = !isApproved && !hasChangesRequested;
  
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
  
  // If the overall spec is already approved by customer, display a read-only status
  if (specStatus === 'approved-by-customer') {
    return (
      <div className="flex items-center space-x-2 text-green-600 mt-2">
        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 flex items-center gap-1">
          <Check className="h-3.5 w-3.5" />
          <span>Approved</span>
        </Badge>
      </div>
    );
  }
  
  // If the section is already approved locally, display a read-only approval status
  if (isApproved) {
    return (
      <div className="flex items-center space-x-2 mt-2">
        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 flex items-center gap-1 animate-in fade-in-50 slide-in-from-bottom-3">
          <Check className="h-3.5 w-3.5" />
          <span>Approved</span>
        </Badge>
        {sectionState?.approvedAt && (
          <span className="text-xs text-muted-foreground animate-in fade-in-50">
            {new Date(sectionState.approvedAt).toLocaleString()}
          </span>
        )}
      </div>
    );
  }
  
  // If changes are requested for this section, display a read-only changes-requested status
  if (hasChangesRequested) {
    return (
      <div className="flex items-center space-x-2 mt-2">
        <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 flex items-center gap-1 animate-in fade-in-50 slide-in-from-bottom-3">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Changes Requested</span>
        </Badge>
      </div>
    );
  }

  // If the section is pending, show pending status alongside approval buttons
  if (isPending && specStatus === 'pending-approval') {
    return (
      <div className="flex flex-col space-y-2 mt-2">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-600 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Pending Review</span>
          </Badge>
        </div>
        
        <div className="flex space-x-2 mt-2">
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
      </div>
    );
  }
  
  // Only show approval buttons if the spec is pending approval
  return null;
};

export default SectionApproval;
