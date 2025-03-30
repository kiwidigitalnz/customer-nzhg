
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Truck, Layers, Package, FileText } from 'lucide-react';
import SpecSection from '../SpecSection';

interface ShippingTabProps {
  details: Record<string, any>;
}

const ShippingTab: React.FC<ShippingTabProps> = ({ details }) => {
  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Shipping Information */}
      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2 bg-muted/30">
          <CardTitle className="text-lg flex items-center">
            <Truck className="mr-2 h-5 w-5 text-primary/80" />
            Shipping Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Shipping Terms</h4>
                <p className="font-medium">{details.shippingTerms || "N/A"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Shipping Method</h4>
                <p className="font-medium">{details.shippingMethod || "N/A"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Carton Type</h4>
                <p className="font-medium">{details.cartonType || "N/A"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Pallet Type</h4>
                <p className="font-medium">{details.palletType || "N/A"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pallet Information */}
      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2 bg-muted/30">
          <CardTitle className="text-lg flex items-center">
            <Layers className="mr-2 h-5 w-5 text-primary/80" />
            Pallet Configuration
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
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Cartons per Pallet</h4>
                <p className="font-medium">{details.totalCartonsPerPallet || 
                  (details.cartonsPerLayer && details.layersPerPallet 
                    ? Number(details.cartonsPerLayer) * Number(details.layersPerPallet)
                    : "N/A")}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Pallet Specifications</h4>
                <p className="font-medium">{details.palletSpecifications || "N/A"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pallet Documents */}
      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2 bg-muted/30">
          <CardTitle className="text-lg flex items-center">
            <FileText className="mr-2 h-5 w-5 text-primary/80" />
            Pallet Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {details.palletDocuments ? (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="whitespace-pre-wrap">{details.palletDocuments}</p>
              </div>
            ) : (
              <p className="text-muted-foreground italic">No pallet documents specified</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShippingTab;
