
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Package, Box, Container } from 'lucide-react';
import { formatTextContent } from '@/utils/formatters';
import SectionApproval from '../SectionApproval';
import { useSectionApproval } from '@/contexts/SectionApprovalContext';

interface PackagingTabProps {
  details: Record<string, any>;
  onApproveSection?: (section: string) => Promise<void>;
  onRequestChanges?: (section: string, comments: string) => Promise<void>;
  onNavigateToNextTab?: () => void;
}

const PackagingTab: React.FC<PackagingTabProps> = ({ 
  details,
  onApproveSection,
  onRequestChanges,
  onNavigateToNextTab
}) => {
  const { sectionStates, updateSectionStatus } = useSectionApproval();
  
  const getFieldValue = (fieldKey: string, alternateKeys: string[] = []) => {
    if (details[fieldKey]) return details[fieldKey];
    
    for (const altKey of alternateKeys) {
      if (details[altKey]) return details[altKey];
    }
    
    return "N/A";
  };
  
  const lidColour = getFieldValue('lidColour', ['lidColor']);

  const handleApprove = async () => {
    if (onApproveSection) {
      await onApproveSection('packaging');
    }
    updateSectionStatus('packaging', 'approved');
    
    if (onNavigateToNextTab) {
      onNavigateToNextTab();
    }
  };
  
  const handleRequestChanges = async (section: string, comments: string) => {
    if (onRequestChanges) {
      await onRequestChanges(section, comments);
    }
    updateSectionStatus('packaging', 'changes-requested', comments);
    
    if (onNavigateToNextTab) {
      onNavigateToNextTab();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-muted">
          <CardHeader className="pb-2 bg-muted/30">
            <CardTitle className="text-lg flex items-center">
              <Package className="mr-2 h-5 w-5 text-primary/80" />
              Jar Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Jar Size</h4>
                <p className="font-medium">{getFieldValue('jarSize')}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Jar Colour</h4>
                <p className="font-medium">{getFieldValue('jarColour', ['jarColor'])}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Jar Material</h4>
                <p className="font-medium">{getFieldValue('jarMaterial')}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Jar Shape</h4>
                <p className="font-medium">{getFieldValue('jarShape')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-muted">
          <CardHeader className="pb-2 bg-muted/30">
            <CardTitle className="text-lg flex items-center">
              <Package className="mr-2 h-5 w-5 text-primary/80" />
              Lid Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Lid Size</h4>
                <p className="font-medium">{getFieldValue('lidSize')}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Lid Colour</h4>
                <p className="font-medium">{lidColour}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Seal Instructions</h4>
                <p>{details.sealInstructions ? 
                  formatTextContent(details.sealInstructions) : 
                  "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2 bg-muted/30">
          <CardTitle className="text-lg flex items-center">
            <Box className="mr-2 h-5 w-5 text-primary/80" />
            Portable Packaging
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">On-The-Go Packaging</h4>
                <p className="font-medium">{getFieldValue('onTheGoPackaging')}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Pouch Size</h4>
                <p className="font-medium">{getFieldValue('pouchSize')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2 bg-muted/30">
          <CardTitle className="text-lg flex items-center">
            <Container className="mr-2 h-5 w-5 text-primary/80" />
            Carton Packaging
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Carton Size</h4>
                <p className="font-medium">{getFieldValue('shipperSize')}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Customised Carton Type</h4>
                <p className="font-medium">{getFieldValue('customisedCartonType')}</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-end">
          <SectionApproval
            sectionName="Packaging"
            onApproveSection={handleApprove}
            onRequestChanges={handleRequestChanges}
            onNavigateToNextTab={onNavigateToNextTab}
          />
        </CardFooter>
      </Card>
    </div>
  );
};

export default PackagingTab;
