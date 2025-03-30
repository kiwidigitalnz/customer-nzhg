
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPackingSpecDetails, updatePackingSpecStatus, addCommentToPackingSpec, getCommentsFromPodio } from '../services/podioApi';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatDate, formatTextContent, hasValue } from '@/utils/formatters';

// UI Components
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from '@/components/ui/card';
import { 
  Accordion, AccordionContent, AccordionItem, AccordionTrigger 
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Custom Components
import SignaturePad from './SignaturePad';
import StatusBadge from './packing-spec/StatusBadge';
import SpecSection from './packing-spec/SpecSection';
import ImagePreview from './packing-spec/ImagePreview';
import CommentsList from './packing-spec/CommentsList';
import CategoryDisplay from './packing-spec/CategoryDisplay';
import { CountryFlagsList } from './packing-spec/CountryFlag';

// Icons
import { 
  ArrowLeft, Check, X, Loader2, Calendar, Package, FileText, 
  Info, ShieldCheck, Factory, Box, AlertCircle, Award, 
  MessageSquare, Send, ChevronDown, ChevronUp, Clock,
  ExternalLink, Pen, Save, ImageIcon, LinkIcon, ThumbsUp, Truck, 
  Clipboard, Book, Globe
} from 'lucide-react';

// Types
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

// Form Schemas
const approvalFormSchema = z.object({
  approvedByName: z.string().min(2, { message: "Please enter your name" }),
  comments: z.string().optional(),
  signature: z.string().min(1, { message: "Signature is required" }),
});

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
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const navigate = useNavigate();

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

  // Fetch spec details
  useEffect(() => {
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

  // Handlers
  const handleGoBack = () => {
    navigate('/dashboard');
  };

  const handleSignatureSave = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    approvalForm.setValue('signature', dataUrl);
  };

  const toggleAccordionItem = (value: string) => {
    setActiveAccordionItems(prev => 
      prev.includes(value) 
        ? prev.filter(item => item !== value) 
        : [...prev, value]
    );
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Render value based on field type
  const renderFieldValue = (value: any, fieldType?: string) => {
    if (value === undefined || value === null) return null;
    
    switch (fieldType) {
      case 'date':
        return formatDate(value);
      case 'html':
        return formatTextContent(value);
      case 'link':
        return (
          <a 
            href={value} 
            className="text-primary hover:underline flex items-center" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            {value} <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        );
      case 'category':
        return <CategoryDisplay categories={value} />;
      case 'country':
        return <CountryFlagsList countries={value} />;
      default:
        return typeof value === 'string' ? value : JSON.stringify(value);
    }
  };

  // Approval and rejection handlers
  const handleApprove = async (data: z.infer<typeof approvalFormSchema>) => {
    if (!spec) return;
    
    setIsSubmitting(true);
    
    try {
      const approvalData = {
        approvedByName: data.approvedByName,
        comments: data.comments || '',
        signature: data.signature,
        status: 'approve-specification'
      };
      
      const comments = data.comments ? `Approved by ${data.approvedByName}. ${data.comments}` : `Approved by ${data.approvedByName}`;
      
      const success = await updatePackingSpecStatus(
        spec.id, 
        'approved', 
        comments,
        approvalData
      );
      
      if (success) {
        toast({
          title: "Specification approved successfully",
          description: "The packing specification has been marked as approved.",
          variant: 'default',
        });
        
        setSpec(prev => prev ? {
          ...prev, 
          status: 'approved',
          details: {
            ...prev.details,
            approvedByName: data.approvedByName,
            approvalDate: new Date().toISOString(),
            signature: data.signature
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
      const rejectionData = {
        customerRequestedChanges: data.customerRequestedChanges,
        status: 'request-changes'
      };
      
      const success = await updatePackingSpecStatus(
        spec.id, 
        'rejected', 
        data.customerRequestedChanges,
        rejectionData
      );
      
      if (success) {
        toast({
          title: "Specification rejected",
          description: "Feedback has been sent to the team.",
          variant: 'default',
        });
        
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
      const success = await addCommentToPackingSpec(
        spec.id, 
        newComment, 
        user?.name || 'Anonymous User'
      );
      
      if (success) {
        toast({
          title: 'Comment added successfully',
          variant: 'default',
        });
        
        const newCommentItem: CommentItem = {
          id: Date.now(),
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
        
        setTimeout(async () => {
          try {
            const updatedComments = await getCommentsFromPodio(spec.id);
            if (updatedComments && updatedComments.length > 0) {
              setSpec(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  comments: updatedComments
                };
              });
            }
          } catch (error) {
            console.error('Error refreshing comments after adding a new one:', error);
          }
        }, 1000);
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

  // Loading state
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

  // Error state
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

  // Main rendering
  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="outline" onClick={handleGoBack} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-t-4 border-t-primary shadow-md">
            <CardHeader className="pb-3 bg-card/95">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div>
                  <CardTitle className="text-2xl">{spec.title}</CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
                    {spec.details.productCode && (
                      <span className="inline-flex items-center">
                        <FileText className="h-3.5 w-3.5 mr-1 text-muted-foreground" /> 
                        Code: {spec.details.productCode}
                      </span>
                    )}
                    {spec.details.versionNumber && (
                      <span className="inline-flex items-center">
                        <Book className="h-3.5 w-3.5 mr-1 text-muted-foreground" /> 
                        Version: {spec.details.versionNumber}
                      </span>
                    )}
                    {spec.details.dateReviewed && (
                      <span className="inline-flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" /> 
                        Updated: {formatDate(spec.details.dateReviewed)}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusBadge status={spec.status} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full" onValueChange={handleTabChange}>
                <TabsList className="mb-6 w-full flex overflow-x-auto justify-start p-1 bg-muted/70 rounded-md">
                  <TabsTrigger value="overview" className="flex items-center">
                    <Info className="mr-1.5 h-4 w-4" />
                    <span>Overview</span>
                  </TabsTrigger>
                  <TabsTrigger value="requirements" className="flex items-center">
                    <ShieldCheck className="mr-1.5 h-4 w-4" />
                    <span>Requirements</span>
                  </TabsTrigger>
                  <TabsTrigger value="packaging" className="flex items-center">
                    <Package className="mr-1.5 h-4 w-4" />
                    <span>Packaging</span>
                  </TabsTrigger>
                  <TabsTrigger value="label" className="flex items-center">
                    <FileText className="mr-1.5 h-4 w-4" />
                    <span>Labeling</span>
                  </TabsTrigger>
                  <TabsTrigger value="shipping" className="flex items-center">
                    <Truck className="mr-1.5 h-4 w-4" />
                    <span>Shipping</span>
                  </TabsTrigger>
                  <TabsTrigger value="approvals" className="flex items-center">
                    <Check className="mr-1.5 h-4 w-4" />
                    <span>Approvals</span>
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="flex items-center relative">
                    <MessageSquare className="mr-1.5 h-4 w-4" />
                    <span>Comments</span>
                    {spec.comments && spec.comments.length > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">{spec.comments.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6 animate-in fade-in-50">
                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-6">
                    <h3 className="font-medium flex items-center text-blue-800 mb-2">
                      <Info className="mr-2 h-4 w-4 text-blue-600" />
                      Product Summary
                    </h3>
                    <p className="text-blue-700 text-sm">{spec.description || "Detailed product specification for approval and implementation."}</p>
                  </div>
                  
                  <Card className="shadow-sm border-muted">
                    <CardHeader className="pb-2 bg-muted/30">
                      <CardTitle className="text-lg flex items-center">
                        <Package className="mr-2 h-5 w-5 text-primary/80" />
                        Product Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Product Name</h4>
                            <p className="font-medium">{spec.details.product || "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Product Code</h4>
                            <p className="font-medium">{spec.details.productCode || "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Version</h4>
                            <p className="font-medium">{spec.details.versionNumber || "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Honey Type</h4>
                            <p className="font-medium">{spec.details.honeyType || "N/A"}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">UMF/MGO</h4>
                            <p className="font-medium">{spec.details.umfMgo || "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Allergen Type</h4>
                            <div className="mt-1">
                              {spec.details.allergenType ? (
                                <CategoryDisplay 
                                  categories={spec.details.allergenType} 
                                  variant="outline"
                                  bgColor="bg-red-50"
                                />
                              ) : (
                                <span className="text-muted-foreground italic">N/A</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Ingredient Type</h4>
                            <div className="mt-1">
                              {spec.details.ingredientType ? (
                                <CategoryDisplay 
                                  categories={spec.details.ingredientType} 
                                  variant="outline"
                                  bgColor="bg-green-50"
                                />
                              ) : (
                                <span className="text-muted-foreground italic">N/A</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {spec.details.customerRequestedChanges && (
                    <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center text-amber-800">
                          <AlertCircle className="mr-2 h-5 w-5 text-amber-600" />
                          Requested Changes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="text-amber-800">{formatTextContent(spec.details.customerRequestedChanges)}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                {/* Requirements Tab */}
                <TabsContent value="requirements" className="space-y-6 animate-in fade-in-50">
                  <Card className="shadow-sm border-muted">
                    <CardHeader className="pb-2 bg-muted/30">
                      <CardTitle className="text-lg flex items-center">
                        <Clipboard className="mr-2 h-5 w-5 text-primary/80" />
                        Customer Requirements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">Customer Specifications</h4>
                          <div className="bg-muted/20 p-3 rounded-md">
                            {spec.details.customerRequirements ? (
                              <p>{formatTextContent(spec.details.customerRequirements)}</p>
                            ) : (
                              <p className="text-muted-foreground italic">No specific customer requirements provided</p>
                            )}
                          </div>
                        </div>
                        
                        <Separator className="my-5" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                              <Globe className="mr-1.5 h-4 w-4" />
                              Countries of Eligibility
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {spec.details.countryOfEligibility ? (
                                <CountryFlagsList 
                                  countries={spec.details.countryOfEligibility} 
                                  variant="outline"
                                  bgColor="bg-blue-50"
                                />
                              ) : (
                                <span className="text-muted-foreground italic">Not specified</span>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                              <Globe className="mr-1.5 h-4 w-4" />
                              Other Markets
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {spec.details.otherMarkets ? (
                                <CountryFlagsList 
                                  countries={spec.details.otherMarkets} 
                                  variant="outline"
                                  bgColor="bg-green-50"
                                />
                              ) : (
                                <span className="text-muted-foreground italic">Not specified</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <Separator className="my-5" />
                        
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                            <ShieldCheck className="mr-1.5 h-4 w-4" />
                            Testing Requirements
                          </h4>
                          <div className="bg-muted/20 p-3 rounded-md">
                            {spec.details.testingRequirements ? (
                              <div className="mt-1">
                                <CategoryDisplay 
                                  categories={spec.details.testingRequirements} 
                                  variant="secondary"
                                  bgColor="bg-violet-50"
                                />
                              </div>
                            ) : (
                              <p className="text-muted-foreground italic">No specific testing requirements provided</p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                            <ShieldCheck className="mr-1.5 h-4 w-4" />
                            Regulatory Requirements
                          </h4>
                          <div className="bg-muted/20 p-3 rounded-md">
                            {spec.details.regulatoryRequirements ? (
                              <div className="mt-1">
                                <CategoryDisplay 
                                  categories={spec.details.regulatoryRequirements} 
                                  variant="secondary"
                                  bgColor="bg-amber-50"
                                />
                              </div>
                            ) : (
                              <p className="text-muted-foreground italic">No specific regulatory requirements provided</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Packaging Tab */}
                <TabsContent value="packaging" className="space-y-6 animate-in fade-in-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="shadow-sm border-muted">
                      <CardHeader className="pb-2 bg-muted/30">
                        <CardTitle className="text-lg flex items-center">
                          <Package className="mr-2 h-5 w-5 text-primary/80" />
                          Jar Specifications
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Jar Size</h4>
                            <p className="font-medium">{spec.details.jarSize || "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Jar Color</h4>
                            <p className="font-medium">{spec.details.jarColour || "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Jar Material</h4>
                            <p className="font-medium">{spec.details.jarMaterial || "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Jar Shape</h4>
                            <p className="font-medium">{spec.details.jarShape || "N/A"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="shadow-sm border-muted">
                      <CardHeader className="pb-2 bg-muted/30">
                        <CardTitle className="text-lg flex items-center">
                          <Package className="mr-2 h-5 w-5 text-primary/80" />
                          Lid Specifications
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Lid Size</h4>
                            <p className="font-medium">{spec.details.lidSize || "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Lid Color</h4>
                            <p className="font-medium">{spec.details.lidColour || "N/A"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card className="shadow-sm border-muted">
                    <CardHeader className="pb-2 bg-muted/30">
                      <CardTitle className="text-lg flex items-center">
                        <Box className="mr-2 h-5 w-5 text-primary/80" />
                        Other Packaging
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">On-The-Go Packaging</h4>
                            <p className="font-medium">{spec.details.onTheGoPackaging || "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Pouch Size</h4>
                            <p className="font-medium">{spec.details.pouchSize || "N/A"}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Customised Carton Type</h4>
                            <p className="font-medium">{spec.details.customisedCartonType || "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Seal Instructions</h4>
                            <p>{spec.details.sealInstructions ? 
                              formatTextContent(spec.details.sealInstructions) : 
                              "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Label Tab */}
                <TabsContent value="label" className="space-y-6 animate-in fade-in-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="shadow-sm border-muted md:col-span-2">
                      <CardHeader className="pb-2 bg-muted/30">
                        <CardTitle className="text-lg flex items-center">
                          <FileText className="mr-2 h-5 w-5 text-primary/80" />
                          Label Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Code</h4>
                              <p className="font-medium">{spec.details.labelCode || "N/A"}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Link</h4>
                              {spec.details.labelLink ? (
                                <a 
                                  href={spec.details.labelLink} 
                                  className="text-primary hover:underline flex items-center" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  View Label Design <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              ) : (
                                <p className="text-muted-foreground italic">No link provided</p>
                              )}
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Specification</h4>
                              <p>{spec.details.labelSpecification ? 
                                formatTextContent(spec.details.labelSpecification) : 
                                "N/A"}
                              </p>
                            </div>
                          </div>
                          
                          {spec.details.label && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Preview</h4>
                              <div className="bg-white rounded-md border overflow-hidden">
                                <ImagePreview image={spec.details.label} alt="Label Preview" maxHeight="max-h-80" />
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="shadow-sm border-muted md:col-span-2">
                      <CardHeader className="pb-2 bg-muted/30">
                        <CardTitle className="text-lg flex items-center">
                          <Pen className="mr-2 h-5 w-5 text-primary/80" />
                          Printing Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">Printing Info Location</h4>
                              <p className="font-medium">{spec.details.printingInfoLocated || "N/A"}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">Printing Color</h4>
                              <p className="font-medium">{spec.details.printingColour || "N/A"}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">Required Best Before Date</h4>
                              <p className="font-medium">{spec.details.requiredBestBeforeDate || "N/A"}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground mb-1">Date Formatting</h4>
                              <p className="font-medium">{spec.details.dateFormatting || "N/A"}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Printing Info Required</h4>
                          <div className="bg-muted/20 p-3 rounded-md">
                            {spec.details.printingInfoRequired ? (
                              <p>{formatTextContent(spec.details.printingInfoRequired)}</p>
                            ) : (
                              <p className="text-muted-foreground italic">No specific printing requirements provided</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                {/* Shipping Tab */}
                <TabsContent value="shipping" className="space-y-6 animate-in fade-in-50">
                  <Card className="shadow-sm border-muted">
                    <CardHeader className="pb-2 bg-muted/30">
                      <CardTitle className="text-lg flex items-center">
                        <Box className="mr-2 h-5 w-5 text-primary/80" />
                        Shipper Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Shipper Size</h4>
                            <p className="font-medium">{spec.details.shipperSize || "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Shipper Sticker Count</h4>
                            <p className="font-medium">{spec.details.shipperStickerCount || "N/A"}</p>
                          </div>
                        </div>
                        
                        {spec.details.shipperSticker && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Shipper Sticker Preview</h4>
                            <div className="bg-white rounded-md border overflow-hidden">
                              <ImagePreview 
                                image={spec.details.shipperSticker} 
                                alt="Shipper Sticker" 
                                maxHeight="max-h-60" 
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm border-muted">
                    <CardHeader className="pb-2 bg-muted/30">
                      <CardTitle className="text-lg flex items-center">
                        <Truck className="mr-2 h-5 w-5 text-primary/80" />
                        Pallet Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Pallet Type</h4>
                            <p className="font-medium">{spec.details.palletType || "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Cartons Per Layer</h4>
                            <p className="font-medium">{spec.details.cartonsPerLayer || "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Number of Layers</h4>
                            <p className="font-medium">{spec.details.numberOfLayers || "N/A"}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Pallet Specifications</h4>
                            <p>{spec.details.palletSpecs ? 
                              formatTextContent(spec.details.palletSpecs) : 
                              "N/A"}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Pallet Documents</h4>
                            <p>{spec.details.palletDocuments ? 
                              formatTextContent(spec.details.palletDocuments) : 
                              "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Approvals Tab */}
                <TabsContent value="approvals" className="space-y-6 animate-in fade-in-50">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3 bg-muted/30">
                      <CardTitle className="text-lg flex items-center">
                        <ThumbsUp className="mr-2 h-5 w-5 text-primary/80" />
                        Approval Status
                      </CardTitle>
                      <CardDescription>
                        Current status and approval history
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
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
                        <div className="space-y-4 p-5 bg-green-50 rounded-md border border-green-200">
                          <h3 className="font-medium text-green-800 flex items-center">
                            <Check className="mr-2 h-4 w-4" />
                            Approval Details
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-green-700 mb-1">Approved By</h4>
                              <p className="font-medium">{spec.details.approvedByName || "N/A"}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-green-700 mb-1">Approval Date</h4>
                              <p className="font-medium">{spec.details.approvalDate ? formatDate(spec.details.approvalDate) : "N/A"}</p>
                            </div>
                          </div>
                          
                          {spec.details.signature && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-green-700 mb-2">Digital Signature</h4>
                              <div className="bg-white rounded-md p-3 border border-green-200 flex justify-center">
                                <img 
                                  src={typeof spec.details.signature === 'string' ? spec.details.signature : spec.details.signature.url} 
                                  alt="Digital Signature" 
                                  className="h-20 object-contain"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {spec.status === 'rejected' && (
                        <div className="space-y-4 p-5 bg-red-50 rounded-md border border-red-200">
                          <h3 className="font-medium text-red-800 flex items-center">
                            <X className="mr-2 h-4 w-4" />
                            Requested Changes
                          </h3>
                          <p className="text-red-800">{formatTextContent(spec.details.customerRequestedChanges)}</p>
                        </div>
                      )}
                      
                      {spec.status === 'pending' && (
                        <div className="space-y-6">
                          <div className="space-y-4 p-5 bg-amber-50 rounded-md border border-amber-200">
                            <h3 className="font-medium text-amber-800 flex items-center">
                              <AlertCircle className="mr-2 h-4 w-4" />
                              Awaiting Your Review
                            </h3>
                            <p className="text-amber-800">This specification is awaiting your review and approval.</p>
                          </div>
                          
                          <div className="grid gap-4 md:grid-cols-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="default" className="w-full bg-green-600 hover:bg-green-700 shadow-sm">
                                  <ThumbsUp className="mr-2 h-4 w-4" /> Approve Specification
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-md">
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
                                    
                                    <FormField
                                      control={approvalForm.control}
                                      name="signature"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Digital Signature</FormLabel>
                                          <FormControl>
                                            <div className="border rounded-md overflow-hidden">
                                              <SignaturePad 
                                                onSave={handleSignatureSave} 
                                                defaultName={approvalForm.getValues().approvedByName}
                                              />
                                            </div>
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
                                <Button variant="destructive" className="w-full shadow-sm">
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
                
                {/* Comments Tab */}
                <TabsContent value="comments" className="space-y-6 animate-in fade-in-50">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3 bg-muted/30">
                      <CardTitle className="text-lg flex items-center">
                        <MessageSquare className="mr-2 h-5 w-5 text-primary/80" />
                        Comments & Discussion
                      </CardTitle>
                      <CardDescription>
                        Discuss this specification with your team
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <CommentsList 
                        comments={spec.comments || []} 
                        specId={spec.id}
                        isActive={activeTab === 'comments'}
                      />
                      
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
          <Card className="border-t-4 border-t-primary shadow-md">
            <CardHeader className="pb-3 bg-muted/30">
              <CardTitle className="text-lg flex items-center">
                <Info className="mr-2 h-5 w-5 text-primary/80" />
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
                  <p className="text-red-700 mt-1">{formatTextContent(spec.details.customerRequestedChanges)}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="border shadow-md">
            <CardHeader className="pb-3 bg-muted/30">
              <CardTitle className="text-lg flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary/80" />
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
        </div>
      </div>
    </div>
  );
};

export default PackingSpecDetails;
