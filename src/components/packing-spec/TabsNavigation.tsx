
import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Info, ShieldCheck, Package, FileText, Truck, 
  FileIcon, CheckSquare, CheckCircle2, AlertTriangle 
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
  const { sectionStates, allSectionsApproved, anySectionsWithChangesRequested } = useSectionApproval();
  
  const getSectionIndicator = (section: SectionName) => {
    const status = sectionStates[section]?.status;
    
    if (status === 'approved') {
      return <CheckCircle2 className="ml-1.5 h-4 w-4 text-green-600" />;
    }
    
    if (status === 'changes-requested') {
      return <AlertTriangle className="ml-1.5 h-4 w-4 text-amber-600" />;
    }
    
    return null;
  };
  
  const getTabClassName = (section: SectionName, isActive: boolean) => {
    const status = sectionStates[section]?.status;
    let statusClasses = '';
    
    if (status === 'approved') {
      statusClasses = "text-green-700";
    } else if (status === 'changes-requested') {
      statusClasses = "text-amber-700";
    }
    
    return cn(
      "relative group transition-all duration-300",
      isActive ? "bg-background shadow-md font-medium" : "hover:bg-background/70",
      statusClasses
    );
  };

  const handleTabClick = (value: string) => {
    if (onTabClick) {
      onTabClick(value);
    }
  };

  // Determine the final tab icon based on approval status
  const getFinalTabIcon = () => {
    if (allSectionsApproved) {
      return <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />;
    } else if (anySectionsWithChangesRequested) {
      return <AlertTriangle className="mr-2 h-5 w-5 text-amber-600" />;
    } else {
      return <CheckSquare className="mr-2 h-5 w-5" />;
    }
  };

  // Determine final tab class based on approval status
  const getFinalTabClass = (isActive: boolean) => {
    let statusClass = '';
    
    if (allSectionsApproved) {
      statusClass = "text-green-700";
    } else if (anySectionsWithChangesRequested) {
      statusClass = "text-amber-700";
    }
    
    return cn(
      "relative group transition-all duration-300",
      isActive ? "bg-background shadow-md font-medium scale-105" : "hover:bg-background/70",
      statusClass
    );
  };
  
  // Define a consistent style for icons
  const iconClass = "h-5 w-5 mr-2";
  
  return (
    <TabsList className="mb-6 w-full flex overflow-x-auto justify-start p-2 bg-muted/70 rounded-lg shadow-sm border border-muted">
      <TabsTrigger 
        value="overview" 
        className={getTabClassName('overview', currentTabValue === 'overview')}
        data-state={currentTabValue === 'overview' ? 'active' : ''}
        onClick={() => handleTabClick('overview')}
      >
        <Info className={iconClass} />
        <span>Honey Specification</span>
        {getSectionIndicator('overview')}
      </TabsTrigger>
      
      <TabsTrigger 
        value="requirements" 
        className={getTabClassName('requirements', currentTabValue === 'requirements')}
        data-state={currentTabValue === 'requirements' ? 'active' : ''}
        onClick={() => handleTabClick('requirements')}
      >
        <ShieldCheck className={iconClass} />
        <span>Requirements</span>
        {getSectionIndicator('requirements')}
      </TabsTrigger>
      
      <TabsTrigger 
        value="packaging" 
        className={getTabClassName('packaging', currentTabValue === 'packaging')}
        data-state={currentTabValue === 'packaging' ? 'active' : ''}
        onClick={() => handleTabClick('packaging')}
      >
        <Package className={iconClass} />
        <span>Packaging</span>
        {getSectionIndicator('packaging')}
      </TabsTrigger>
      
      <TabsTrigger 
        value="label" 
        className={getTabClassName('label', currentTabValue === 'label')}
        data-state={currentTabValue === 'label' ? 'active' : ''}
        onClick={() => handleTabClick('label')}
      >
        <FileText className={iconClass} />
        <span>Labeling</span>
        {getSectionIndicator('label')}
      </TabsTrigger>
      
      <TabsTrigger 
        value="shipping" 
        className={getTabClassName('shipping', currentTabValue === 'shipping')}
        data-state={currentTabValue === 'shipping' ? 'active' : ''}
        onClick={() => handleTabClick('shipping')}
      >
        <Truck className={iconClass} />
        <span>Shipping</span>
        {getSectionIndicator('shipping')}
      </TabsTrigger>
      
      <TabsTrigger 
        value="documents" 
        className={getTabClassName('documents', currentTabValue === 'documents')}
        data-state={currentTabValue === 'documents' ? 'active' : ''}
        onClick={() => handleTabClick('documents')}
      >
        <FileIcon className={iconClass} />
        <span>Documents</span>
        {getSectionIndicator('documents')}
      </TabsTrigger>
      
      <TabsTrigger 
        value="final-approval" 
        className={getFinalTabClass(currentTabValue === 'final-approval')}
        data-state={currentTabValue === 'final-approval' ? 'active' : ''}
        onClick={() => handleTabClick('final-approval')}
      >
        {getFinalTabIcon()}
        <span>Final Approval</span>
        {newCommentsCount > 0 && (
          <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">{newCommentsCount}</Badge>
        )}
      </TabsTrigger>
    </TabsList>
  );
};

export default TabsNavigation;
