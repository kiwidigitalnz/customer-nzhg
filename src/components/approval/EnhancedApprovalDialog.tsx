import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import ResponsiveSignaturePad from './ResponsiveSignaturePad';
import ApprovalChecklist from './ApprovalChecklist';
import { updatePackingSpecStatus, PODIO_CATEGORIES } from '@/services/podioApi';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { addCommentToPackingSpec } from '@/services/podioApi';
import { SpecStatus } from '../packing-spec/StatusBadge';

interface EnhancedApprovalDialogProps {
  specId: number;
  onStatusUpdated: () => void;
  type: 'approve' | 'reject';
  buttonText: string;
  buttonClassName?: string;
}

const EnhancedApprovalDialog: React.FC<EnhancedApprovalDialogProps> = ({
  specId,
  onStatusUpdated,
  type,
  buttonText,
  buttonClassName = '',
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [checklistCompleted, setChecklistCompleted] = useState(false);
  const { toast } = useToast();

  const handleSignatureCapture = (dataUrl: string) => {
    setSignature(dataUrl);
  };

  const handleSubmit = async () => {
    if (type === 'approve' && (!name || !signature)) {
      toast({
        title: "Missing Information",
        description: "Please provide your name and signature to approve this specification.",
        variant: "destructive",
      });
      return;
    }

    if (type === 'reject' && !notes) {
      toast({
        title: "Comments Required",
        description: "Please provide comments explaining why you are requesting changes.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Add comment first if notes are provided
      if (notes) {
        await addCommentToPackingSpec(specId, notes);
      }

      // Log the status being updated
      console.log(`Updating status to: ${type === 'approve' ? 'approved-by-customer' : 'changes-requested'}`);
      
      // Update the status with the correct Podio status values
      await updatePackingSpecStatus(
        specId,
        type === 'approve' ? 'approved-by-customer' : 'changes-requested',
        notes,
        type === 'approve' ? { approvedByName: name, signature } : undefined
      );

      toast({
        title: type === 'approve' ? "Specification Approved" : "Changes Requested",
        description: type === 'approve' 
          ? "You have successfully approved this specification." 
          : "Your change request has been submitted.",
      });

      setOpen(false);
      onStatusUpdated();
    } catch (error) {
      console.error(`Error ${type === 'approve' ? 'approving' : 'rejecting'} specification:`, error);
      toast({
        title: "Error",
        description: `Failed to ${type === 'approve' ? 'approve' : 'request changes for'} this specification. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className={buttonClassName}
          variant={type === 'approve' ? 'default' : 'outline'}
        >
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === 'approve' ? 'Approve Specification' : 'Request Changes'}
          </DialogTitle>
          <DialogDescription>
            {type === 'approve' 
              ? 'Review and approve this packing specification.' 
              : 'Request changes to this packing specification.'}
          </DialogDescription>
        </DialogHeader>

        {type === 'approve' && (
          <ApprovalChecklist onComplete={setChecklistCompleted} />
        )}

        {type === 'approve' && checklistCompleted && (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Your Name
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="col-span-3"
                />
              </div>
              
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Your Signature
                </label>
                <ResponsiveSignaturePad onSigned={handleSignatureCapture} name={name} />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Additional Notes (Optional)
                </label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes or comments"
                  className="col-span-3"
                />
              </div>
            </div>
          </>
        )}

        {type === 'reject' && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Comments *
              </label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Please explain what changes are needed"
                className="col-span-3"
                required
              />
              <p className="text-xs text-gray-500">
                Please provide specific details about what needs to be changed.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || (type === 'approve' && (!checklistCompleted || !name || !signature)) || (type === 'reject' && !notes)}
            className={type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}
          >
            {loading ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                {type === 'approve' ? 'Approving...' : 'Submitting...'}
              </>
            ) : (
              type === 'approve' ? 'Approve Specification' : 'Submit Change Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedApprovalDialog;
