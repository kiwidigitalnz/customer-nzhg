
import React from 'react';
import { Package } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import CategoryDisplay from '../CategoryDisplay';
import { formatTextContent } from '@/utils/formatters';
import SectionApproval from '../SectionApproval';
import { useSectionApproval } from '@/contexts/SectionApprovalContext';
import { SpecStatus } from '../StatusBadge';
import SpecSection from '../SpecSection';
import { cn } from '@/lib/utils';

interface HoneySpecificationTabProps {
  details: Record<string, any>;
  onApproveSection?: (section: string) => Promise<void>;
  onRequestChanges?: (section: string, comments: string) => Promise<void>;
  onNavigateToNextTab?: () => void;
  specStatus?: SpecStatus;
}

const HoneySpecificationTab: React.FC<HoneySpecificationTabProps> = ({ 
  details,
  onApproveSection,
  onRequestChanges,
  onNavigateToNextTab,
  specStatus
}) => {
  const { sectionStates, updateSectionStatus } = useSectionApproval();
  const sectionStatus = sectionStates['overview']?.status || 'pending';
  
  // Helper function to display values, showing "N/A" as a single value
  const displayValue = (value: any) => {
    if (!value || value === "N/A") {
      return <span className="text-muted-foreground italic">N/A</span>;
    }
    return value;
  };

  const handleApprove = async () => {
    if (onApproveSection) {
      await onApproveSection('overview');
    }
    updateSectionStatus('overview', 'approved');
    
    // Navigate to next tab after approval is complete
    if (onNavigateToNextTab) {
      onNavigateToNextTab();
    }
  };
  
  const handleRequestChanges = async (section: string, comments: string) => {
    if (onRequestChanges) {
      await onRequestChanges(section, comments);
    }
    updateSectionStatus('overview', 'changes-requested', comments);
    
    // Navigate to next tab after changes are requested
    if (onNavigateToNextTab) {
      onNavigateToNextTab();
    }
  };

  // Get card background class based on section status
  const getCardBackgroundClass = () => {
    switch(sectionStatus) {
      case 'approved':
        return 'bg-green-50/50 border-green-200';
      case 'changes-requested':
        return 'bg-amber-50/50 border-amber-200';
      default:
        return '';
    }
  };

  // Define honey details attributes for the SpecSection
  const honeyAttributes = [
    { 
      key: 'honeyType2', 
      label: 'Honey Type',
      fieldType: 'text' as const
    },
    { 
      key: 'honeyType', 
      label: 'Honey Process',
      fieldType: 'text' as const
    },
    {
      key: 'umfMgo',
      label: 'UMF/MGO',
      fieldType: 'text' as const
    },
    {
      key: 'category',
      label: 'Lozenge type',
      fieldType: 'category' as const
    }
  ];
  
  // Define allergen attributes for the SpecSection
  const allergenAttributes = [
    {
      key: 'allergenType',
      label: 'Allergen Type',
      fieldType: 'category' as const
    },
    {
      key: 'allergenQtyGrams',
      label: 'Allergen Quantity (g)',
      fieldType: 'number' as const
    },
    {
      key: 'ingredientType',
      label: 'Ingredient Type',
      fieldType: 'category' as const
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in-50">
      <Card className={cn("shadow-sm border-muted transition-colors duration-300", getCardBackgroundClass())}>
        <CardHeader className={cn("pb-2", sectionStatus === 'approved' ? 'bg-green-100/30' : sectionStatus === 'changes-requested' ? 'bg-amber-100/30' : 'bg-muted/30')}>
          <CardTitle className="text-lg flex items-center">
            <Package className="mr-2 h-5 w-5 text-primary/80" />
            Honey Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SpecSection
              title="Honey Specifications"
              attributes={honeyAttributes}
              data={details}
              emptyMessage="No honey specifications available"
            />
            
            <SpecSection
              title="Allergen & Ingredient Details"
              attributes={allergenAttributes}
              data={details}
              emptyMessage="No allergen or ingredient details available"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-end">
          <SectionApproval
            sectionName="Honey Specification"
            onApproveSection={handleApprove}
            onRequestChanges={handleRequestChanges}
            onNavigateToNextTab={onNavigateToNextTab}
            specStatus={specStatus}
          />
        </CardFooter>
      </Card>
    </div>
  );
};

export default HoneySpecificationTab;
