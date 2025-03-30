
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Package, Box } from 'lucide-react';
import { formatTextContent } from '@/utils/formatters';

interface PackagingTabProps {
  details: Record<string, any>;
}

const PackagingTab: React.FC<PackagingTabProps> = ({ details }) => {
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
                <p className="font-medium">{details.jarSize || "N/A"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Jar Color</h4>
                <p className="font-medium">{details.jarColour || "N/A"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Jar Material</h4>
                <p className="font-medium">{details.jarMaterial || "N/A"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Jar Shape</h4>
                <p className="font-medium">{details.jarShape || "N/A"}</p>
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
                <p className="font-medium">{details.lidSize || "N/A"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Lid Color</h4>
                <p className="font-medium">{details.lidColour || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2 bg-muted/30">
          <CardTitle className="text-lg flex items-center">
            <Box className="mr-2 h-5 w-5 text-primary/80" />
            Other Packaging
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">On-The-Go Packaging</h4>
                <p className="font-medium">{details.onTheGoPackaging || "N/A"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Pouch Size</h4>
                <p className="font-medium">{details.pouchSize || "N/A"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Customised Carton Type</h4>
                <p className="font-medium">{details.customisedCartonType || "N/A"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Seal Instructions</h4>
                <p>{details.sealInstructions ? 
                  formatTextContent(details.sealInstructions) : 
                  "N/A"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PackagingTab;
