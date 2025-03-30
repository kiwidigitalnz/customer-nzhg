
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clipboard, Globe, ShieldCheck } from 'lucide-react';
import { formatTextContent } from '@/utils/formatters';
import CategoryDisplay from '../CategoryDisplay';
import { CountryFlagsList } from '../CountryFlag';

interface RequirementsTabProps {
  details: Record<string, any>;
}

const RequirementsTab: React.FC<RequirementsTabProps> = ({ details }) => {
  return (
    <div className="space-y-6 animate-in fade-in-50">
      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-2 bg-muted/30">
          <CardTitle className="text-lg flex items-center">
            <Clipboard className="mr-2 h-5 w-5 text-primary/80" />
            Customer Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Customer Specifications</h4>
              <div className="bg-muted/20 p-3 rounded-md">
                {details.customerRequirements ? (
                  <p>{formatTextContent(details.customerRequirements)}</p>
                ) : (
                  <p className="text-muted-foreground italic">No specific customer requirements provided</p>
                )}
              </div>
            </div>
            
            <Separator className="my-5" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                  <Globe className="mr-1.5 h-4 w-4" />
                  Countries of Eligibility
                </h4>
                <div className="flex flex-wrap gap-2">
                  {details.countryOfEligibility ? (
                    <CountryFlagsList 
                      countries={details.countryOfEligibility} 
                      variant="outline"
                      bgColor="bg-blue-50"
                    />
                  ) : (
                    <span className="text-muted-foreground italic">Not specified</span>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                  <Globe className="mr-1.5 h-4 w-4" />
                  Other Markets
                </h4>
                <div className="flex flex-wrap gap-2">
                  {details.otherMarkets ? (
                    <CountryFlagsList 
                      countries={details.otherMarkets} 
                      variant="outline"
                      bgColor="bg-green-50"
                    />
                  ) : (
                    <span className="text-muted-foreground italic">Not specified</span>
                  )}
                </div>
              </div>
            </div>
            
            <Separator className="my-5" />
            
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                Testing Requirements
              </h4>
              <div className="bg-muted/20 p-3 rounded-md">
                {details.testingRequirements ? (
                  <div className="mt-1">
                    <CategoryDisplay 
                      categories={details.testingRequirements} 
                      variant="secondary"
                      bgColor="bg-violet-50"
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No specific testing requirements provided</p>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                Regulatory Requirements
              </h4>
              <div className="bg-muted/20 p-3 rounded-md">
                {details.regulatoryRequirements ? (
                  <div className="mt-1">
                    <CategoryDisplay 
                      categories={details.regulatoryRequirements} 
                      variant="secondary"
                      bgColor="bg-amber-50"
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No specific regulatory requirements provided</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequirementsTab;
