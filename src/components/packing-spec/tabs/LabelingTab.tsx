
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Pen, ExternalLink } from 'lucide-react';
import { formatTextContent } from '@/utils/formatters';
import ImagePreview from '../ImagePreview';

interface LabelingTabProps {
  details: Record<string, any>;
}

const LabelingTab: React.FC<LabelingTabProps> = ({ details }) => {
  return (
    <div className="space-y-6 animate-in fade-in-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-muted md:col-span-2">
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
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Link</h4>
                  {details.labelLink ? (
                    <a 
                      href={details.labelLink} 
                      className="text-primary hover:underline flex items-center" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      View Label Design <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  ) : (
                    <p className="text-muted-foreground italic">No link provided</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Specification</h4>
                  <p>{details.labelSpecification ? 
                    formatTextContent(details.labelSpecification) : 
                    "N/A"}
                  </p>
                </div>
              </div>
              
              {details.label && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Preview</h4>
                  <div className="bg-white rounded-md border overflow-hidden">
                    <ImagePreview image={details.label} alt="Label Preview" maxHeight="max-h-80" />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-muted md:col-span-2">
          <CardHeader className="pb-2 bg-muted/30">
            <CardTitle className="text-lg flex items-center">
              <Pen className="mr-2 h-5 w-5 text-primary/80" />
              Printing Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Printing Info Location</h4>
                  <p className="font-medium">{details.printingInfoLocated || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Printing Color</h4>
                  <p className="font-medium">{details.printingColour || "N/A"}</p>
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
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LabelingTab;
