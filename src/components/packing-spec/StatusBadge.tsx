
import React from 'react';
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define all possible status values to match Podio's approval status categories
export type SpecStatus = 'pending-approval' | 'approved-by-customer' | 'changes-requested';

interface StatusBadgeProps {
  status: SpecStatus;
  showIcon?: boolean;
  compact?: boolean;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  showIcon = false, 
  compact = false,
  className
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending-approval':
        return {
          icon: <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />,
          label: compact ? 'Pending Approval' : 'Pending Approval',
          className: 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-50 status-badge-pending'
        };
      case 'approved-by-customer':
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />,
          label: compact ? 'Approved by Customer' : 'Approved by Customer',
          className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 status-badge-approved'
        };
      case 'changes-requested':
        return {
          icon: <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.5} />,
          label: compact ? 'Changes Requested' : 'Changes Requested',
          className: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-50 status-badge-rejected'
        };
      default:
        return {
          icon: <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />,
          label: 'Unknown Status',
          className: 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-100'
        };
    }
  };

  const { icon, label, className: statusClassName } = getStatusConfig();

  return (
    <div 
      className={cn(
        "status-badge", 
        statusClassName,
        className
      )}
    >
      {showIcon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
    </div>
  );
};

export default StatusBadge;
