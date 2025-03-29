
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
import { updatePackingSpecStatus } from '../services/podioApi';
import { Check, X, AlertCircle, Calendar, Package, Info } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

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

const PackingSpecList = ({ specs, onUpdate, readOnly = false }: PackingSpecListProps) => {
  const [selectedSpec, setSelectedSpec] = useState<PackingSpec | null>(null);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  if (specs.length === 0) {
    return (
      <div className="text-center py-12 bg-muted rounded-md">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No specifications found</h3>
        <p className="text-muted-foreground">There are no packing specifications in this category.</p>
      </div>
    );
  }

  const handleStatusUpdate = async (status: 'approved' | 'rejected') => {
    if (!selectedSpec) return;
    
    setIsSubmitting(true);
    
    try {
      const success = await updatePackingSpecStatus(selectedSpec.id, status, comments);
      
      if (success) {
        toast({
          title: `Specification ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
          variant: 'default',
        });
        setSelectedSpec(null);
        setComments('');
        onUpdate();
      } else {
        toast({
          title: 'Error',
          description: `Failed to ${status} the specification. Please try again.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `An unexpected error occurred. Please try again.`,
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
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {specs.map(spec => (
        <Card key={spec.id} className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{spec.title}</CardTitle>
              {getStatusBadge(spec.status)}
            </div>
            <CardDescription className="line-clamp-2">
              {spec.details.productCode && `${spec.details.productCode} - `}
              {spec.description}
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
            </div>
          </CardContent>
          <CardFooter>
            {spec.status === 'pending' && !readOnly ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setSelectedSpec(spec)}
                  >
                    View Details
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
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Product Details</h4>
                        <div className="text-sm rounded-md bg-muted p-4 space-y-2">
                          <div><span className="font-medium">Product:</span> {selectedSpec.details.product}</div>
                          
                          {selectedSpec.details.honeyType && (
                            <div><span className="font-medium">Honey Type:</span> {selectedSpec.details.honeyType}</div>
                          )}
                          
                          {selectedSpec.details.umfMgo && (
                            <div><span className="font-medium">UMF/MGO:</span> {selectedSpec.details.umfMgo}</div>
                          )}
                          
                          <Separator className="my-2" />
                          
                          <h5 className="font-medium">Packaging</h5>
                          
                          {selectedSpec.details.jarSize && (
                            <div><span className="font-medium">Jar Size:</span> {selectedSpec.details.jarSize}</div>
                          )}
                          
                          {selectedSpec.details.jarColour && (
                            <div><span className="font-medium">Jar Color:</span> {selectedSpec.details.jarColour}</div>
                          )}
                          
                          {selectedSpec.details.jarMaterial && (
                            <div><span className="font-medium">Jar Material:</span> {selectedSpec.details.jarMaterial}</div>
                          )}
                          
                          {selectedSpec.details.lidSize && (
                            <div><span className="font-medium">Lid Size:</span> {selectedSpec.details.lidSize}</div>
                          )}
                          
                          {selectedSpec.details.lidColour && (
                            <div><span className="font-medium">Lid Color:</span> {selectedSpec.details.lidColour}</div>
                          )}
                          
                          {selectedSpec.details.specialRequirements && (
                            <>
                              <Separator className="my-2" />
                              <div>
                                <span className="font-medium">Special Requirements:</span>
                                <p className="mt-1">{selectedSpec.details.specialRequirements}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Comments (optional)</h4>
                        <Textarea
                          placeholder="Add any comments or notes here..."
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        variant="destructive"
                        disabled={isSubmitting}
                        onClick={() => handleStatusUpdate('rejected')}
                      >
                        {isSubmitting ? 'Submitting...' : (
                          <>
                            <X className="mr-2 h-4 w-4" /> Reject
                          </>
                        )}
                      </Button>
                      <Button
                        disabled={isSubmitting}
                        onClick={() => handleStatusUpdate('approved')}
                      >
                        {isSubmitting ? 'Submitting...' : (
                          <>
                            <Check className="mr-2 h-4 w-4" /> Approve
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                )}
              </Dialog>
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setSelectedSpec(spec)}
                  >
                    View Details
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
                    <div className="space-y-4 py-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Status:</span>
                        {getStatusBadge(selectedSpec.status)}
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Product Details</h4>
                        <div className="text-sm rounded-md bg-muted p-4 space-y-2">
                          <div><span className="font-medium">Product:</span> {selectedSpec.details.product}</div>
                          
                          {selectedSpec.details.honeyType && (
                            <div><span className="font-medium">Honey Type:</span> {selectedSpec.details.honeyType}</div>
                          )}
                          
                          {selectedSpec.details.umfMgo && (
                            <div><span className="font-medium">UMF/MGO:</span> {selectedSpec.details.umfMgo}</div>
                          )}
                          
                          <Separator className="my-2" />
                          
                          <h5 className="font-medium">Packaging</h5>
                          
                          {selectedSpec.details.jarSize && (
                            <div><span className="font-medium">Jar Size:</span> {selectedSpec.details.jarSize}</div>
                          )}
                          
                          {selectedSpec.details.jarColour && (
                            <div><span className="font-medium">Jar Color:</span> {selectedSpec.details.jarColour}</div>
                          )}
                          
                          {selectedSpec.details.jarMaterial && (
                            <div><span className="font-medium">Jar Material:</span> {selectedSpec.details.jarMaterial}</div>
                          )}
                          
                          {selectedSpec.details.lidSize && (
                            <div><span className="font-medium">Lid Size:</span> {selectedSpec.details.lidSize}</div>
                          )}
                          
                          {selectedSpec.details.lidColour && (
                            <div><span className="font-medium">Lid Color:</span> {selectedSpec.details.lidColour}</div>
                          )}
                          
                          {selectedSpec.details.specialRequirements && (
                            <>
                              <Separator className="my-2" />
                              <div>
                                <span className="font-medium">Special Requirements:</span>
                                <p className="mt-1">{selectedSpec.details.specialRequirements}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedSpec(null)}
                      >
                        Close
                      </Button>
                    </DialogFooter>
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

export default PackingSpecList;
