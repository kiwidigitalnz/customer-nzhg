import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
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
import { ApprovalSharedInterface, approvalFormSchema, rejectionFormSchema } from './approval';
import StatusBadge, { SpecStatus } from './packing-spec/StatusBadge';

interface CommentItem {
  id: number;
  text: string;
  createdBy: string;
  createdAt: string;
}

interface PackingSpec {
  id: number;
  title: string;
  description: string;
  status: SpecStatus;
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
  comments?: CommentItem[]; // Add the comments property
}

interface PackingSpecListProps {
  specs: PackingSpec[];
  onUpdate: () => void;
  readOnly?: boolean;
}

const PackingSpecList = ({ specs, onUpdate, readOnly = false }: PackingSpecListProps) => {
  const [selectedSpec, setSelectedSpec] = useState<PackingSpec | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  
  const approvalForm = useForm<z.infer<typeof approvalFormSchema>>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: {
      approvedByName: '',
      comments: '',
      signature: ''
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
    setError(null);
    
    try {
      const comments = data.comments ? `Approved by ${data.approvedByName}. ${data.comments}` : `Approved by ${data.approvedByName}`;
      
      const success = await updatePackingSpecStatus(
        selectedSpec.id, 
        'approved-by-customer',
        comments
      );
      
      if (success) {
        toast({
          title: "Specification approved successfully",
          description: "The packing specification has been marked as approved.",
          variant: 'default',
        });
        
        setSelectedSpec(null);
        setApprovalDialogOpen(false);
        approvalForm.reset();
        onUpdate();
      } else {
        throw new Error(`Failed to approve the specification. Please try again.`);
      }
    } catch (error) {
      console.error(`Error approving specification:`, error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : `Failed to approve this specification.`;
      
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (data: z.infer<typeof rejectionFormSchema>) => {
    if (!selectedSpec) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const success = await updatePackingSpecStatus(
        selectedSpec.id, 
        'changes-requested',
        data.customerRequestedChanges
      );
      
      if (success) {
        toast({
          title: "Change request submitted",
          description: "Your feedback has been sent to the team.",
          variant: 'default',
        });
        
        setSelectedSpec(null);
        setApprovalDialogOpen(false);
        rejectionForm.reset();
        onUpdate();
      } else {
        throw new Error(`Failed to submit change request. Please try again.`);
      }
    } catch (error) {
      console.error(`Error submitting change request:`, error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : `Failed to submit change request.`;
      
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: SpecStatus) => {
    return <StatusBadge status={status} compact={true} showIcon={true} />;
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

  const handleOpenApproval = (spec: PackingSpec) => {
    setSelectedSpec(spec);
    setApprovalDialogOpen(true);
  };

  const getApprovalPreview = (spec: PackingSpec) => (
    <div className="text-sm">
      <p><strong>Product:</strong> {spec.details.product || 'N/A'}</p>
      <p><strong>Code:</strong> {spec.details.productCode || 'N/A'}</p>
      {spec.details.honeyType && <p><strong>Honey Type:</strong> {spec.details.honeyType}</p>}
      {spec.details.umfMgo && <p><strong>UMF/MGO:</strong> {spec.details.umfMgo}</p>}
      {spec.details.versionNumber && <p><strong>Version:</strong> {spec.details.versionNumber}</p>}
    </div>
  );

  return (
    <>
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
            </CardFooter>
          </Card>
        ))}
      </div>

      {selectedSpec && (
        <ApprovalSharedInterface
          isOpen={approvalDialogOpen}
          onOpenChange={setApprovalDialogOpen}
          onApprove={handleApprove}
          onReject={handleReject}
          title="Review Packing Specification"
          description="Please review all details carefully before approving or requesting changes."
          isSubmitting={isSubmitting}
          defaultName=""
          itemPreview={selectedSpec ? getApprovalPreview(selectedSpec) : undefined}
        />
      )}
    </>
  );
};

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default PackingSpecList;
