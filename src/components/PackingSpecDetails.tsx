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
  Clipboard, Book, Globe, User, Tag, Hash, RefreshCw
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
  const [newCommentsCount, setNewCommentsCount] = useState<number>(0);

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

  // Format version to have only 1 decimal place
  const formatVersion = (version: string | undefined) => {
    if (!version) return "N/A";
    
    // Check if version is a number with decimals
    if (!isNaN(parseFloat(version))) {
      return parseFloat(version).toFixed(1);
    }
    
    return version;
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
                        Version: {formatVersion(spec.details.versionNumber)}
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
                  <StatusBadge status={spec.status} showIcon={false} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full" onValueChange={handleTabChange}>
                <TabsList className="mb-6 w-full flex overflow-x-auto justify-start p-1 bg-muted/70 rounded-md">
                  <TabsTrigger value="overview" className="flex items-center">
                    <Info className="mr-1.5 h-4 w-4" />
                    <span>Honey Specification</span>
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
                    {spec.comments && newCommentsCount > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">{newCommentsCount}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                {/* Honey Specification Tab (previously Overview Tab) */}
                <TabsContent value="overview" className="space-y-6 animate-in fade-in-50">
                  <Card className="shadow-sm border border-primary/10 bg-gradient-to-br from-primary/5 to-background rounded-lg overflow-hidden">
                    <CardHeader className="pb-2 bg-primary/10">
                      <CardTitle className="text-lg flex items-center">
                        <Package className="mr-2 h-5 w-5 text-primary" />
                        Honey Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Honey Type</h4>
                            <p className="font-medium">{spec.details.honeyType || "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">UMF/MGO</h4>
                            <p className="font-medium">{spec.details.umfMgo || "N/A"}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
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
                  <Card className="shadow-sm border border-primary/10 bg-gradient-to-br from-primary/5 to-background rounded-lg overflow-hidden">
                    <CardHeader className="pb-2 bg-primary/10">
                      <CardTitle className="text-lg flex items-center">
                        <Clipboard className="mr-2 h-5 w-5 text-primary" />
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
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm border border-primary/10 bg-gradient-to-br from-primary/5 to-background rounded-lg overflow-hidden">
                    <CardHeader className="pb-2 bg-primary/10">
                      <CardTitle className="text-lg flex items-center">
                        <Globe className="mr-2 h-5 w-5 text-primary" />
                        Country of Eligibility
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
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
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm border border-primary/10 bg-gradient-to-br from-primary/5 to-background rounded-lg overflow-hidden">
                    <CardHeader className="pb-2 bg-primary/10">
                      <CardTitle className="text-lg flex items-center">
                        <Globe className="mr-2 h-5 w-5 text-primary" />
                        Other Markets
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
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
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm border border-primary/10 bg-gradient-to-br from-primary/5 to-background rounded-lg overflow-hidden">
                    <CardHeader className="pb-2 bg-primary/10">
                      <CardTitle className="text-lg flex items-center">
                        <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
                        Testing Requirements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="mt-1">
                          {spec.details.testingRequirements ? (
                            <CategoryDisplay 
                              categories={spec.details.testingRequirements} 
                              variant="secondary"
                              bgColor="bg-violet-50"
                            />
                          ) : (
                            <p className="text-muted-foreground italic">No specific testing requirements provided</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm border border-primary/10 bg-gradient-to-br from-primary/5 to-background rounded-lg overflow-hidden">
                    <CardHeader className="pb-2 bg-primary/10">
                      <CardTitle className="text-lg flex items-center">
                        <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
                        Regulatory Requirements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="mt-1">
                          {spec.details.regulatoryRequirements ? (
                            <CategoryDisplay 
                              categories={spec.details.regulatoryRequirements} 
                              variant="secondary"
                              bgColor="bg-amber-50"
                            />
                          ) : (
                            <p className="text-muted-foreground italic">No specific regulatory requirements provided</p>
                          )}
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
                          <div className
