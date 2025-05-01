
import React, { useRef, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Info, ShieldCheck, Package, FileText, Truck, 
  FileIcon, CheckSquare, CheckCircle2, AlertTriangle, Clock
} from 'lucide-react';
import { useSectionApproval, SectionName } from '@/contexts/SectionApprovalContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const tabsListRef = useRef<HTMLDivElement>(null);
  
  // Calculate approval progress percentage
  const totalSections = Object.keys(sectionStates).length;
  const approvedSections = Object.values(sectionStates).filter(section => section.status === 'approved').length;
  const approvalProgress = totalSections > 0 ? (approvedSections / totalSections) * 100 : 0;
  
  // When tab changes, scroll that tab into view on mobile
  useEffect(() => {
    if (isMobile && tabsListRef.current && currentTabValue) {
      const activeTab = tabsListRef.current.querySelector(`[data-value="${currentTabValue}"]`);
      if (activeTab) {
        // Calculate position to center the tab in the viewport
        const tabRect = activeTab.getBoundingClientRect();
        const containerRect = tabsListRef.current.getBoundingClientRect();
        const scrollLeft = activeTab.scrollLeft + tabRect.left - containerRect.left - 
                         (containerRect.width / 2) + (tabRect.width / 2);
                         
        tabsListRef.current.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }
  }, [currentTabValue, isMobile]);
  
  const getSectionIndicator = (section: SectionName) => {
    const status = sectionStates[section]?.status;
    
    if (status === 'approved') {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    
    if (status === 'changes-requested') {
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    }
    
    return <Clock className="h-4 w-4 text-gray-500" />;
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
  
  const getTabStatusClass = (section: SectionName) => {
    const status = sectionStates[section]?.status;
    
    if (status === 'approved') {
      return 'bg-green-50 hover:bg-green-100 data-[state=active]:bg-green-100 border-green-200';
    }
    
    if (status === 'changes-requested') {
      return 'bg-amber-50 hover:bg-amber-100 data-[state=active]:bg-amber-100 border-amber-200';
    }
    
    return '';
  };

  const getFinalTabStatusClass = () => {
    if (allSectionsApproved) {
      return 'bg-green-50 hover:bg-green-100 data-[state=active]:bg-green-100 border-green-200';
    } else if (anySectionsWithChangesRequested) {
      return 'bg-amber-50 hover:bg-amber-100 data-[state=active]:bg-amber-100 border-amber-200';
    }
    
    return '';
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

  // Mobile tab rendering (icons only with tooltips and improved touch targets)
  const renderMobileTabs = () => (
    <TabsList 
      ref={tabsListRef}
      className="w-full flex overflow-x-auto md:hidden tabs-container snap-x snap-mandatory overscroll-x-contain"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {tabData.map((tab) => {
        const statusClass = getTabStatusClass(tab.sectionName);
        return (
          <TooltipProvider key={tab.value} delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger
                  value={tab.value}
                  data-value={tab.value}
                  onClick={() => handleTabClick(tab.value)}
                  className={cn(
                    "flex flex-col items-center py-3 px-4 gap-1 min-w-[72px] snap-center touch-manipulation",
                    currentTabValue === tab.value ? "selected-tab" : "",
                    statusClass
                  )}
                  data-state={currentTabValue === tab.value ? 'active' : 'inactive'}
                  aria-label={tab.tooltip}
                >
                  <span className="relative">
                    {tab.icon}
                    <span className="absolute -top-1 -right-1">
                      {getSectionIndicator(tab.sectionName)}
                    </span>
                  </span>
                  <span className="text-[10px]">{tab.label}</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p>{tab.tooltip}</p>
                  <p className="font-semibold mt-1">
                    Status: {sectionStates[tab.sectionName]?.status === 'approved' 
                      ? 'Approved' 
                      : sectionStates[tab.sectionName]?.status === 'changes-requested'
                        ? 'Changes Requested'
                        : 'Pending'}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <TabsTrigger
              value="final-approval"
              data-value="final-approval"
              onClick={() => handleTabClick('final-approval')}
              className={cn(
                "flex flex-col items-center py-3 px-4 gap-1 min-w-[72px] snap-center touch-manipulation",
                currentTabValue === 'final-approval' ? "selected-tab" : "",
                getFinalTabStatusClass()
              )}
              data-state={currentTabValue === 'final-approval' ? 'active' : 'inactive'}
              aria-label="Final Approval"
            >
              {getFinalTabIcon()}
              <span className="text-[10px]">Approve</span>
              {newCommentsCount > 0 && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                  {newCommentsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p>Final Approval</p>
              <p className="font-semibold mt-1">
                {allSectionsApproved 
                  ? 'Ready for Final Approval!' 
                  : anySectionsWithChangesRequested 
                    ? 'Changes Requested - Review before finalizing' 
                    : 'Review all sections before approving'}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </TabsList>
  );

  // Desktop tab rendering (icons and text)
  const renderDesktopTabs = () => (
    <TabsList className="hidden md:flex md:flex-wrap w-full tabs-container">
      {tabData.map((tab) => {
        const statusClass = getTabStatusClass(tab.sectionName);
        const sectionStatus = sectionStates[tab.sectionName]?.status;
        return (
          <TooltipProvider key={tab.value} delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  data-value={tab.value}
                  onClick={() => handleTabClick(tab.value)}
                  className={cn(
                    "flex items-center gap-1.5",
                    currentTabValue === tab.value ? "selected-tab" : "",
                    statusClass
                  )}
                  data-state={currentTabValue === tab.value ? 'active' : 'inactive'}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {getSectionIndicator(tab.sectionName)}
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p>{tab.tooltip}</p>
                  <p className="font-semibold mt-1">
                    Status: {sectionStatus === 'approved' 
                      ? 'Approved' 
                      : sectionStatus === 'changes-requested'
                        ? 'Changes Requested'
                        : 'Pending'}
                  </p>
                  {sectionStatus === 'approved' && sectionStates[tab.sectionName]?.approvedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Approved at: {new Date(sectionStates[tab.sectionName].approvedAt!).toLocaleString()}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <TabsTrigger
              value="final-approval"
              data-value="final-approval"
              onClick={() => handleTabClick('final-approval')}
              className={cn(
                "flex items-center gap-1.5",
                currentTabValue === 'final-approval' ? "selected-tab" : "",
                getFinalTabStatusClass()
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
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p>Final Approval</p>
              <p className="font-semibold mt-1">
                {allSectionsApproved 
                  ? 'Ready for Final Approval!' 
                  : anySectionsWithChangesRequested 
                    ? 'Changes Requested - Review before finalizing' 
                    : 'Review all sections before approving'}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </TabsList>
  );
  
  return (
    <div className="w-full mb-6">
      {/* Progress bar showing approval status */}
      <div className="mb-2 flex justify-between items-center">
        <div className="flex-grow mr-2">
          <Progress value={approvalProgress} className="h-2" />
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {approvedSections} of {totalSections} approved
        </div>
      </div>
      
      {renderMobileTabs()}
      {renderDesktopTabs()}
    </div>
  );
};

export default TabsNavigation;
