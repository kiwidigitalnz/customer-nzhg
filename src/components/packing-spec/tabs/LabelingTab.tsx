
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SectionApproval from '../SectionApproval';
import { useSectionApproval } from '@/contexts/SectionApprovalContext';
import EnhancedImageViewer from '../EnhancedImageViewer';
import ImagePreview from '../ImagePreview';
import { formatTextContent } from '@/utils/formatters';

interface LabelingTabProps {
  details: Record<string, any>;
  onApproveSection?: (section: string) => Promise<void>;
  onRequestChanges?: (section: string, comments: string) => Promise<void>;
  onNavigateToNextTab?: () => void;
}

const LabelingTab: React.FC<LabelingTabProps> = ({ 
  details,
  onApproveSection,
  onRequestChanges,
  onNavigateToNextTab
}) => {
  const { sectionStates, updateSectionStatus } = useSectionApproval();
  
  const handleApprove = async () => {
    if (onApproveSection) {
      await onApproveSection('Label');
    }
    updateSectionStatus('label', 'approved');
    
    // Navigate to next tab after approval is complete
    if (onNavigateToNextTab) {
      onNavigateToNextTab();
    }
  };
  
  const handleRequestChanges = async (section: string, comments: string) => {
    if (onRequestChanges) {
      await onRequestChanges(section, comments);
    }
    updateSectionStatus('label', 'changes-requested', comments);
    
    // Navigate to next tab after changes are requested
    if (onNavigateToNextTab) {
      onNavigateToNextTab();
    }
  };

  // Create image objects for EnhancedImageViewer
  const labelImage = details.labelUrl || details.labelLink 
    ? { isUrl: true, url: details.labelUrl || details.labelLink } 
    : null;
    
  const shipperStickerImage = details.shipperStickerUrl 
    ? { isUrl: true, url: details.shipperStickerUrl } 
    : null;

  // Safely format specification text - ensure we're passing values that can be converted to strings
  const labelSpecification = formatTextContent(details.labelSpecification);

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
                <p className="font-medium">{formatTextContent(details.labelCode) || "N/A"}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Specification</h4>
                <p className="font-medium whitespace-pre-line">{labelSpecification || "N/A"}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Printing Information Location</h4>
                <p className="font-medium">{formatTextContent(details.printingInfoLocation) || "N/A"}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Printing Color</h4>
                <p className="font-medium">{formatTextContent(details.printingColor || details.printingColour) || "N/A"}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Required Best Before Date</h4>
                <p className="font-medium">{formatTextContent(details.requiredBestBeforeDate) || "N/A"}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Date Formatting</h4>
                <p className="font-medium">{formatTextContent(details.dateFormatting) || "N/A"}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Preview</h4>
                {labelImage ? (
                  <div className="mt-2">
                    <EnhancedImageViewer 
                      image={labelImage}
                      alt="Label Preview" 
                      title="Label Preview"
                      maxHeight="max-h-60"
                      className="w-full"
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No label preview available</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
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
                <p className="font-medium">{formatTextContent(details.shipperSticker) || "N/A"}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Number of Shipper Stickers on Carton</h4>
                <p className="font-medium">{formatTextContent(details.shipperStickerCount) || "N/A"}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Shipper Sticker Preview</h4>
                {shipperStickerImage ? (
                  <div className="mt-2">
                    <EnhancedImageViewer
                      image={shipperStickerImage}
                      alt="Shipper Sticker Preview"
                      title="Shipper Sticker Preview" 
                      maxHeight="max-h-60"
                      className="w-full"
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No sticker preview available</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-end">
          <SectionApproval
            sectionName="Labeling"
            onApproveSection={handleApprove}
            onRequestChanges={handleRequestChanges}
            onNavigateToNextTab={onNavigateToNextTab}
          />
        </CardFooter>
      </Card>
    </div>
  );
};

export default LabelingTab;
