
import React, { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tag, Printer, Sticker } from 'lucide-react';
import { formatTextContent } from '@/utils/formatters';
import ImageGallery from '../ImageGallery';

interface LabelingTabProps {
  details: Record<string, any>;
}

const LabelingTab: React.FC<LabelingTabProps> = ({ details }) => {
  // Extract label and shipper sticker images, handling both array and single item cases
  const labelImages = details.label ? (Array.isArray(details.label) ? details.label : [details.label]) : [];
  const shipperStickerImages = details.shipperSticker ? (Array.isArray(details.shipperSticker) ? details.shipperSticker : [details.shipperSticker]) : [];
  
  // Create URL-based image objects if we have valid URLs
  const labelUrlObj = details.labelUrl ? { url: details.labelUrl, isUrl: true } : null;
  const shipperStickerUrlObj = details.shipperStickerUrl ? { url: details.shipperStickerUrl, isUrl: true } : null;
  
  // Combine direct images with URL-based images
  const allLabelImages = labelUrlObj ? [...labelImages, labelUrlObj] : labelImages;
  const allShipperStickerImages = shipperStickerUrlObj ? [...shipperStickerImages, shipperStickerUrlObj] : shipperStickerImages;
  
  useEffect(() => {
    console.log('LabelingTab loaded with images:', {
      label: allLabelImages,
      labelUrl: details.labelUrl,
      shipperSticker: allShipperStickerImages,
      shipperStickerUrl: details.shipperStickerUrl
    });
  }, [allLabelImages, allShipperStickerImages, details.labelUrl, details.shipperStickerUrl]);
  
  return (
    <div className="space-y-6 animate-in fade-in-50">
      <div className="grid grid-cols-1 gap-6">
        {/* Product Label Information */}
        <Card className="shadow-sm border-muted">
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
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Label URL</h4>
                  {details.labelUrl ? (
                    <a 
                      href={details.labelUrl} 
                      className="text-primary hover:underline flex items-center" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      View Label URL
                    </a>
                  ) : (
                    <p className="text-muted-foreground italic">No URL provided</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Label Link</h4>
                  {details.labelLink ? (
                    <a 
                      href={typeof details.labelLink === 'object' ? details.labelLink?.url || '' : details.labelLink} 
                      className="text-primary hover:underline flex items-center" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      View Label Design
                    </a>
                  ) : (
                    <p className="text-muted-foreground italic">No link provided</p>
                  )}
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
              </div>
              
              <div className="md:col-span-2 mt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Label Images</h4>
                <ImageGallery 
                  images={allLabelImages} 
                  title="Label" 
                  emptyMessage="No label images available"
                  placeholderText="Label images would be displayed here when available"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Printing Information */}
        <Card className="shadow-sm border-muted">
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
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Printing Information Located</h4>
                  <p className="font-medium">{details.printingInfoLocation || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Printing Colour</h4>
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
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Shipper Sticker Information */}
        <Card className="shadow-sm border-muted">
          <CardHeader className="pb-2 bg-muted/30">
            <CardTitle className="text-lg flex items-center">
              <Sticker className="mr-2 h-5 w-5 text-primary/80" />
              Shipper Sticker Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Number of Shipper Stickers on Carton</h4>
                  <p className="font-medium">{details.shipperStickerCount || "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Shipper Sticker URL</h4>
                  {details.shipperStickerUrl ? (
                    <a 
                      href={details.shipperStickerUrl} 
                      className="text-primary hover:underline flex items-center" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      View Shipper Sticker
                    </a>
                  ) : (
                    <p className="text-muted-foreground italic">No URL provided</p>
                  )}
                </div>
              </div>
              
              <div className="md:col-span-2 mt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Shipper Sticker Images</h4>
                <ImageGallery 
                  images={allShipperStickerImages} 
                  title="Shipper Sticker" 
                  emptyMessage="No shipper sticker images available"
                  placeholderText="Shipper sticker images would be displayed here when available"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LabelingTab;
