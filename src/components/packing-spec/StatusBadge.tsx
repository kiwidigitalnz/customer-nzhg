
import React from 'react';
import { Badge } from '@/components/ui/badge';

export type SpecStatus = 'pending' | 'approved' | 'rejected';

interface StatusBadgeProps {
  status: SpecStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          Pending Approval
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
          Approved
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
          Rejected
        </Badge>
      );
    default:
      return null;
  }
};

export default StatusBadge;
