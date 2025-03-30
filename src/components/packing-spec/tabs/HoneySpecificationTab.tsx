
import React from 'react';
import { Package, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import CategoryDisplay from '../CategoryDisplay';
import { formatTextContent } from '@/utils/formatters';

interface HoneySpecificationTabProps {
  details: Record<string, any>;
}

const HoneySpecificationTab: React.FC<HoneySpecificationTabProps> = ({ details }) => {
  return (
    <div className="space-y-6 animate-in fade-in-50">
      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2 bg-muted/30">
          <CardTitle className="text-lg flex items-center">
            <Package className="mr-2 h-5 w-5 text-primary/80" />
            Honey Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Honey Type</h4>
                <p className="font-medium">{details.honeyType || "N/A"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">UMF/MGO</h4>
                <p className="font-medium">{details.umfMgo || "N/A"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Allergen Type</h4>
                <div className="mt-1">
                  {details.allergenType ? (
                    <CategoryDisplay 
                      categories={details.allergenType} 
                      variant="outline"
                      bgColor="bg-red-50"
                    />
                  ) : (
                    <span className="text-muted-foreground italic">N/A</span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Ingredient Type</h4>
                <div className="mt-1">
                  {details.ingredientType ? (
                    <CategoryDisplay 
                      categories={details.ingredientType} 
                      variant="outline"
                      bgColor="bg-green-50"
                    />
                  ) : (
                    <span className="text-muted-foreground italic">N/A</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {details.customerRequestedChanges && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-amber-800">
              <AlertCircle className="mr-2 h-5 w-5 text-amber-600" />
              Requested Changes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-amber-800">{formatTextContent(details.customerRequestedChanges)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HoneySpecificationTab;
