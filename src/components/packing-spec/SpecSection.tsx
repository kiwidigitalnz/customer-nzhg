
import React from 'react';
import { hasValue } from '@/utils/formatters';
import CategoryDisplay from './CategoryDisplay';
import { CountryFlagsList } from './CountryFlag';

interface AttributeDefinition {
  key: string;
  label: string;
  fieldType?: 'text' | 'date' | 'html' | 'image' | 'link' | 'category' | 'country';
}

interface SpecSectionProps {
  title: string;
  attributes: AttributeDefinition[];
  data: Record<string, any>;
  icon?: React.ReactNode;
  renderValue?: (value: any, fieldType?: string) => React.ReactNode;
}

/**
 * A reusable component for displaying a section of specification attributes
 */
const SpecSection: React.FC<SpecSectionProps> = ({
  title,
  attributes,
  data,
  icon,
  renderValue
}) => {
  // Filter attributes that have values
  const attributesWithValues = attributes.filter(attr => 
    hasValue(data[attr.key])
  );
  
  // If no attributes have values, don't render the section
  if (attributesWithValues.length === 0) return null;
  
  // Default renderer if not provided
  const defaultRenderValue = (value: any, fieldType?: string) => {
    if (value === undefined || value === null) return null;
    
    switch (fieldType) {
      case 'category':
        return <CategoryDisplay categories={value} />;
      case 'country':
        return <CountryFlagsList countries={value} />;
      default:
        return typeof value === 'string' ? value : JSON.stringify(value);
    }
  };
  
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium flex items-center">
        {icon && <span className="mr-2">{icon}</span>}
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {attributesWithValues.map(({key, label, fieldType}) => {
          const value = data[key];
          
          return (
            <div key={key} className="flex flex-col">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="font-medium">
                {renderValue ? renderValue(value, fieldType) : defaultRenderValue(value, fieldType)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpecSection;
