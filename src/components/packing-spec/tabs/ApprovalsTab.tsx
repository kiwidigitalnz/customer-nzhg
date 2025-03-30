
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import { formatDate, formatTextContent } from '@/utils/formatters';
import SignaturePad from '@/components/SignaturePad';

// Form Schemas
const approvalFormSchema = z.object({
  approvedByName: z.string().min(2, { message: "Please enter your name" }),
  comments: z.string().optional(),
  signature: z.string().min(1, { message: "Signature is required" }),
});

const rejectionFormSchema = z.object({
  customerRequestedChanges: z.string().min(10, { message: "Please provide detailed feedback on why you're rejecting this specification" })
});

interface ApprovalsTabProps {
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

const ApprovalsTab: React.FC<ApprovalsTabProps> = ({ 
  spec, 
  user, 
  onApprove, 
  onReject, 
  isSubmitting 
}) => {
  const [signatureDataUrl, setSignatureDataUrl] = React.useState<string>('');
  
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
  
  if (spec.status === 'approved') {
    return (
      <div className="space-y-6 animate-in fade-in-50">
        <Card className="shadow-sm border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-green-800">
              <Check className="mr-2 h-5 w-5 text-green-600" />
              Approved Specification
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Approved By</h4>
                  <p className="font-medium">{spec.details.approvedByName || user?.name || "Unknown"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Approval Date</h4>
                  <p className="font-medium">{spec.details.approvalDate ? formatDate(spec.details.approvalDate) : formatDate(new Date().toISOString())}</p>
                </div>
              </div>
              
              {spec.details.signature && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Signature</h4>
                  <div className="bg-white p-4 rounded-md border border-gray-200 max-w-sm">
                    <img 
                      src={spec.details.signature} 
                      alt="Approval Signature" 
                      className="max-h-24"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } 
  
  if (spec.status === 'rejected') {
    return (
      <div className="space-y-6 animate-in fade-in-50">
        <Card className="shadow-sm border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-amber-800">
              <AlertCircle className="mr-2 h-5 w-5 text-amber-600" />
              Changes Requested
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-amber-800 mb-4">The packing specification was rejected with the following feedback:</p>
            <div className="bg-white p-4 rounded-md border border-amber-200">
              <p className="whitespace-pre-line">{formatTextContent(spec.details.customerRequestedChanges || "No specific feedback provided.")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-8 animate-in fade-in-50">
      <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
        <h3 className="font-medium flex items-center text-blue-800 mb-2">
          <AlertCircle className="mr-2 h-4 w-4 text-blue-600" />
          Approval Required
        </h3>
        <p className="text-blue-700 text-sm">Please review the packing specification details and either approve or request changes.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-green-200 bg-green-50/10 hover:bg-green-50/30 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-green-800">
              <Check className="mr-2 h-5 w-5 text-green-600" />
              Approve Specification
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Form {...approvalForm}>
              <form onSubmit={approvalForm.handleSubmit(onApprove)} className="space-y-4">
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
                          placeholder="Add any comments or notes about your approval" 
                          className="min-h-[100px]" 
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
                
                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Approve Specification
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-amber-200 bg-amber-50/10 hover:bg-amber-50/30 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-amber-800">
              <AlertCircle className="mr-2 h-5 w-5 text-amber-600" />
              Request Changes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Form {...rejectionForm}>
              <form onSubmit={rejectionForm.handleSubmit(onReject)} className="space-y-4">
                <FormField
                  control={rejectionForm.control}
                  name="customerRequestedChanges"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feedback</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Please provide detailed information about what changes are needed before approval" 
                          className="min-h-[194px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  variant="outline"
                  className="w-full border-amber-400 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Request Changes
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApprovalsTab;
