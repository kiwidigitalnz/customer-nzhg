
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ResponsiveSignaturePad from './ResponsiveSignaturePad';
import ApprovalChecklist from './ApprovalChecklist';
import { useToast } from '@/components/ui/use-toast';

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

  const handleSignatureCapture = (dataUrl: string) => {
    setSignature(dataUrl);
    approvalForm.setValue('signature', dataUrl);
  };

  const handleApproveSubmit = async (data: ApprovalFormData) => {
    try {
      await onApprove(data);
      onOpenChange(false);
      approvalForm.reset();
    } catch (error) {
      console.error('Error during approval:', error);
      toast({
        title: "Error",
        description: "Failed to process your approval. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRejectSubmit = async (data: RejectionFormData) => {
    try {
      await onReject(data);
      onOpenChange(false);
      rejectionForm.reset();
    } catch (error) {
      console.error('Error during rejection:', error);
      toast({
        title: "Error",
        description: "Failed to process your change request. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isSubmitting) {
        onOpenChange(open);
        if (!open) {
          approvalForm.reset();
          rejectionForm.reset();
          setSignature(null);
          setChecklistCompleted(false);
        }
      }
    }}>
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
                      onClick={() => onOpenChange(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !signature}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Approve"
                      )}
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
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Request Changes"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalSharedInterface;
