
import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Info, ShieldCheck, Package, FileText, Truck, 
  Check, MessageSquare 
} from 'lucide-react';

interface TabsNavigationProps {
  newCommentsCount?: number;
}

const TabsNavigation: React.FC<TabsNavigationProps> = ({ newCommentsCount = 0 }) => {
  return (
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
        {newCommentsCount > 0 && (
          <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">{newCommentsCount}</Badge>
        )}
      </TabsTrigger>
    </TabsList>
  );
};

export default TabsNavigation;
