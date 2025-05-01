
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Info, ShieldCheck, Package, FileText, Truck, 
  FileIcon, CheckSquare, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { useSectionApproval, SectionName } from '@/contexts/SectionApprovalContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    
    if (status === 'changes-requested') {
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    }
    
    return null;
  };
  
  const handleTabClick = (value: string) => {
    if (onTabClick) {
      onTabClick(value);
    }
  };

  // Determine the final tab icon based on approval status
  const getFinalTabIcon = () => {
    if (allSectionsApproved) {
      return <CheckCircle2 className="mr-1 h-4 w-4 text-green-600" />;
    } else if (anySectionsWithChangesRequested) {
      return <AlertTriangle className="mr-1 h-4 w-4 text-amber-600" />;
    } else {
      return <CheckSquare className="mr-1 h-4 w-4" />;
    }
  };
  
  const tabData = [
    {
      value: "overview",
      sectionName: "overview" as SectionName,
      icon: <Info className="h-4 w-4" />,
      label: "Overview",
      tooltip: "Honey Specification Overview"
    },
    {
      value: "requirements",
      sectionName: "requirements" as SectionName,
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "Requirements",
      tooltip: "View Requirements"
    },
    {
      value: "packaging",
      sectionName: "packaging" as SectionName,
      icon: <Package className="h-4 w-4" />,
      label: "Packaging",
      tooltip: "Packaging Information"
    },
    {
      value: "label",
      sectionName: "label" as SectionName,
      icon: <FileText className="h-4 w-4" />,
      label: "Labeling",
      tooltip: "Labeling Requirements"
    },
    {
      value: "shipping",
      sectionName: "shipping" as SectionName,
      icon: <Truck className="h-4 w-4" />,
      label: "Shipping",
      tooltip: "Shipping Details"
    },
    {
      value: "documents",
      sectionName: "documents" as SectionName,
      icon: <FileIcon className="h-4 w-4" />,
      label: "Documents",
      tooltip: "Required Documents"
    }
  ];

  // Mobile tab rendering (icons only with tooltips)
  const renderMobileTabs = () => (
    <TabsList className="w-full grid grid-cols-4 md:hidden tabs-container">
      {tabData.map((tab) => (
        <TooltipProvider key={tab.value} delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger
                value={tab.value}
                onClick={() => handleTabClick(tab.value)}
                className={cn(
                  "flex flex-col items-center py-2 gap-1",
                  currentTabValue === tab.value ? "selected-tab bg-background text-primary" : ""
                )}
                data-state={currentTabValue === tab.value ? 'active' : 'inactive'}
              >
                <span className="relative">
                  {tab.icon}
                  {getSectionIndicator(tab.sectionName) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-current" />
                  )}
                </span>
                <span className="text-[10px]">{tab.label}</span>
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>{tab.tooltip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <TabsTrigger
              value="final-approval"
              onClick={() => handleTabClick('final-approval')}
              className={cn(
                "flex flex-col items-center py-2 gap-1",
                currentTabValue === 'final-approval' ? "selected-tab bg-background text-primary" : "",
                allSectionsApproved ? "text-green-600" : anySectionsWithChangesRequested ? "text-amber-600" : ""
              )}
              data-state={currentTabValue === 'final-approval' ? 'active' : 'inactive'}
            >
              {getFinalTabIcon()}
              <span className="text-[10px]">Approve</span>
              {newCommentsCount > 0 && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                  {newCommentsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TooltipTrigger>
          <TooltipContent>Final Approval</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </TabsList>
  );

  // Desktop tab rendering (icons and text)
  const renderDesktopTabs = () => (
    <TabsList className="hidden md:flex md:flex-wrap w-full tabs-container">
      {tabData.map((tab) => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          onClick={() => handleTabClick(tab.value)}
          className={cn(
            "flex items-center gap-1.5",
            currentTabValue === tab.value ? "selected-tab text-primary" : ""
          )}
          data-state={currentTabValue === tab.value ? 'active' : 'inactive'}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {getSectionIndicator(tab.sectionName)}
        </TabsTrigger>
      ))}
      
      <TabsTrigger
        value="final-approval"
        onClick={() => handleTabClick('final-approval')}
        className={cn(
          "flex items-center gap-1.5",
          currentTabValue === 'final-approval' ? "selected-tab text-primary" : "",
          allSectionsApproved ? "text-green-600" : anySectionsWithChangesRequested ? "text-amber-600" : ""
        )}
        data-state={currentTabValue === 'final-approval' ? 'active' : 'inactive'}
      >
        {getFinalTabIcon()}
        <span>Final Approval</span>
        {newCommentsCount > 0 && (
          <Badge variant="secondary" className="bg-primary text-primary-foreground">
            {newCommentsCount}
          </Badge>
        )}
      </TabsTrigger>
    </TabsList>
  );
  
  return (
    <div className="w-full mb-6">
      {renderMobileTabs()}
      {renderDesktopTabs()}
    </div>
  );
};

export default TabsNavigation;
