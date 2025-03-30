
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
import { AlertCircle } from 'lucide-react';
import { addCommentToPackingSpec } from '@/services/podioApi';
import { SpecStatus } from '../packing-spec/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSignatureCapture = (dataUrl: string) => {
    setSignature(dataUrl);
  };

  const resetForm = () => {
    setName('');
    setNotes('');
    setSignature(null);
    setChecklistCompleted(false);
    setError(null);
  };

  const handleSubmit = async () => {
    // Reset any previous errors
    setError(null);
    
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
      console.log(`Using Category ID: ${type === 'approve' ? 
        PODIO_CATEGORIES.APPROVAL_STATUS.APPROVED_BY_CUSTOMER.id : 
        PODIO_CATEGORIES.APPROVAL_STATUS.CHANGES_REQUESTED.id}`);
      
      // Update the status with the correct Podio status values
      const success = await updatePackingSpecStatus(
        specId,
        type === 'approve' ? 'approved-by-customer' : 'changes-requested',
        notes,
        type === 'approve' ? { approvedByName: name, signature } : undefined
      );

      if (success) {
        toast({
          title: type === 'approve' ? "Specification Approved" : "Changes Requested",
          description: type === 'approve' 
            ? "You have successfully approved this specification." 
            : "Your change request has been submitted.",
        });

        // First call onStatusUpdated to refresh the parent component
        onStatusUpdated();
        
        // Then close the dialog and reset form with a slight delay to avoid state conflicts
        setTimeout(() => {
          setOpen(false);
          resetForm();
        }, 100);
      } else {
        throw new Error(`Failed to ${type === 'approve' ? 'approve' : 'request changes for'} specification`);
      }
    } catch (error) {
      console.error(`Error ${type === 'approve' ? 'approving' : 'rejecting'} specification:`, error);
      
      // Set a more user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : `Failed to ${type === 'approve' ? 'approve' : 'request changes for'} this specification.`;
      
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setOpen(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!loading) {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }
    }}>
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

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="flex justify-center py-4">
            <LoadingSpinner 
              size="sm" 
              text={type === 'approve' ? 'Processing approval...' : 'Submitting changes...'}
            />
          </div>
        )}

        {!loading && (
          <>
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
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || (type === 'approve' && (!checklistCompleted || !name || !signature)) || (type === 'reject' && !notes)}
            className={type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}
          >
            {loading ? (
              type === 'approve' ? 'Approving...' : 'Submitting...'
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
