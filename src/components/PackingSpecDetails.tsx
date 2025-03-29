
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, Package, Info, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { getPackingSpecDetails, updatePackingSpecStatus } from '../services/podioApi';

const PackingSpecDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSpecDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const data = await getPackingSpecDetails(parseInt(id));
        setSpec(data);
      } catch (error) {
        console.error('Error fetching spec details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load packing specification details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSpecDetails();
  }, [id, toast]);

  const handleStatusUpdate = async (status: 'approved' | 'rejected') => {
    if (!spec || !id) return;
    
    setSubmitting(true);
    
    try {
      const success = await updatePackingSpecStatus(parseInt(id), status);
      
      if (success) {
        toast({
          title: `Specification ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
          variant: 'default',
        });
        
        // Update local state
        setSpec({ ...spec, status });
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
      setSubmitting(false);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <div className="text-center py-12 bg-muted rounded-md">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Specification Not Found</h3>
          <p className="text-muted-foreground">The packing specification you're looking for could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="outline" onClick={() => navigate('/dashboard')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{spec.title}</CardTitle>
              <CardDescription className="mt-1">
                {spec.details.productCode && `Product Code: ${spec.details.productCode}`}
              </CardDescription>
            </div>
            <div>
              {getStatusBadge(spec.status)}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center">
                <Package className="mr-2 h-5 w-5 text-primary" /> Product Information
              </h3>
              <div className="bg-muted p-4 rounded-md space-y-2">
                <div><span className="font-medium">Product:</span> {spec.details.product}</div>
                {spec.details.productCode && <div><span className="font-medium">Product Code:</span> {spec.details.productCode}</div>}
                {spec.details.honeyType && <div><span className="font-medium">Honey Type:</span> {spec.details.honeyType}</div>}
                {spec.details.umfMgo && <div><span className="font-medium">UMF/MGO:</span> {spec.details.umfMgo}</div>}
                {spec.details.allergenType && <div><span className="font-medium">Allergen Type:</span> {spec.details.allergenType}</div>}
                {spec.details.ingredientType && <div><span className="font-medium">Ingredient Type:</span> {spec.details.ingredientType}</div>}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center">
                <Info className="mr-2 h-5 w-5 text-primary" /> Packaging Details
              </h3>
              <div className="bg-muted p-4 rounded-md space-y-2">
                {spec.details.jarSize && <div><span className="font-medium">Jar Size:</span> {spec.details.jarSize}</div>}
                {spec.details.jarColour && <div><span className="font-medium">Jar Color:</span> {spec.details.jarColour}</div>}
                {spec.details.jarMaterial && <div><span className="font-medium">Jar Material:</span> {spec.details.jarMaterial}</div>}
                {spec.details.jarShape && <div><span className="font-medium">Jar Shape:</span> {spec.details.jarShape}</div>}
                {spec.details.lidSize && <div><span className="font-medium">Lid Size:</span> {spec.details.lidSize}</div>}
                {spec.details.lidColour && <div><span className="font-medium">Lid Color:</span> {spec.details.lidColour}</div>}
                {spec.details.onTheGoPackaging && <div><span className="font-medium">On-The-Go Packaging:</span> {spec.details.onTheGoPackaging}</div>}
                {spec.details.pouchSize && <div><span className="font-medium">Pouch Size:</span> {spec.details.pouchSize}</div>}
              </div>
            </div>
          </div>

          {(spec.details.countryOfEligibility || spec.details.otherMarkets || spec.details.testingRequirements || spec.details.regulatoryRequirements) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-medium flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-primary" /> Regulatory & Markets
                </h3>
                <div className="bg-muted p-4 rounded-md space-y-2">
                  {spec.details.countryOfEligibility && <div><span className="font-medium">Country of Eligibility:</span> {spec.details.countryOfEligibility}</div>}
                  {spec.details.otherMarkets && <div><span className="font-medium">Other Markets:</span> {spec.details.otherMarkets}</div>}
                  {spec.details.testingRequirements && <div><span className="font-medium">Testing Requirements:</span> {spec.details.testingRequirements}</div>}
                  {spec.details.regulatoryRequirements && <div><span className="font-medium">Regulatory Requirements:</span> {spec.details.regulatoryRequirements}</div>}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-2">
            <h3 className="text-lg font-medium flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-primary" /> Timeline & Status
            </h3>
            <div className="bg-muted p-4 rounded-md space-y-2">
              <div><span className="font-medium">Created:</span> {formatDate(spec.createdAt)}</div>
              {spec.details.dateReviewed && <div><span className="font-medium">Date Reviewed:</span> {formatDate(spec.details.dateReviewed)}</div>}
              {spec.details.approvalDate && <div><span className="font-medium">Approval Date:</span> {formatDate(spec.details.approvalDate)}</div>}
              {spec.details.approvedByName && <div><span className="font-medium">Approved By:</span> {spec.details.approvedByName}</div>}
              {spec.details.versionNumber && <div><span className="font-medium">Version Number:</span> {spec.details.versionNumber}</div>}
            </div>
          </div>

          {spec.details.customerRequirements && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Special Requirements</h3>
                <div className="bg-muted p-4 rounded-md">
                  <p>{spec.details.customerRequirements}</p>
                </div>
              </div>
            </>
          )}

          {/* Shipping Information */}
          {(spec.details.shipperSize || spec.details.shipperSticker || spec.details.customisedCartonType || 
            spec.details.palletType || spec.details.cartonsPerLayer || spec.details.numberOfLayers) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Shipping Information</h3>
                <div className="bg-muted p-4 rounded-md space-y-2">
                  {spec.details.shipperSize && <div><span className="font-medium">Shipper Size:</span> {spec.details.shipperSize}</div>}
                  {spec.details.shipperSticker && <div><span className="font-medium">Shipper Sticker:</span> Available</div>}
                  {spec.details.shipperStickerCount && <div><span className="font-medium">Number of Shipper Stickers:</span> {spec.details.shipperStickerCount}</div>}
                  {spec.details.customisedCartonType && <div><span className="font-medium">Customised Carton Type:</span> {spec.details.customisedCartonType}</div>}
                  {spec.details.palletType && <div><span className="font-medium">Pallet Type:</span> {spec.details.palletType}</div>}
                  {spec.details.cartonsPerLayer && <div><span className="font-medium">Cartons Per Layer:</span> {spec.details.cartonsPerLayer}</div>}
                  {spec.details.numberOfLayers && <div><span className="font-medium">Number of Layers:</span> {spec.details.numberOfLayers}</div>}
                  {spec.details.palletSpecs && <div><span className="font-medium">Pallet Specifications:</span> {spec.details.palletSpecs}</div>}
                  {spec.details.palletDocuments && <div><span className="font-medium">Pallet Documents:</span> {spec.details.palletDocuments}</div>}
                </div>
              </div>
            </>
          )}

          {/* Label Information */}
          {(spec.details.labelCode || spec.details.labelSpecification || spec.details.printingColour || 
            spec.details.printingInfoRequired || spec.details.requiredBestBeforeDate || spec.details.dateFormatting) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Label Information</h3>
                <div className="bg-muted p-4 rounded-md space-y-2">
                  {spec.details.labelCode && <div><span className="font-medium">Label Code:</span> {spec.details.labelCode}</div>}
                  {spec.details.labelSpecification && <div><span className="font-medium">Label Specification:</span> {spec.details.labelSpecification}</div>}
                  {spec.details.printingColour && <div><span className="font-medium">Printing Colour:</span> {spec.details.printingColour}</div>}
                  {spec.details.printingInfoLocated && <div><span className="font-medium">Printing Information Located:</span> {spec.details.printingInfoLocated}</div>}
                  {spec.details.printingInfoRequired && <div><span className="font-medium">Printing Information Required:</span> {spec.details.printingInfoRequired}</div>}
                  {spec.details.requiredBestBeforeDate && <div><span className="font-medium">Required Best Before Date:</span> {spec.details.requiredBestBeforeDate}</div>}
                  {spec.details.dateFormatting && <div><span className="font-medium">Date Formatting:</span> {spec.details.dateFormatting}</div>}
                </div>
              </div>
            </>
          )}

          {spec.details.customerRequestedChanges && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Customer Requested Changes</h3>
                <div className="bg-muted p-4 rounded-md">
                  <p>{spec.details.customerRequestedChanges}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="justify-end gap-4">
          {spec.status === 'pending' && (
            <>
              <Button
                variant="destructive"
                disabled={submitting}
                onClick={() => handleStatusUpdate('rejected')}
              >
                {submitting ? 'Submitting...' : 'Reject Specification'}
              </Button>
              <Button
                disabled={submitting}
                onClick={() => handleStatusUpdate('approved')}
              >
                {submitting ? 'Submitting...' : 'Approve Specification'}
              </Button>
            </>
          )}
          {spec.status !== 'pending' && (
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default PackingSpecDetails;
