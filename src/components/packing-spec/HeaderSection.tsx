
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Calendar, Book } from 'lucide-react';
import { formatDate } from '@/utils/formatters';
import StatusBadge, { SpecStatus } from './StatusBadge';

interface HeaderSectionProps {
  title: string;
  productCode?: string;
  versionNumber?: string;
  dateReviewed?: string;
  status: SpecStatus;
}

const HeaderSection: React.FC<HeaderSectionProps> = ({ 
  title, 
  productCode, 
  versionNumber, 
  dateReviewed, 
  status 
}) => {
  // Format version to have only 1 decimal place
  const formatVersion = (version: string | undefined) => {
    if (!version) return "N/A";
    
    // Check if version is a number with decimals
    if (!isNaN(parseFloat(version))) {
      return parseFloat(version).toFixed(1);
    }
    
    return version;
  };

  return (
    <CardHeader className="pb-3 bg-card/95">
      <div className="flex flex-wrap justify-between items-start gap-2">
        <div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
            {productCode && (
              <span className="inline-flex items-center">
                <FileText className="h-3.5 w-3.5 mr-1 text-muted-foreground" /> 
                Code: {productCode}
              </span>
            )}
            {versionNumber && (
              <span className="inline-flex items-center">
                <Book className="h-3.5 w-3.5 mr-1 text-muted-foreground" /> 
                Version: {formatVersion(versionNumber)}
              </span>
            )}
            {dateReviewed && (
              <span className="inline-flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" /> 
                Updated: {formatDate(dateReviewed)}
              </span>
            )}
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <StatusBadge status={status} showIcon={false} />
        </div>
      </div>
    </CardHeader>
  );
};

export default HeaderSection;
