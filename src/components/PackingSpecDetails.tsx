
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPackingSpecDetails, updatePackingSpecStatus, addCommentToPackingSpec } from '../services/podioApi';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Check, 
  X, 
  Loader2, 
  Calendar, 
  Package, 
  FileText, 
  Info, 
  ShieldCheck, 
  Factory, 
  Box, 
  AlertCircle, 
  Award, 
  MessageSquare, 
  Send,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Pen,
  Save,
  ImageIcon,
  LinkIcon,
  ThumbsUp,
  Truck
} from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface PackingSpec {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  details: {
    [key: string]: any;
  };
  comments?: CommentItem[];
}

interface CommentItem {
  id: number;
  text: string;
  createdBy: string;
  createdAt: string;
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

const PackingSpecDetails = () => {
  const { id } = useParams<{ id: string }>();
  const specId = id ? parseInt(id) : 0;
  const { user } = useAuth();
  const [spec, setSpec] = useState<PackingSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Forms for approval and rejection
  const approvalForm = useForm<z.infer<typeof approvalFormSchema>>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: {
      approvedByName: user?.name || '',
      comments: ''
    }
  });

  const rejectionForm = useForm<z.infer<typeof rejectionFormSchema>>({
    resolver: zodResolver(rejectionFormSchema),
    defaultValues: {
      customerRequestedChanges: ''
    }
  });

  useEffect(() => {
    // Redirect to login if no user
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchSpecDetails = async () => {
      if (!specId) return;
      
      setLoading(true);
      try {
        const data = await getPackingSpecDetails(specId);
        
        if (!data) {
          setError('Packing specification not found');
          return;
        }
        
        // Verify this spec belongs to the logged in user
        // This check should also be done on the backend/API level
        if (data.details.customerId && data.details.customerId !== user.id) {
          setError('You do not have permission to view this specification');
          return;
        }
        
        setSpec(data);
      } catch (err) {
        console.error('Error fetching spec details:', err);
        setError('Failed to load specification details');
      } finally {
        setLoading(false);
      }
    };

    fetchSpecDetails();
  }, [specId, user, navigate]);

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    try {
      return format(new Date(dateString), 'PPP');
    } catch (e) {
      return dateString;
    }
  };

  const handleApprove = async (data: z.infer<typeof approvalFormSchema>) => {
    if (!spec) return;
    
    setIsSubmitting(true);
    
    try {
      // We'll send both the approval status and the name
      const comments = data.comments ? `Approved by ${data.approvedByName}. ${data.comments}` : `Approved by ${data.approvedByName}`;
      
      const success = await updatePackingSpecStatus(spec.id, 'approved', comments);
      
      if (success) {
        toast({
          title: "Specification approved successfully",
          description: "The packing specification has been marked as approved.",
          variant: 'default',
        });
        
        // Update local state to reflect the new status
        setSpec(prev => prev ? {
          ...prev, 
          status: 'approved',
          details: {
            ...prev.details,
            approvedByName: data.approvedByName,
            approvalDate: new Date().toISOString()
          }
        } : null);
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
    if (!spec) return;
    
    setIsSubmitting(true);
    
    try {
      const success = await updatePackingSpecStatus(spec.id, 'rejected', data.customerRequestedChanges);
      
      if (success) {
        toast({
          title: "Specification rejected",
          description: "Feedback has been sent to the team.",
          variant: 'default',
        });
        
        // Update local state to reflect the new status
        setSpec(prev => prev ? {
          ...prev, 
          status: 'rejected',
          details: {
            ...prev.details,
            customerRequestedChanges: data.customerRequestedChanges
          }
        } : null);
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

  const handleAddComment = async () => {
    if (!spec || !newComment.trim()) return;
    
    setIsAddingComment(true);
    
    try {
      const success = await addCommentToPackingSpec(spec.id, newComment);
      
      if (success) {
        toast({
          title: 'Comment added successfully',
          variant: 'default',
        });
        
        // Update local state with the new comment
        const newCommentItem: CommentItem = {
          id: Date.now(), // Temporary ID
          text: newComment,
          createdBy: user?.name || 'You',
          createdAt: new Date().toISOString()
        };
        
        setSpec(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            comments: [...(prev.comments || []), newCommentItem]
          };
        });
        
        setNewComment('');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add comment. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingComment(false);
    }
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending Approval</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return null;
    }
  };

  const toggleAccordionItem = (value: string) => {
    setActiveAccordionItems(prev => 
      prev.includes(value) 
        ? prev.filter(item => item !== value) 
        : [...prev, value]
    );
  };

  // Function to render attributes as a section
  const renderAttributeSection = (title: string, attributes: Array<{ key: string, label: string, fieldType?: string }>) => {
    // Skip sections where all values are empty
    const hasValues = attributes.some(attr => 
      spec?.details[attr.key] && spec.details[attr.key] !== ''
    );
    
    if (!hasValues) return null;
    
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-medium">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {attributes.map(({key, label, fieldType}) => {
            const value = spec?.details[key];
            if (!value) return null;

            // Special rendering for dates
            if (fieldType === 'date') {
              return (
                <div key={key} className="flex flex-col">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="font-medium">{formatDate(value)}</span>
                </div>
              );
            }
            
            // Default rendering
            return (
              <div key={key} className="flex flex-col">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading specification details...</p>
        </div>
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Button variant="outline" onClick={handleGoBack} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <Card className="mx-auto max-w-3xl bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="font-medium text-lg">Error Loading Specification</h3>
                <p className="text-muted-foreground">{error || 'Specification not found'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="outline" onClick={handleGoBack} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-t-4 border-t-primary">
            <CardHeader className="pb-3 bg-card/95">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div>
                  <CardTitle className="text-2xl">{spec.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {spec.details.productCode && `Product Code: ${spec.details.productCode}`}
                    {spec.details.versionNumber && ` • Version: ${spec.details.versionNumber}`}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(spec.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-4 w-full justify-start overflow-x-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="packaging">Packaging</TabsTrigger>
                  <TabsTrigger value="label">Labeling</TabsTrigger>
                  <TabsTrigger value="shipping">Shipping</TabsTrigger>
                  <TabsTrigger value="approvals">Approvals</TabsTrigger>
                  <TabsTrigger value="comments">
                    Comments
                    {spec.comments && spec.comments.length > 0 && (
                      <Badge className="ml-2 bg-primary text-primary-foreground">{spec.comments.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6">
                  <Accordion type="multiple" value={activeAccordionItems} className="border rounded-md">
                    <AccordionItem value="product-info" className="border-0 border-b">
                      <AccordionTrigger onClick={() => toggleAccordionItem('product-info')} className="py-4 px-6 hover:bg-muted/30">
                        <div className="flex items-center">
                          <Package className="mr-2 h-4 w-4" />
                          <span>Product Information</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4">
                        {renderAttributeSection('Product Details', [
                          { key: 'product', label: 'Product Name' },
                          { key: 'productCode', label: 'Product Code' },
                          { key: 'umfMgo', label: 'UMF/MGO' },
                          { key: 'honeyType', label: 'Honey Type' },
                          { key: 'allergenType', label: 'Allergen Type' },
                          { key: 'ingredientType', label: 'Ingredient Type' },
                          { key: 'versionNumber', label: 'Version Number' }
                        ])}
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="requirements" className="border-0 border-b">
                      <AccordionTrigger onClick={() => toggleAccordionItem('requirements')} className="py-4 px-6 hover:bg-muted/30">
                        <div className="flex items-center">
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          <span>Requirements</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4">
                        {renderAttributeSection('Market & Regulatory Requirements', [
                          { key: 'customerRequirements', label: 'Customer Requirements' },
                          { key: 'countryOfEligibility', label: 'Countries of Eligibility' },
                          { key: 'otherMarkets', label: 'Other Markets' },
                          { key: 'testingRequirements', label: 'Testing Requirements' },
                          { key: 'regulatoryRequirements', label: 'Regulatory Requirements' }
                        ])}
                      </AccordionContent>
                    </AccordionItem>
                    
                    {spec.details.customerRequestedChanges && (
                      <AccordionItem value="requested-changes" className="border-0">
                        <AccordionTrigger onClick={() => toggleAccordionItem('requested-changes')} className="py-4 px-6 hover:bg-muted/30">
                          <div className="flex items-center text-amber-600">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            <span>Requested Changes</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-4">
                          <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                            <p className="text-amber-800">{spec.details.customerRequestedChanges}</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </TabsContent>
                
                <TabsContent value="packaging" className="space-y-6">
                  <Accordion type="multiple" value={activeAccordionItems} className="border rounded-md">
                    <AccordionItem value="jar-specs" className="border-0 border-b">
                      <AccordionTrigger onClick={() => toggleAccordionItem('jar-specs')} className="py-4 px-6 hover:bg-muted/30">
                        <div className="flex items-center">
                          <Package className="mr-2 h-4 w-4" />
                          <span>Jar Specifications</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4">
                        {renderAttributeSection('Jar Specifications', [
                          { key: 'jarSize', label: 'Jar Size' },
                          { key: 'jarColour', label: 'Jar Color' },
                          { key: 'jarMaterial', label: 'Jar Material' },
                          { key: 'jarShape', label: 'Jar Shape' }
                        ])}
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="lid-specs" className="border-0 border-b">
                      <AccordionTrigger onClick={() => toggleAccordionItem('lid-specs')} className="py-4 px-6 hover:bg-muted/30">
                        <div className="flex items-center">
                          <Package className="mr-2 h-4 w-4" />
                          <span>Lid Specifications</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4">
                        {renderAttributeSection('Lid Specifications', [
                          { key: 'lidSize', label: 'Lid Size' },
                          { key: 'lidColour', label: 'Lid Color' }
                        ])}
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="other-packaging" className="border-0">
                      <AccordionTrigger onClick={() => toggleAccordionItem('other-packaging')} className="py-4 px-6 hover:bg-muted/30">
                        <div className="flex items-center">
                          <Box className="mr-2 h-4 w-4" />
                          <span>Other Packaging</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4">
                        {renderAttributeSection('Other Packaging', [
                          { key: 'onTheGoPackaging', label: 'On-The-Go Packaging' },
                          { key: 'pouchSize', label: 'Pouch Size' },
                          { key: 'sealInstructions', label: 'Seal Instructions' },
                          { key: 'customisedCartonType', label: 'Customised Carton Type' }
                        ])}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>
                
                <TabsContent value="label" className="space-y-6">
                  <Accordion type="multiple" value={activeAccordionItems} className="border rounded-md">
                    <AccordionItem value="label-info" className="border-0 border-b">
                      <AccordionTrigger onClick={() => toggleAccordionItem('label-info')} className="py-4 px-6 hover:bg-muted/30">
                        <div className="flex items-center">
                          <FileText className="mr-2 h-4 w-4" />
                          <span>Label Information</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4">
                        {renderAttributeSection('Label Information', [
                          { key: 'labelCode', label: 'Label Code' },
                          { key: 'labelSpecification', label: 'Label Specification' },
                          { key: 'labelLink', label: 'Label Link' }
                        ])}
                        
                        {spec.details.label && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Label Preview</h4>
                            <div className="bg-muted/20 rounded-md p-4 flex justify-center">
                              <div className="flex items-center justify-center h-40 w-40 bg-muted rounded-md">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              </div>
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="printing-info" className="border-0">
                      <AccordionTrigger onClick={() => toggleAccordionItem('printing-info')} className="py-4 px-6 hover:bg-muted/30">
                        <div className="flex items-center">
                          <Pen className="mr-2 h-4 w-4" />
                          <span>Printing Information</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4">
                        {renderAttributeSection('Printing Specifications', [
                          { key: 'printingInfoLocated', label: 'Printing Info Location' },
                          { key: 'printingColour', label: 'Printing Color' },
                          { key: 'printingInfoRequired', label: 'Printing Info Required' },
                          { key: 'requiredBestBeforeDate', label: 'Required Best Before Date' },
                          { key: 'dateFormatting', label: 'Date Formatting' }
                        ])}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>
                
                <TabsContent value="shipping" className="space-y-6">
                  <Accordion type="multiple" value={activeAccordionItems} className="border rounded-md">
                    <AccordionItem value="shipper-info" className="border-0 border-b">
                      <AccordionTrigger onClick={() => toggleAccordionItem('shipper-info')} className="py-4 px-6 hover:bg-muted/30">
                        <div className="flex items-center">
                          <Box className="mr-2 h-4 w-4" />
                          <span>Shipper Information</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4">
                        {renderAttributeSection('Shipper Information', [
                          { key: 'shipperSize', label: 'Shipper Size' },
                          { key: 'shipperStickerCount', label: 'Shipper Sticker Count' }
                        ])}
                        
                        {spec.details.shipperSticker && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Shipper Sticker Preview</h4>
                            <div className="bg-muted/20 rounded-md p-4 flex justify-center">
                              <div className="flex items-center justify-center h-40 w-60 bg-muted rounded-md">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              </div>
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="pallet-info" className="border-0">
                      <AccordionTrigger onClick={() => toggleAccordionItem('pallet-info')} className="py-4 px-6 hover:bg-muted/30">
                        <div className="flex items-center">
                          <Truck className="mr-2 h-4 w-4" />
                          <span>Pallet Information</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4">
                        {renderAttributeSection('Pallet Information', [
                          { key: 'palletType', label: 'Pallet Type' },
                          { key: 'cartonsPerLayer', label: 'Cartons Per Layer' },
                          { key: 'numberOfLayers', label: 'Number of Layers' },
                          { key: 'palletSpecs', label: 'Pallet Specifications' },
                          { key: 'palletDocuments', label: 'Pallet Documents' }
                        ])}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </TabsContent>
                
                <TabsContent value="approvals" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Approval Status</CardTitle>
                      <CardDescription>
                        Current status and approval history
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-3 p-4 bg-muted/20 rounded-md">
                        <div className={`rounded-full h-3 w-3 ${
                          spec.status === 'approved' 
                            ? 'bg-green-500' 
                            : spec.status === 'rejected' 
                              ? 'bg-red-500' 
                              : 'bg-amber-500'
                        }`}></div>
                        <span className="font-medium">{
                          spec.status === 'approved' 
                            ? 'Approved' 
                            : spec.status === 'rejected' 
                              ? 'Changes Requested' 
                              : 'Pending Approval'
                        }</span>
                      </div>
                      
                      {spec.status === 'approved' && (
                        <div className="space-y-4 p-4 bg-green-50 rounded-md border border-green-200">
                          {renderAttributeSection('Approval Details', [
                            { key: 'approvedByName', label: 'Approved By' },
                            { key: 'approvalDate', label: 'Approval Date', fieldType: 'date' },
                          ])}
                          
                          {spec.details.signature && (
                            <div className="mt-4">
                              <h4 className="font-medium mb-2 text-sm text-muted-foreground">Digital Signature</h4>
                              <div className="bg-white rounded-md p-2 border border-muted flex justify-center">
                                <div className="flex items-center justify-center h-20 w-60 bg-muted/10 rounded-md">
                                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {spec.status === 'rejected' && (
                        <div className="space-y-4 p-4 bg-red-50 rounded-md border border-red-200">
                          <h4 className="font-medium">Requested Changes</h4>
                          <p className="text-red-800">{spec.details.customerRequestedChanges}</p>
                        </div>
                      )}
                      
                      {spec.status === 'pending' && (
                        <div className="space-y-6">
                          <div className="space-y-4 p-4 bg-amber-50 rounded-md border border-amber-200">
                            <p className="text-amber-800">This specification is awaiting your review and approval.</p>
                          </div>
                          
                          <div className="grid gap-4 md:grid-cols-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="default" className="w-full bg-green-600 hover:bg-green-700">
                                  <ThumbsUp className="mr-2 h-4 w-4" /> Approve Specification
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Approve Packing Specification</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Please confirm you want to approve this packing specification.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                
                                <Form {...approvalForm}>
                                  <form onSubmit={approvalForm.handleSubmit(handleApprove)} className="space-y-4 py-4">
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
                                              className="min-h-[100px]"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <Button 
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        {isSubmitting ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                                            Processing...
                                          </>
                                        ) : (
                                          <>
                                            <Check className="mr-2 h-4 w-4" /> 
                                            Confirm Approval
                                          </>
                                        )}
                                      </Button>
                                    </AlertDialogFooter>
                                  </form>
                                </Form>
                              </AlertDialogContent>
                            </AlertDialog>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="w-full">
                                  <X className="mr-2 h-4 w-4" /> Request Changes
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Request Changes to Specification</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Please provide detailed feedback about what changes are needed.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                
                                <Form {...rejectionForm}>
                                  <form onSubmit={rejectionForm.handleSubmit(handleReject)} className="space-y-4 py-4">
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
                                    
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <Button 
                                        type="submit"
                                        disabled={isSubmitting}
                                        variant="destructive"
                                      >
                                        {isSubmitting ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                                            Processing...
                                          </>
                                        ) : (
                                          <>
                                            <Send className="mr-2 h-4 w-4" /> 
                                            Submit Feedback
                                          </>
                                        )}
                                      </Button>
                                    </AlertDialogFooter>
                                  </form>
                                </Form>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="comments" className="space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center">
                        <MessageSquare className="mr-2 h-5 w-5" />
                        Comments & Discussion
                      </CardTitle>
                      <CardDescription>
                        Discuss this specification with your team
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {spec.comments && spec.comments.length > 0 ? (
                        <div className="space-y-4">
                          {spec.comments.map(comment => (
                            <div key={comment.id} className="bg-card rounded-md p-4 border">
                              <div className="flex justify-between items-start">
                                <p className="font-medium text-sm">{comment.createdBy}</p>
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatDate(comment.createdAt)}
                                </div>
                              </div>
                              <p className="mt-2">{comment.text}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No comments yet</p>
                        </div>
                      )}
                      
                      <div className="pt-4">
                        <div className="flex items-start space-x-2">
                          <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="min-h-20 flex-1"
                          />
                          <Button 
                            onClick={handleAddComment}
                            disabled={isAddingComment || !newComment.trim()}
                            className="flex-shrink-0"
                            size="icon"
                          >
                            {isAddingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status card */}
          <Card className="border-t-4 border-t-primary shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Info className="mr-2 h-5 w-5" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-md">
                <div className={`rounded-full h-3 w-3 ${
                  spec.status === 'approved' 
                    ? 'bg-green-500' 
                    : spec.status === 'rejected' 
                      ? 'bg-red-500' 
                      : 'bg-amber-500'
                }`}></div>
                <span className="font-medium">{
                  spec.status === 'approved' 
                    ? 'Approved' 
                    : spec.status === 'rejected' 
                      ? 'Changes Requested' 
                      : 'Pending Approval'
                }</span>
              </div>
              
              {spec.status === 'approved' && spec.details.approvedByName && (
                <div className="text-sm bg-green-50 p-3 rounded-md">
                  <p className="font-medium text-green-800">Approved by: {spec.details.approvedByName}</p>
                  {spec.details.approvalDate && (
                    <p className="text-green-700">Date: {formatDate(spec.details.approvalDate)}</p>
                  )}
                </div>
              )}
              
              {spec.status === 'rejected' && spec.details.customerRequestedChanges && (
                <div className="text-sm bg-red-50 p-3 rounded-md">
                  <p className="font-medium text-red-800">Feedback:</p>
                  <p className="text-red-700 mt-1">{spec.details.customerRequestedChanges}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Details card */}
          <Card className="border shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <span className="text-sm text-muted-foreground">Created</span>
                  <p className="font-medium">{formatDate(spec.createdAt)}</p>
                </div>
              </div>
              
              {spec.details.dateReviewed && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-muted-foreground">Last Reviewed</span>
                    <p className="font-medium">{formatDate(spec.details.dateReviewed)}</p>
                  </div>
                </div>
              )}
              
              {spec.details.updatedBy && (
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-muted-foreground">Updated By</span>
                    <p className="font-medium">{spec.details.updatedBy}</p>
                  </div>
                </div>
              )}
              
              {spec.details.versionNumber && (
                <div className="flex items-start gap-2">
                  <Award className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-muted-foreground">Version</span>
                    <p className="font-medium">{spec.details.versionNumber}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Quick actions */}
          <Card className="bg-muted/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" /> 
                Export as PDF
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="mr-2 h-4 w-4" /> 
                Contact Support
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <ExternalLink className="mr-2 h-4 w-4" /> 
                View in Podio
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PackingSpecDetails;
