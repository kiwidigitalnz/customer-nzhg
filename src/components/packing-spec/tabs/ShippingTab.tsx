
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Truck, Layers, FileText } from 'lucide-react';
import SectionApproval from '../SectionApproval';
import { useSectionApproval } from '@/contexts/SectionApprovalContext';

interface ShippingTabProps {
  details: Record<string, any>;
  onApproveSection?: (section: string) => Promise<void>;
  onRequestChanges?: (section: string, comments: string) => Promise<void>;
  onNavigateToNextTab?: () => void;
}

const ShippingTab: React.FC<ShippingTabProps> = ({ 
  details,
  onApproveSection,
  onRequestChanges,
  onNavigateToNextTab
}) => {
  const { sectionStates, updateSectionStatus } = useSectionApproval();
  const sectionStatus = sectionStates.shipping.status;
  
  const handleApprove = async () => {
    if (onApproveSection) {
      await onApproveSection('shipping');
    }
    updateSectionStatus('shipping', 'approved');
    
    // Navigate to next tab after approval is complete
    if (onNavigateToNextTab) {
      onNavigateToNextTab();
    }
  };
  
  const handleRequestChanges = async (section: string, comments: string) => {
    if (onRequestChanges) {
      await onRequestChanges(section, comments);
    }
    updateSectionStatus('shipping', 'changes-requested', comments);
    
    // Navigate to next tab after changes are requested
    if (onNavigateToNextTab) {
      onNavigateToNextTab();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Pallet Information */}
      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2 bg-muted/30">
          <CardTitle className="text-lg flex items-center">
            <Truck className="mr-2 h-5 w-5 text-primary/80" />
            Pallet Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Pallet Type</h4>
                <p className="font-medium">{details.palletType || "N/A"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Cartons Each Layer per Pallet</h4>
                <p className="font-medium">{details.cartonsPerLayer || "N/A"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Number of Layers per Pallet</h4>
                <p className="font-medium">{details.layersPerPallet || "N/A"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Pallet Specifications</h4>
                <p className="font-medium">{details.palletSpecifications || "N/A"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Pallet Documents</h4>
                <p className="font-medium">{details.palletDocuments || "N/A"}</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-end">
          <SectionApproval
            sectionName="Shipping"
            status={sectionStatus}
            onApprove={handleApprove}
            onRequestChanges={handleRequestChanges}
          />
        </CardFooter>
      </Card>
    </div>
  );
};

export default ShippingTab;
