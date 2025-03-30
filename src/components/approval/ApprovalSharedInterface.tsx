
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ResponsiveSignaturePad from './ResponsiveSignaturePad';
import ApprovalChecklist from './ApprovalChecklist';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

// Form Schemas
export const approvalFormSchema = z.object({
  approvedByName: z.string().min(2, { message: "Please enter your name" }),
  comments: z.string().optional(),
  signature: z.string().min(1, { message: "Signature is required" })
});

export const rejectionFormSchema = z.object({
  customerRequestedChanges: z.string().min(10, { message: "Please provide detailed feedback on why changes are needed" })
});

export type ApprovalFormData = z.infer<typeof approvalFormSchema>;
export type RejectionFormData = z.infer<typeof rejectionFormSchema>;

interface ApprovalSharedInterfaceProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (data: ApprovalFormData) => Promise<void>;
  onReject: (data: RejectionFormData) => Promise<void>;
  title: string;
  description?: string;
  isSubmitting: boolean;
  defaultName?: string;
  itemPreview?: React.ReactNode;
}

const ApprovalSharedInterface: React.FC<ApprovalSharedInterfaceProps> = ({
  isOpen,
  onOpenChange,
  onApprove,
  onReject,
  title,
  description,
  isSubmitting,
  defaultName = '',
  itemPreview
}) => {
  const [activeTab, setActiveTab] = useState<'approve' | 'reject'>('approve');
  const [signature, setSignature] = useState<string | null>(null);
  const [checklistCompleted, setChecklistCompleted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<ApprovalFormData | RejectionFormData | null>(null);
  const [confirmationType, setConfirmationType] = useState<'approve' | 'reject'>('approve');
  const [internalDialogOpen, setInternalDialogOpen] = useState(isOpen);
  const { toast } = useToast();

  // Form setup
  const approvalForm = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: {
      approvedByName: defaultName,
      comments: '',
      signature: ''
    }
  });

  const rejectionForm = useForm<RejectionFormData>({
    resolver: zodResolver(rejectionFormSchema),
    defaultValues: {
      customerRequestedChanges: ''
    }
  });

  // Update internal state when prop changes
  React.useEffect(() => {
    setInternalDialogOpen(isOpen);
  }, [isOpen]);

  const handleSignatureCapture = (dataUrl: string) => {
    setSignature(dataUrl);
    approvalForm.setValue('signature', dataUrl);
  };

  const handleApproveSubmit = (data: ApprovalFormData) => {
    setConfirmationData(data);
    setConfirmationType('approve');
    setShowConfirmation(true);
  };

  const handleRejectSubmit = (data: RejectionFormData) => {
    setConfirmationData(data);
    setConfirmationType('reject');
    setShowConfirmation(true);
  };

  const handleConfirmAction = async () => {
    try {
      if (confirmationType === 'approve' && confirmationData) {
        await onApprove(confirmationData as ApprovalFormData);
      } else if (confirmationType === 'reject' && confirmationData) {
        await onReject(confirmationData as RejectionFormData);
      }
      
      // Close confirmation dialog first
      setShowConfirmation(false);
      
      // Use a timeout to ensure state updates are processed before closing the main dialog
      setTimeout(() => {
        // Close the main dialog
        setInternalDialogOpen(false);
        onOpenChange(false);
        
        // Reset forms after a delay to prevent state conflicts
        setTimeout(() => {
          approvalForm.reset();
          rejectionForm.reset();
          setSignature(null);
          setChecklistCompleted(false);
        }, 100);
      }, 300);
    } catch (error) {
      console.error(`Error during ${confirmationType}:`, error);
      toast({
        title: "Error",
        description: `Failed to process your ${confirmationType === 'approve' ? 'approval' : 'change request'}. Please try again.`,
        variant: "destructive"
      });
      setShowConfirmation(false);
    }
  };

  // Handle dialog open/close with proper state management
  const handleOpenChange = (open: boolean) => {
    if (isSubmitting) return; // Don't allow closing during submission
    
    setInternalDialogOpen(open);
    onOpenChange(open);
    
    // Reset forms when closing the dialog, but after a delay
    if (!open) {
      setTimeout(() => {
        approvalForm.reset();
        rejectionForm.reset();
        setSignature(null);
        setChecklistCompleted(false);
      }, 100);
    }
  };

  return (
    <>
      <Dialog open={internalDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          {itemPreview && (
            <div className="bg-muted rounded-md p-4 mb-4 text-sm">
              {itemPreview}
            </div>
          )}

          <Tabs 
            defaultValue="approve" 
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'approve' | 'reject')}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="approve">Approve</TabsTrigger>
              <TabsTrigger value="reject">Request Changes</TabsTrigger>
            </TabsList>

            <TabsContent value="approve">
              <ApprovalChecklist onComplete={setChecklistCompleted} />

              {checklistCompleted && (
                <Form {...approvalForm}>
                  <form onSubmit={approvalForm.handleSubmit(handleApproveSubmit)} className="space-y-4">
                    <FormField
                      control={approvalForm.control}
                      name="approvedByName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter your full name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={approvalForm.control}
                      name="signature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Signature</FormLabel>
                          <FormControl>
                            <div>
                              <ResponsiveSignaturePad 
                                onSigned={handleSignatureCapture} 
                                name={approvalForm.getValues('approvedByName') || defaultName} 
                              />
                              <input type="hidden" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={approvalForm.control}
                      name="comments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Comments (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Add any optional comments or notes..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !signature}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Submit for Approval
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              )}
            </TabsContent>

            <TabsContent value="reject">
              <Form {...rejectionForm}>
                <form onSubmit={rejectionForm.handleSubmit(handleRejectSubmit)} className="space-y-4">
                  <FormField
                    control={rejectionForm.control}
                    name="customerRequestedChanges"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Changes Requested</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Please describe in detail what changes are needed..."
                            className="min-h-[150px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenChange(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      Submit Request
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmationType === 'approve' ? 'Confirm Approval' : 'Confirm Change Request'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationType === 'approve' 
                ? 'Are you sure you want to approve this specification? This action cannot be undone.'
                : 'Are you sure you want to request changes to this specification?'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {confirmationType === 'reject' && (
            <div className="my-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">This will return the specification to our team for revisions.</p>
                <p className="mt-1">You'll be notified when the updated version is ready for review.</p>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              disabled={isSubmitting}
              className={confirmationType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                confirmationType === 'approve' ? 'Confirm Approval' : 'Confirm Request'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ApprovalSharedInterface;
