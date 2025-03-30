
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getImageUrl, getPodioImageAlternatives } from '@/utils/formatters';
import { ImageIcon, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';
import EnhancedImageViewer from './EnhancedImageViewer';
import { Button } from '@/components/ui/button';
import { extractPodioFileId } from '@/services/imageProxy';

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
  const [hasImageErrors, setHasImageErrors] = useState(false);
  const [alternativeUrls, setAlternativeUrls] = useState<Record<number, string[]>>({});
  const [currentUrlIndices, setCurrentUrlIndices] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState<Record<number, boolean>>({});
  
  useEffect(() => {
    console.log(`ImageGallery "${title}" received images:`, images);
    
    // Reset loading state for all images
    const loadingState: Record<number, boolean> = {};
    
    // Generate alternative URLs for each image
    const altUrls: Record<number, string[]> = {};
    
    if (images && images.length > 0) {
      images.forEach((img, idx) => {
        const url = getImageUrl(img);
        loadingState[idx] = !!url; // Set loading to true if URL exists
        
        if (url) {
          // Generate alternative URLs
          const alternatives = getPodioImageAlternatives(url);
          altUrls[idx] = alternatives;
        }
      });
    }
    
    setIsLoading(loadingState);
    setAlternativeUrls(altUrls);
    setHasImageErrors(false);
    setCurrentUrlIndices({});
  }, [images, title]);
  
  // Filter out invalid images - only include those we can get a URL for
  const validImages = (images && Array.isArray(images)) 
    ? images.filter(img => getImageUrl(img))
    : [];
  
  useEffect(() => {
    console.log(`Found ${validImages.length} valid images out of ${images?.length || 0} total for "${title}"`);
  }, [validImages, images, title]);
  
  // Get the current URL for a specific image
  const getCurrentUrl = (imageIndex: number) => {
    const primaryUrl = getImageUrl(validImages[imageIndex]);
    const urlIndex = currentUrlIndices[imageIndex] || -1;
    
    if (urlIndex === -1) return primaryUrl;
    
    const alternatives = alternativeUrls[imageIndex] || [];
    return alternatives[urlIndex] || primaryUrl;
  };
  
  // If no valid images, show placeholder
  if (!validImages || validImages.length === 0) {
    return (
      <div className="bg-muted/20 rounded-md p-8 flex flex-col items-center justify-center text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-2 opacity-30" />
        <p>{placeholderText || emptyMessage}</p>
        {images && images.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 rounded-md text-sm text-red-600 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Found {images.length} images but couldn't generate valid URLs</span>
          </div>
        )}
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
  
  const handleImageLoad = (idx: number) => {
    setIsLoading(prev => ({
      ...prev,
      [idx]: false
    }));
  };
  
  const handleImageError = (idx: number) => {
    console.error(`Thumbnail ${idx} failed to load:`, getCurrentUrl(idx));
    
    // Try the next alternative URL if available
    const alternatives = alternativeUrls[idx] || [];
    const currentUrlIndex = currentUrlIndices[idx] || -1;
    
    if (currentUrlIndex < alternatives.length - 1) {
      setCurrentUrlIndices(prev => ({
        ...prev,
        [idx]: (prev[idx] || -1) + 1
      }));
      console.log(`Trying alternative URL for image ${idx}:`, alternatives[currentUrlIndex + 1]);
    } else {
      // If we've tried all alternatives, mark as error
      setHasImageErrors(true);
    }
    
    setIsLoading(prev => ({
      ...prev,
      [idx]: false
    }));
  };
  
  // Extract file ID for current image for debugging
  const currentFileId = getCurrentUrl(currentIndex) ? extractPodioFileId(getCurrentUrl(currentIndex) || '') : null;
  
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
        {/* Debug info */}
        {currentFileId && (
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/80 rounded px-2 py-1 text-xs text-gray-600">
              ID: {currentFileId}
            </div>
          </div>
        )}
        
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
              {isLoading[idx] && (
                <div className="w-full h-full flex items-center justify-center bg-muted/30">
                  <RefreshCw className="h-4 w-4 text-primary/60 animate-spin" />
                </div>
              )}
              <img 
                src={getCurrentUrl(idx)} 
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={() => handleImageError(idx)}
                onLoad={() => handleImageLoad(idx)}
                style={{ display: isLoading[idx] ? 'none' : 'block' }}
              />
            </button>
          ))}
        </div>
      )}
      
      {hasImageErrors && (
        <div className="p-2 bg-yellow-50 rounded text-xs text-yellow-700 flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1 flex-shrink-0" />
          <span>Some images failed to load. Check console for details.</span>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
