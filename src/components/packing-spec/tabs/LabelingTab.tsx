
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Pen, ExternalLink, Tag, Package, Printer, Sticker } from 'lucide-react';
import { formatTextContent } from '@/utils/formatters';
import ImageGallery from '../ImageGallery';
import EnhancedImageViewer from '../EnhancedImageViewer';

interface LabelingTabProps {
  details: Record<string, any>;
}

const LabelingTab: React.FC<LabelingTabProps> = ({ details }) => {
  // Convert single label to array for consistency
  const labelImages = details.label ? (Array.isArray(details.label) ? details.label : [details.label]) : [];
  const cartonLabelImages = details.cartonLabel ? (Array.isArray(details.cartonLabel) ? details.cartonLabel : [details.cartonLabel]) : [];
  
  return (
    <div className="space-y-6 animate-in fade-in-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Label Information */}
        <Card className="shadow-sm border-muted md:col-span-2">
          <CardHeader className="pb-2 bg-muted/30">
            <CardTitle className="text-lg flex items-center">
              <Tag className="mr-2 h-5 w-5 text-primary/80" />
              Product Label Information
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
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Size</h4>
                  <p className="font-medium">{details.labelSize || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Materials</h4>
                  <p className="font-medium">{details.labelMaterials || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Placement</h4>
                  <p className="font-medium">{details.labelPlacement || "N/A"}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Specification</h4>
                  <p>{details.labelSpecification ? 
                    formatTextContent(details.labelSpecification) : 
                    "N/A"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Special Requirements</h4>
                  <p className="font-medium">{details.labelSpecialRequirements || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Finishing Type</h4>
                  <p className="font-medium">{details.labelFinishingType || "N/A"}</p>
                </div>
              </div>
              
              {labelImages.length > 0 && (
                <div className="md:col-span-2 mt-4">
                  <ImageGallery 
                    images={labelImages} 
                    title="Product Label Images" 
                    emptyMessage="No product label images available"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Carton Label Information */}
        <Card className="shadow-sm border-muted md:col-span-2">
          <CardHeader className="pb-2 bg-muted/30">
            <CardTitle className="text-lg flex items-center">
              <Package className="mr-2 h-5 w-5 text-primary/80" />
              Carton Label Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Carton Label Code</h4>
                  <p className="font-medium">{details.cartonLabelCode || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Carton Label Size</h4>
                  <p className="font-medium">{details.cartonLabelSize || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Carton Label Placement</h4>
                  <p className="font-medium">{details.cartonLabelPlacement || "N/A"}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Carton Label Requirements</h4>
                  <p className="font-medium">{details.cartonLabelRequirements || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Carton Label Notes</h4>
                  <p className="font-medium">{details.cartonLabelNotes || "N/A"}</p>
                </div>
              </div>
              
              {cartonLabelImages.length > 0 && (
                <div className="md:col-span-2 mt-4">
                  <ImageGallery 
                    images={cartonLabelImages} 
                    title="Carton Label Images" 
                    emptyMessage="No carton label images available"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Printing Information */}
        <Card className="shadow-sm border-muted md:col-span-2">
          <CardHeader className="pb-2 bg-muted/30">
            <CardTitle className="text-lg flex items-center">
              <Printer className="mr-2 h-5 w-5 text-primary/80" />
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
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Printing Method</h4>
                  <p className="font-medium">{details.printingMethod || "N/A"}</p>
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
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Date Placement</h4>
                  <p className="font-medium">{details.datePlacement || "N/A"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Barcodes */}
        <Card className="shadow-sm border-muted md:col-span-2">
          <CardHeader className="pb-2 bg-muted/30">
            <CardTitle className="text-lg flex items-center">
              <Sticker className="mr-2 h-5 w-5 text-primary/80" />
              Barcode Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Barcode Type</h4>
                  <p className="font-medium">{details.barcodeType || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Barcode Value</h4>
                  <p className="font-medium">{details.barcodeValue || "N/A"}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Barcode Placement</h4>
                  <p className="font-medium">{details.barcodePlacement || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Carton Barcode</h4>
                  <p className="font-medium">{details.cartonBarcode || "N/A"}</p>
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
