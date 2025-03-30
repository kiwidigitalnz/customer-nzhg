
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export type SpecStatus = 'pending' | 'approved' | 'rejected';

interface StatusBadgeProps {
  status: SpecStatus;
  showIcon?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showIcon = false }) => {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          {showIcon && <Clock className="mr-1.5 h-3 w-3" />}
          Pending Approval
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
          {showIcon && <CheckCircle2 className="mr-1.5 h-3 w-3" />}
          Approved
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
          {showIcon && <AlertTriangle className="mr-1.5 h-3 w-3" />}
          Rejected
        </Badge>
      );
    default:
      return null;
  }
};

export default StatusBadge;
