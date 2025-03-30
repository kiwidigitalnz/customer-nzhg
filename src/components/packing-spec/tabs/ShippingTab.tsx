
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Truck, Layers, FileText } from 'lucide-react';

interface ShippingTabProps {
  details: Record<string, any>;
}

const ShippingTab: React.FC<ShippingTabProps> = ({ details }) => {
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
      </Card>
    </div>
  );
};

export default ShippingTab;
