
import React from 'react';
import { Package } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import CategoryDisplay from '../CategoryDisplay';
import { formatTextContent } from '@/utils/formatters';
import SectionApproval from '../SectionApproval';
import { useSectionApproval } from '@/contexts/SectionApprovalContext';

interface HoneySpecificationTabProps {
  details: Record<string, any>;
  onApproveSection?: (section: string) => Promise<void>;
  onRequestChanges?: (section: string, comments: string) => Promise<void>;
  onNavigateToNextTab?: () => void;
}

const HoneySpecificationTab: React.FC<HoneySpecificationTabProps> = ({ 
  details,
  onApproveSection,
  onRequestChanges,
  onNavigateToNextTab
}) => {
  const { sectionStates, updateSectionStatus } = useSectionApproval();
  const sectionStatus = sectionStates.overview.status;
  
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

  return (
    <div className="space-y-6 animate-in fade-in-50">
      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2 bg-muted/30">
          <CardTitle className="text-lg flex items-center">
            <Package className="mr-2 h-5 w-5 text-primary/80" />
            Honey Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Honey Type</h4>
                <p className="font-medium">{displayValue(details.honeyType)}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">UMF/MGO</h4>
                <p className="font-medium">{displayValue(details.umfMgo)}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Allergen Type</h4>
                <div className="mt-1">
                  {details.allergenType ? (
                    <CategoryDisplay 
                      categories={details.allergenType} 
                      variant="outline"
                      bgColor="bg-red-50"
                    />
                  ) : (
                    <span className="text-muted-foreground italic">N/A</span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Ingredient Type</h4>
                <div className="mt-1">
                  {details.ingredientType ? (
                    <CategoryDisplay 
                      categories={details.ingredientType} 
                      variant="outline"
                      bgColor="bg-green-50"
                    />
                  ) : (
                    <span className="text-muted-foreground italic">N/A</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-end">
          <SectionApproval
            sectionName="Honey Specification"
            status={sectionStatus}
            onApprove={handleApprove}
            onRequestChanges={handleRequestChanges}
          />
        </CardFooter>
      </Card>
    </div>
  );
};

export default HoneySpecificationTab;
