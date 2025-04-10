
import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Info, ShieldCheck, Package, FileText, Truck, 
  FileIcon, MessageSquare, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { useSectionApproval, SectionName } from '@/contexts/SectionApprovalContext';
import { cn } from '@/lib/utils';

interface TabsNavigationProps {
  newCommentsCount?: number;
  onTabClick?: (tab: string) => void;
  currentTabValue?: string;
}

const TabsNavigation: React.FC<TabsNavigationProps> = ({ 
  newCommentsCount = 0,
  onTabClick,
  currentTabValue
}) => {
  const { sectionStates } = useSectionApproval();
  
  const getSectionIndicator = (section: SectionName) => {
    const status = sectionStates[section]?.status;
    
    if (status === 'approved') {
      return <CheckCircle2 className="ml-1.5 h-3.5 w-3.5 text-green-600" />;
    }
    
    if (status === 'changes-requested') {
      return <AlertTriangle className="ml-1.5 h-3.5 w-3.5 text-amber-600" />;
    }
    
    return null;
  };
  
  const getTabClassName = (section: SectionName) => {
    const status = sectionStates[section]?.status;
    
    if (status === 'approved') {
      return "border-l-2 border-l-green-500 bg-green-50/50";
    }
    
    if (status === 'changes-requested') {
      return "border-l-2 border-l-amber-500 bg-amber-50/50";
    }
    
    return "";
  };
  
  const handleTabClick = (value: string) => {
    if (onTabClick) {
      onTabClick(value);
    }
  };
  
  return (
    <TabsList className="mb-6 w-full flex overflow-x-auto justify-start p-1 bg-muted/70 rounded-md">
      <TabsTrigger 
        value="overview" 
        className={cn("flex items-center", getTabClassName('overview'))}
        data-state={currentTabValue === 'overview' ? 'active' : ''}
        onClick={() => handleTabClick('overview')}
      >
        <Info className="mr-1.5 h-4 w-4" />
        <span>Honey Specification</span>
        {getSectionIndicator('overview')}
      </TabsTrigger>
      <TabsTrigger 
        value="requirements" 
        className={cn("flex items-center", getTabClassName('requirements'))}
        data-state={currentTabValue === 'requirements' ? 'active' : ''}
        onClick={() => handleTabClick('requirements')}
      >
        <ShieldCheck className="mr-1.5 h-4 w-4" />
        <span>Requirements</span>
        {getSectionIndicator('requirements')}
      </TabsTrigger>
      <TabsTrigger 
        value="packaging" 
        className={cn("flex items-center", getTabClassName('packaging'))}
        data-state={currentTabValue === 'packaging' ? 'active' : ''}
        onClick={() => handleTabClick('packaging')}
      >
        <Package className="mr-1.5 h-4 w-4" />
        <span>Packaging</span>
        {getSectionIndicator('packaging')}
      </TabsTrigger>
      <TabsTrigger 
        value="label" 
        className={cn("flex items-center", getTabClassName('label'))}
        data-state={currentTabValue === 'label' ? 'active' : ''}
        onClick={() => handleTabClick('label')}
      >
        <FileText className="mr-1.5 h-4 w-4" />
        <span>Labeling</span>
        {getSectionIndicator('label')}
      </TabsTrigger>
      <TabsTrigger 
        value="shipping" 
        className={cn("flex items-center", getTabClassName('shipping'))}
        data-state={currentTabValue === 'shipping' ? 'active' : ''}
        onClick={() => handleTabClick('shipping')}
      >
        <Truck className="mr-1.5 h-4 w-4" />
        <span>Shipping</span>
        {getSectionIndicator('shipping')}
      </TabsTrigger>
      <TabsTrigger 
        value="documents" 
        className={cn("flex items-center", getTabClassName('documents'))}
        data-state={currentTabValue === 'documents' ? 'active' : ''}
        onClick={() => handleTabClick('documents')}
      >
        <FileIcon className="mr-1.5 h-4 w-4" />
        <span>Documents</span>
        {getSectionIndicator('documents')}
      </TabsTrigger>
      <TabsTrigger 
        value="comments" 
        className="flex items-center relative"
        data-state={currentTabValue === 'comments' ? 'active' : ''}
        onClick={() => handleTabClick('comments')}
      >
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
