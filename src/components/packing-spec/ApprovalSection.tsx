
import React from 'react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import SignaturePad from '@/components/SignaturePad';
import { Loader2 } from 'lucide-react';

// Form Schemas
const approvalFormSchema = z.object({
  approvedByName: z.string().min(2, { message: "Please enter your name" }),
  comments: z.string().optional(),
  signature: z.string().min(1, { message: "Signature is required" }),
});

const rejectionFormSchema = z.object({
  customerRequestedChanges: z.string().min(10, { message: "Please provide detailed feedback" })
});

interface ApprovalSectionProps {
  spec: {
    id: number;
    status: 'pending' | 'approved' | 'rejected';
    details: Record<string, any>;
  };
  user: any;
  onApprove: (data: z.infer<typeof approvalFormSchema>) => Promise<void>;
  onReject: (data: z.infer<typeof rejectionFormSchema>) => Promise<void>;
  isSubmitting: boolean;
}

const ApprovalSection: React.FC<ApprovalSectionProps> = ({ 
  spec, 
  user, 
  onApprove, 
  onReject, 
  isSubmitting 
}) => {
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  
  // Form setup
  const approvalForm = useForm<z.infer<typeof approvalFormSchema>>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: {
      approvedByName: user?.name || '',
      comments: '',
      signature: '',
    }
  });

  const rejectionForm = useForm<z.infer<typeof rejectionFormSchema>>({
    resolver: zodResolver(rejectionFormSchema),
    defaultValues: {
      customerRequestedChanges: ''
    }
  });
  
  const handleSignatureSave = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    approvalForm.setValue('signature', dataUrl);
  };
  
  const handleApproveSubmit = async (data: z.infer<typeof approvalFormSchema>) => {
    await onApprove(data);
    setApproveDialogOpen(false);
  };
  
  const handleRejectSubmit = async (data: z.infer<typeof rejectionFormSchema>) => {
    await onReject(data);
    setRejectDialogOpen(false);
  };
  
  if (spec.status === 'approved') {
    return (
      <Card className="shadow-sm border-green-200 bg-green-50/50 mt-6">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center text-green-800 mb-2">
            <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
            <span className="font-medium">Approved</span>
          </div>
          <p className="text-green-700 text-sm">This specification has been approved for production.</p>
        </CardContent>
      </Card>
    );
  } 
  
  if (spec.status === 'rejected') {
    return (
      <Card className="shadow-sm border-amber-200 bg-amber-50/50 mt-6">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center text-amber-800 mb-2">
            <AlertTriangle className="mr-2 h-5 w-5 text-amber-600" />
            <span className="font-medium">Changes Requested</span>
          </div>
          <p className="text-amber-700 text-sm">Review requested changes in the Approvals tab.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card className="shadow-sm mt-6">
        <CardContent className="pt-4 pb-4">
          <h3 className="text-sm font-medium mb-3">Specification Approval</h3>
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <Button 
              onClick={() => setApproveDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
              disabled={isSubmitting}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setRejectDialogOpen(true)}
              className="border-amber-400 text-amber-700 hover:bg-amber-100 hover:text-amber-800 w-full sm:w-auto"
              disabled={isSubmitting}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Request Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Specification</DialogTitle>
            <DialogDescription>
              Approve this specification to indicate it meets all requirements.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...approvalForm}>
            <form onSubmit={approvalForm.handleSubmit(handleApproveSubmit)} className="space-y-4">
              <FormField
                control={approvalForm.control}
                name="approvedByName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
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
                    <FormLabel>Comments (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any comments about your approval" 
                        className="min-h-[80px]" 
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={approvalForm.control}
                name="signature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signature</FormLabel>
                    <FormControl>
                      <div className="mt-2">
                        <SignaturePad 
                          onSave={handleSignatureSave} 
                          initialData={signatureDataUrl}
                        />
                        <input type="hidden" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setApproveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : "Approve Specification"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
            <DialogDescription>
              Please explain what changes are needed before approval.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...rejectionForm}>
            <form onSubmit={rejectionForm.handleSubmit(handleRejectSubmit)} className="space-y-4">
              <FormField
                control={rejectionForm.control}
                name="customerRequestedChanges"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please provide detailed information about what changes are needed" 
                        className="min-h-[150px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setRejectDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="outline"
                  className="border-amber-400 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : "Request Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApprovalSection;
