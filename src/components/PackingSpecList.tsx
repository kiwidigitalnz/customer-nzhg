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
import { Separator } from '@/components/ui/separator';
import { Check, X, AlertCircle, Calendar, Package, Info, ExternalLink, Loader2, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { EnhancedApprovalDialog } from './approval';
import { CommentItem, PackingSpec } from '../services/podioApi';

interface PackingSpecListProps {
  specs: PackingSpec[];
  onUpdate: () => void;
  readOnly?: boolean;
}

const PackingSpecList = ({ specs, onUpdate, readOnly = false }: PackingSpecListProps) => {
  const [selectedSpec, setSelectedSpec] = useState<PackingSpec | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  if (specs.length === 0) {
    return (
      <div className="text-center py-12 bg-muted rounded-md">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No specifications found</h3>
        <p className="text-muted-foreground">There are no packing specifications in this category.</p>
      </div>
    );
  }

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

  const handleStatusUpdated = () => {
    toast({
      title: "Status updated",
      description: "The specification status has been updated successfully.",
    });
    onUpdate();
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
              <div className="flex gap-2 w-full">
                <EnhancedApprovalDialog
                  specId={spec.id}
                  onStatusUpdated={handleStatusUpdated}
                  type="approve"
                  buttonText="Approve"
                  buttonClassName="w-full bg-green-600 hover:bg-green-700 text-white"
                />
                <EnhancedApprovalDialog
                  specId={spec.id}
                  onStatusUpdated={handleStatusUpdated}
                  type="reject"
                  buttonText="Request Changes"
                  buttonClassName="w-full border-amber-400 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                />
              </div>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default PackingSpecList;
