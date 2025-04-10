
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SectionApproval from '../SectionApproval';
import { useSectionApproval } from '@/contexts/SectionApprovalContext';

interface LabelingTabProps {
  details: Record<string, any>;
  onApproveSection?: (section: string) => Promise<void>;
  onRequestChanges?: (section: string, comments: string) => Promise<void>;
}

const LabelingTab: React.FC<LabelingTabProps> = ({ 
  details,
  onApproveSection,
  onRequestChanges
}) => {
  const { sectionStates, updateSectionStatus } = useSectionApproval();
  const sectionStatus = sectionStates.label.status;
  
  const handleApprove = async () => {
    if (onApproveSection) {
      await onApproveSection('label');
    }
    updateSectionStatus('label', 'approved');
  };
  
  const handleRequestChanges = async (section: string, comments: string) => {
    if (onRequestChanges) {
      await onRequestChanges(section, comments);
    }
    updateSectionStatus('label', 'changes-requested', comments);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50">
      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2 bg-muted/30">
          <CardTitle className="text-lg flex items-center">
            <FileText className="mr-2 h-5 w-5 text-primary/80" />
            Label Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Code</h4>
                <p className="font-medium">{details.labelCode || "N/A"}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Specification</h4>
                <p className="font-medium">{details.labelSpecification || "N/A"}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Printing Information Location</h4>
                <p className="font-medium">{details.printingInfoLocation || "N/A"}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Printing Color</h4>
                <p className="font-medium">{details.printingColor || details.printingColour || "N/A"}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Required Best Before Date</h4>
                <p className="font-medium">{details.requiredBestBeforeDate || "N/A"}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Date Formatting</h4>
                <p className="font-medium">{details.dateFormatting || "N/A"}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Preview</h4>
                {details.labelUrl || details.labelLink ? (
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(details.labelUrl || details.labelLink, '_blank')}
                      className="flex items-center gap-1"
                    >
                      View Label <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No label preview available</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-end">
          <SectionApproval
            sectionName="Labeling"
            status={sectionStatus}
            onApprove={handleApprove}
            onRequestChanges={handleRequestChanges}
          />
        </CardFooter>
      </Card>
      
      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2 bg-muted/30">
          <CardTitle className="text-lg flex items-center">
            <FileText className="mr-2 h-5 w-5 text-primary/80" />
            Shipper Sticker Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Shipper Sticker</h4>
                <p className="font-medium">{details.shipperSticker || "N/A"}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Number of Shipper Stickers on Carton</h4>
                <p className="font-medium">{details.shipperStickerCount || "N/A"}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Shipper Sticker Preview</h4>
                {details.shipperStickerUrl ? (
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(details.shipperStickerUrl, '_blank')}
                      className="flex items-center gap-1"
                    >
                      View Sticker <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No sticker preview available</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LabelingTab;
