
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface CategoryDisplayProps {
  categories: string | string[];
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | null;
  bgColor?: string;
}

const CategoryDisplay: React.FC<CategoryDisplayProps> = ({ 
  categories, 
  variant = 'outline',
  bgColor = 'bg-blue-50'
}) => {
  if (!categories) return null;
  
  const categoryArray = Array.isArray(categories) 
    ? categories 
    : categories.split(/[\/,;]\s*/);
  
  return (
    <div className="flex flex-wrap gap-2">
      {categoryArray.map((category, index) => (
        <Badge 
          key={index} 
          variant={variant} 
          className={`${bgColor} text-sm font-medium`}
        >
          {category.trim()}
        </Badge>
      ))}
    </div>
  );
};

export default CategoryDisplay;
