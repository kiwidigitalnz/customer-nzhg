
import React from 'react';
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SpecStatus = 'pending' | 'approved' | 'rejected';

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
      case 'pending':
        return {
          icon: <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />,
          label: compact ? 'Pending' : 'Pending Approval',
          className: 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-50'
        };
      case 'approved':
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />,
          label: compact ? 'Approved' : 'Approved by Customer',
          className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
        };
      case 'rejected':
        return {
          icon: <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.5} />,
          label: compact ? 'Changes Requested' : 'Changes Requested',
          className: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-50'
        };
      default:
        return {
          icon: <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />,
          label: 'Unknown',
          className: 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-100'
        };
    }
  };

  const { icon, label, className: statusClassName } = getStatusConfig();

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors shadow-sm", 
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
