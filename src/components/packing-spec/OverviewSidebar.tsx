
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Info, Package, User, Tag, Hash, Calendar, Check, ThumbsUp, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/utils/formatters';
import StatusBadge from './StatusBadge';
import { Button } from '@/components/ui/button';

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
  onOpenApproval?: () => void;
}

const OverviewSidebar: React.FC<OverviewSidebarProps> = ({ 
  details, 
  status, 
  createdAt,
  spec,
  user,
  isSubmitting = false,
  onOpenApproval
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
      <Card className="shadow-sm bg-white border-t-2 border-t-primary/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Info className="mr-2 h-5 w-5 text-primary" />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1 flex items-center">
                <Package className="mr-1.5 h-3.5 w-3.5" />
                Product Name
              </h4>
              <p className="text-sm font-medium">{details.product || "N/A"}</p>
            </div>
            
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1 flex items-center">
                <User className="mr-1.5 h-3.5 w-3.5" />
                Customer
              </h4>
              <p className="text-sm font-medium">{user?.name || details.customer || "N/A"}</p>
            </div>
            
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1 flex items-center">
                <Tag className="mr-1.5 h-3.5 w-3.5" />
                Product Code
              </h4>
              <p className="text-sm font-medium">{details.productCode || "N/A"}</p>
            </div>
            
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1 flex items-center">
                <Hash className="mr-1.5 h-3.5 w-3.5" />
                Version Number
              </h4>
              <p className="text-sm font-medium">{formatVersion(details.versionNumber)}</p>
            </div>
            
            <div className="col-span-2">
              <h4 className="text-xs font-medium text-muted-foreground mb-1 flex items-center">
                <User className="mr-1.5 h-3.5 w-3.5" />
                Specification Updated By
              </h4>
              <p className="text-sm font-medium">{details.updatedBy || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Status Card */}
      <Card className="shadow-sm bg-white border-t-2 border-t-primary/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Status</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Current Status</h4>
              <StatusBadge status={status} showIcon={true} />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Created Date</h4>
                <p className="text-sm">{formatDate(createdAt)}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Last Reviewed</h4>
                <p className="text-sm">{details.dateReviewed ? formatDate(details.dateReviewed) : "N/A"}</p>
              </div>
            </div>
            {details.contactPerson && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Contact Person</h4>
                <p className="text-sm">{details.contactPerson}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Show approval actions or approved/rejected status cards */}
      {spec && user && spec.status === 'pending' && onOpenApproval && (
        <Card className="shadow-sm mt-6">
          <CardContent className="pt-4 pb-4">
            <h3 className="text-sm font-medium mb-3">Specification Approval</h3>
            <Button 
              onClick={onOpenApproval}
              className="w-full"
              disabled={isSubmitting}
            >
              <ThumbsUp className="mr-2 h-4 w-4" />
              Review & Approve
            </Button>
          </CardContent>
        </Card>
      )}
      
      {spec && spec.status === 'approved' && (
        <Card className="shadow-sm border-green-200 bg-green-50/50 mt-6">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center text-green-800 mb-2">
              <Check className="mr-2 h-5 w-5 text-green-600" />
              <span className="font-medium">Approved</span>
            </div>
            <p className="text-green-700 text-sm">This specification has been approved for production.</p>
            {details.approvedByName && (
              <p className="text-green-700 text-sm mt-2">
                Approved by: {details.approvedByName}
              </p>
            )}
            {details.approvalDate && (
              <p className="text-green-700 text-sm">
                Approval date: {formatDate(details.approvalDate)}
              </p>
            )}
          </CardContent>
        </Card>
      )}
      
      {spec && spec.status === 'rejected' && (
        <Card className="shadow-sm border-amber-200 bg-amber-50/50 mt-6">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center text-amber-800 mb-2">
              <AlertTriangle className="mr-2 h-5 w-5 text-amber-600" />
              <span className="font-medium">Changes Requested</span>
            </div>
            <p className="text-amber-700 text-sm">Review requested changes in the Comments tab.</p>
            {details.customerRequestedChanges && (
              <div className="mt-2 text-sm text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                {details.customerRequestedChanges}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OverviewSidebar;
