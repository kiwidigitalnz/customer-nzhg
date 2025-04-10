
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
import { updatePackingSpecStatus, uploadFileToPodio } from '@/services/podioApi';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { addCommentToPackingSpec } from '@/services/podioApi';
import { SpecStatus } from '../packing-spec/StatusBadge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useNavigate } from 'react-router-dom';

interface EnhancedApprovalDialogProps {
  specId: number;
  onStatusUpdated: () => void;
  type: 'approve' | 'reject';
  buttonText: string;
  buttonClassName?: string;
  disabled?: boolean;
  prefilledFeedback?: string;
}

const EnhancedApprovalDialog: React.FC<EnhancedApprovalDialogProps> = ({
  specId,
  onStatusUpdated,
  type,
  buttonText,
  buttonClassName = '',
  disabled = false,
  prefilledFeedback = ''
}) => {
  const [open, setOpen] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState(prefilledFeedback);
  const [signature, setSignature] = useState<string | null>(null);
  const [checklistCompleted, setChecklistCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignatureCapture = (dataUrl: string) => {
    setSignature(dataUrl);
  };

  const resetForm = () => {
    setName('');
    setNotes(prefilledFeedback);
    setSignature(null);
    setChecklistCompleted(false);
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async () => {
    setError(null);
    
    if (type === 'approve' && (!name || !signature)) {
      toast({
        title: "Missing Information",
        description: "Please provide your name and signature to approve this specification.",
        variant: "destructive",
      });
      return;
    }

    if (type === 'reject' && !name) {
      toast({
        title: "Name Required",
        description: "Please provide your name to submit change requests.",
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
      if (type === 'approve' && signature) {
        try {
          const res = await fetch(signature);
          const blob = await res.blob();
          
          const signatureFile = new File([blob], `signature-${specId}-${Date.now()}.png`, { type: 'image/png' });
          
          await uploadFileToPodio(specId, signatureFile);
          console.log('Signature uploaded successfully');
        } catch (uploadError) {
          console.error('Error uploading signature:', uploadError);
        }
      }

      const formattedNotes = `Submitted by: ${name}\n\n${notes}`;

      if (notes) {
        await addCommentToPackingSpec(specId, formattedNotes);
      }

      const statusValue = type === 'approve' ? 'approved-by-customer' : 'changes-requested';
      
      console.log(`Updating status to: ${statusValue}, with name: ${name}`);
      
      const success = await updatePackingSpecStatus(
        specId,
        statusValue,
        formattedNotes,
        name
      );

      if (success) {
        setSuccess(true);
        
        toast({
          title: type === 'approve' ? "Specification Approved" : "Changes Requested",
          description: type === 'approve' 
            ? "You have successfully approved this specification." 
            : "Your change request has been submitted.",
        });

        onStatusUpdated();
        
        // Don't close the dialog immediately, show success state first
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 3000);
      } else {
        throw new Error(`Failed to ${type === 'approve' ? 'approve' : 'request changes for'} specification`);
      }
    } catch (error) {
      console.error(`Error ${type === 'approve' ? 'approving' : 'rejecting'} specification:`, error);
      
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

  const handleOpenChange = (isOpen: boolean) => {
    if (loading) return;
    
    setInternalOpen(isOpen);
    setOpen(isOpen);
    
    if (!isOpen) {
      setTimeout(() => {
        resetForm();
      }, 100);
    }
  };

  React.useEffect(() => {
    setInternalOpen(open);
  }, [open]);

  React.useEffect(() => {
    if (!notes || notes === prefilledFeedback) {
      setNotes(prefilledFeedback);
    }
  }, [prefilledFeedback]);

  return (
    <Dialog open={internalOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          className={buttonClassName}
          variant={type === 'approve' ? 'default' : 'outline'}
          disabled={disabled}
        >
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="text-center py-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl mb-3">
              {type === 'approve' ? 'Specification Approved' : 'Changes Requested'}
            </DialogTitle>
            <DialogDescription className="text-md mb-6">
              {type === 'approve' 
                ? 'Thank you! Your approval has been submitted successfully.' 
                : 'Your requested changes have been submitted successfully.'}
            </DialogDescription>
            <p className="text-sm text-muted-foreground mb-6">
              You will be redirected to the dashboard in a moment...
            </p>
            <Button 
              onClick={() => navigate('/dashboard', { replace: true })}
              className="w-full"
            >
              Return to Dashboard Now
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {type === 'approve' ? 'Approve Specification' : 'Submit Change Requests'}
              </DialogTitle>
              <DialogDescription>
                {type === 'approve' 
                  ? 'Review and approve this packing specification.' 
                  : 'Submit your requested changes to this packing specification.'}
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

                <div className="grid gap-2 mt-4">
                  <label htmlFor="name" className="text-sm font-medium">
                    Your Name*
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full"
                    required
                  />
                </div>

                {type === 'approve' && checklistCompleted && (
                  <>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">
                          Your Signature*
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
                        Change Request Details*
                      </label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Please explain what changes are needed"
                        className="min-h-[200px]"
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
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading || 
                  (type === 'approve' && (!checklistCompleted || !name || !signature)) || 
                  (type === 'reject' && (!name || !notes))}
                className={type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}
              >
                {loading ? (
                  type === 'approve' ? 'Approving...' : 'Submitting...'
                ) : (
                  type === 'approve' ? 'Approve Specification' : 'Submit Change Request'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedApprovalDialog;
