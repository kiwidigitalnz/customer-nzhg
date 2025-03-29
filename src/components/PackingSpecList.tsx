
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { updatePackingSpecStatus } from '../services/podioApi';
import { Check, X, AlertCircle, Calendar, Package, Info, ExternalLink, Loader2, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

interface PackingSpec {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  details: {
    product: string;
    productCode?: string;
    umfMgo?: string;
    honeyType?: string;
    jarSize?: string;
    jarColour?: string;
    jarMaterial?: string;
    lidSize?: string;
    lidColour?: string;
    batchSize?: string;
    packagingType?: string;
    specialRequirements?: string;
    [key: string]: any; // Allow additional fields
  };
}

interface PackingSpecListProps {
  specs: PackingSpec[];
  onUpdate: () => void;
  readOnly?: boolean;
}

// Form schema for approval
const approvalFormSchema = z.object({
  approvedByName: z.string().min(2, { message: "Please enter your name" }),
  comments: z.string().optional()
});

// Form schema for rejection
const rejectionFormSchema = z.object({
  customerRequestedChanges: z.string().min(10, { message: "Please provide detailed feedback on why you're rejecting this specification" })
});

const PackingSpecList = ({ specs, onUpdate, readOnly = false }: PackingSpecListProps) => {
  const [selectedSpec, setSelectedSpec] = useState<PackingSpec | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Forms for approval and rejection
  const approvalForm = useForm<z.infer<typeof approvalFormSchema>>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: {
      approvedByName: '',
      comments: ''
    }
  });

  const rejectionForm = useForm<z.infer<typeof rejectionFormSchema>>({
    resolver: zodResolver(rejectionFormSchema),
    defaultValues: {
      customerRequestedChanges: ''
    }
  });
  
  if (specs.length === 0) {
    return (
      <div className="text-center py-12 bg-muted rounded-md">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No specifications found</h3>
        <p className="text-muted-foreground">There are no packing specifications in this category.</p>
      </div>
    );
  }

  const handleApprove = async (data: z.infer<typeof approvalFormSchema>) => {
    if (!selectedSpec) return;
    
    setIsSubmitting(true);
    
    try {
      // We'll send both the approval status and the name
      const comments = data.comments ? `Approved by ${data.approvedByName}. ${data.comments}` : `Approved by ${data.approvedByName}`;
      
      const success = await updatePackingSpecStatus(selectedSpec.id, 'approved', comments);
      
      if (success) {
        toast({
          title: "Specification approved successfully",
          description: "The packing specification has been marked as approved.",
          variant: 'default',
        });
        setSelectedSpec(null);
        approvalForm.reset();
        onUpdate();
      } else {
        toast({
          title: 'Error',
          description: "Failed to approve the specification. Please try again.",
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: "An unexpected error occurred. Please try again.",
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (data: z.infer<typeof rejectionFormSchema>) => {
    if (!selectedSpec) return;
    
    setIsSubmitting(true);
    
    try {
      const success = await updatePackingSpecStatus(selectedSpec.id, 'rejected', data.customerRequestedChanges);
      
      if (success) {
        toast({
          title: "Specification rejected",
          description: "Feedback has been sent to the team.",
          variant: 'default',
        });
        setSelectedSpec(null);
        rejectionForm.reset();
        onUpdate();
      } else {
        toast({
          title: 'Error',
          description: "Failed to reject the specification. Please try again.",
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: "An unexpected error occurred. Please try again.",
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Changes Requested</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPP');
    } catch (e) {
      return dateString;
    }
  };

  const handleViewDetails = (spec: PackingSpec) => {
    navigate(`/packing-spec/${spec.id}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {specs.map(spec => (
        <Card key={spec.id} className="flex flex-col hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{spec.title}</CardTitle>
              {getStatusBadge(spec.status)}
            </div>
            <CardDescription className="line-clamp-2">
              {spec.details.productCode && `${spec.details.productCode} • `}
              {spec.details.versionNumber && `Version ${spec.details.versionNumber}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="space-y-3">
              {spec.details.honeyType && (
                <div className="flex items-center text-sm">
                  <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium mr-2">Honey Type:</span> {spec.details.honeyType}
                </div>
              )}
              {spec.details.umfMgo && (
                <div className="flex items-center text-sm">
                  <Info className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium mr-2">UMF/MGO:</span> {spec.details.umfMgo}
                </div>
              )}
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium mr-2">Created:</span> {formatDate(spec.createdAt)}
              </div>
              
              {spec.comments && spec.comments.length > 0 && (
                <div className="flex items-center text-sm pt-1">
                  <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium mr-2">Comments:</span> {spec.comments.length}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex gap-2 pt-3">
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => handleViewDetails(spec)}
            >
              <ExternalLink className="mr-2 h-4 w-4" /> View Details
            </Button>
            
            {spec.status === 'pending' && !readOnly && (
              <Dialog onOpenChange={(open) => {
                if (open) setSelectedSpec(spec);
                else {
                  approvalForm.reset();
                  rejectionForm.reset();
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    variant="default" 
                    className="w-full"
                  >
                    Review
                  </Button>
                </DialogTrigger>
                {selectedSpec && (
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>{selectedSpec.title}</DialogTitle>
                      <DialogDescription>
                        {selectedSpec.details.productCode && `Product Code: ${selectedSpec.details.productCode}`}
                        {selectedSpec.description && (
                          <div className="mt-2">{selectedSpec.description}</div>
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                      <Tabs defaultValue="approve">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="approve">Approve</TabsTrigger>
                          <TabsTrigger value="reject">Request Changes</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="approve">
                          <div className="space-y-4 py-4">
                            <div className="text-sm rounded-md bg-muted p-4 space-y-2">
                              <h4 className="font-medium">Quick Review</h4>
                              
                              <div><span className="font-medium">Product:</span> {selectedSpec.details.product}</div>
                              
                              {selectedSpec.details.honeyType && (
                                <div><span className="font-medium">Honey Type:</span> {selectedSpec.details.honeyType}</div>
                              )}
                              
                              {selectedSpec.details.umfMgo && (
                                <div><span className="font-medium">UMF/MGO:</span> {selectedSpec.details.umfMgo}</div>
                              )}
                            </div>
                            
                            <Form {...approvalForm}>
                              <form onSubmit={approvalForm.handleSubmit(handleApprove)} className="space-y-4">
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
                                
                                <Button
                                  type="submit"
                                  disabled={isSubmitting}
                                  className="w-full"
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
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="reject">
                          <div className="space-y-4 py-4">
                            <div className="text-sm rounded-md bg-muted p-4 space-y-2">
                              <p>Please provide detailed feedback about what changes are needed.</p>
                            </div>
                            
                            <Form {...rejectionForm}>
                              <form onSubmit={rejectionForm.handleSubmit(handleReject)} className="space-y-4">
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
                                
                                <Button 
                                  type="submit"
                                  disabled={isSubmitting}
                                  variant="destructive"
                                  className="w-full"
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
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </DialogContent>
                )}
              </Dialog>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

// Add missing Tabs components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default PackingSpecList;
