
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Info, Package, User, Tag, Hash, Calendar, Check } from 'lucide-react';
import { formatDate } from '@/utils/formatters';
import StatusBadge from './StatusBadge';
import ApprovalSection from './ApprovalSection';

interface OverviewSidebarProps {
  details: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  spec?: {
    id: number;
    status: 'pending' | 'approved' | 'rejected';
    details: Record<string, any>;
  };
  user?: any;
  onApprove?: any;
  onReject?: any;
  isSubmitting?: boolean;
}

const OverviewSidebar: React.FC<OverviewSidebarProps> = ({ 
  details, 
  status, 
  createdAt,
  spec,
  user,
  onApprove,
  onReject,
  isSubmitting = false
}) => {
  // Format version to have only 1 decimal place
  const formatVersion = (version: string | undefined) => {
    if (!version) return "N/A";
    
    // Check if version is a number with decimals
    if (!isNaN(parseFloat(version))) {
      return parseFloat(version).toFixed(1);
    }
    
    return version;
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Info className="mr-2 h-5 w-5 text-primary/80" />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                <Package className="mr-1.5 h-4 w-4" />
                Product Name
              </h4>
              <p className="text-sm font-medium">{details.product || "N/A"}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                <User className="mr-1.5 h-4 w-4" />
                Company Name
              </h4>
              <p className="text-sm font-medium">{details.customer || "N/A"}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                <Tag className="mr-1.5 h-4 w-4" />
                Product Code
              </h4>
              <p className="text-sm font-medium">{details.productCode || "N/A"}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                <Hash className="mr-1.5 h-4 w-4" />
                Version Number
              </h4>
              <p className="text-sm font-medium">{formatVersion(details.versionNumber)}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                <User className="mr-1.5 h-4 w-4" />
                Specification Updated By
              </h4>
              <p className="text-sm font-medium">{details.specificationUpdatedBy || "N/A"}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                <Calendar className="mr-1.5 h-4 w-4" />
                Date Last Reviewed
              </h4>
              <p className="text-sm font-medium">{details.dateReviewed ? formatDate(details.dateReviewed) : "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Status Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Status</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Current Status</h4>
              <StatusBadge status={status} showIcon={true} />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Created Date</h4>
                <p className="text-sm">{formatDate(createdAt)}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Last Reviewed</h4>
                <p className="text-sm">{details.dateReviewed ? formatDate(details.dateReviewed) : "N/A"}</p>
              </div>
            </div>
            {details.contactPerson && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Contact Person</h4>
                <p className="text-sm">{details.contactPerson}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Only show approval section if we have the full spec and handlers */}
      {spec && user && onApprove && onReject && (
        <ApprovalSection 
          spec={spec}
          user={user}
          onApprove={onApprove}
          onReject={onReject}
          isSubmitting={isSubmitting}
        />
      )}
      
      {status === 'approved' && !spec && (
        <Card className="shadow-sm border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-green-800">
              <Check className="mr-2 h-5 w-5 text-green-600" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-green-700 text-sm">This specification has been approved and is ready for production.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OverviewSidebar;
