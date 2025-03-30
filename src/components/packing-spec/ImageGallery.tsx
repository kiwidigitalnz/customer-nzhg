
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getImageUrl } from '@/utils/formatters';
import { ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import EnhancedImageViewer from './EnhancedImageViewer';
import { Button } from '@/components/ui/button';

interface ImageGalleryProps {
  images: any[];
  title: string;
  emptyMessage?: string;
  placeholderText?: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ 
  images, 
  title,
  emptyMessage = "No images available",
  placeholderText
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Filter out invalid images
  const validImages = images && Array.isArray(images) ? images.filter(img => getImageUrl(img)) : [];
  
  if (!validImages || validImages.length === 0) {
    return (
      <div className="bg-muted/20 rounded-md p-8 flex flex-col items-center justify-center text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-2 opacity-30" />
        <p>{placeholderText || emptyMessage}</p>
      </div>
    );
  }
  
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev + 1) % validImages.length);
  };
  
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev - 1 + validImages.length) % validImages.length);
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        {validImages.length > 1 && (
          <div className="text-xs text-muted-foreground">
            {currentIndex + 1} / {validImages.length}
          </div>
        )}
      </div>
      
      <div className="relative group">
        <EnhancedImageViewer 
          image={validImages[currentIndex]} 
          alt={`${title} ${currentIndex + 1}`}
          title={`${title} (${currentIndex + 1}/${validImages.length})`}
        />
        
        {validImages.length > 1 && (
          <>
            <Button
              variant="outline" 
              size="icon"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous image</span>
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next image</span>
            </Button>
          </>
        )}
      </div>
      
      {validImages.length > 1 && (
        <div className="flex gap-1 overflow-x-auto py-1 scrollbar-hide">
          {validImages.map((img, idx) => (
            <button
              key={idx}
              className={`flex-shrink-0 w-16 h-16 border rounded overflow-hidden ${
                idx === currentIndex ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'
              }`}
              onClick={() => setCurrentIndex(idx)}
            >
              <img 
                src={getImageUrl(img)} 
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
