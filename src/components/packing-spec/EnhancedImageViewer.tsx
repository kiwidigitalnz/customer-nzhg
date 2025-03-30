
import React, { useState, useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Search, X, Move, AlertTriangle, ExternalLink, Image } from 'lucide-react';
import { getImageUrl, getPodioImageAlternatives } from '@/utils/formatters';

interface EnhancedImageViewerProps {
  image: any;
  alt: string;
  title?: string;
}

const EnhancedImageViewer: React.FC<EnhancedImageViewerProps> = ({ 
  image, 
  alt,
  title
}) => {
  const imageUrl = getImageUrl(image);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [alternativeUrls, setAlternativeUrls] = useState<string[]>([]);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(-1); // -1 means using the primary URL
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  
  // Reset zoom and position when dialog opens/closes
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setImgError(false);
    setCurrentUrlIndex(-1);
    setIsPlaceholder(false);
  };
  
  // Generate alternative URLs when the main one is set
  useEffect(() => {
    if (imageUrl) {
      const alternatives = getPodioImageAlternatives(imageUrl);
      setAlternativeUrls(alternatives);
      console.log('Generated alternative URLs:', alternatives);
    }
  }, [imageUrl]);
  
  // Log image info for debugging
  useEffect(() => {
    console.log('EnhancedImageViewer received image:', image);
    console.log('Generated primary image URL:', imageUrl);
    
    if (typeof image === 'object') {
      console.log('Image object properties:', Object.keys(image));
      if (image.file_id) {
        console.log('File ID from image:', image.file_id);
        console.log('URL constructed:', `https://files.podio.com/d/${image.file_id}`);
      }
    }
  }, [image, imageUrl]);
  
  // Get the current URL to display
  const getCurrentUrl = () => {
    if (currentUrlIndex === -1) return imageUrl;
    return alternativeUrls[currentUrlIndex];
  };
  
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };
  
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ 
        x: e.clientX - position.x, 
        y: e.clientY - position.y 
      });
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetView();
    }
  };
  
  const handleImageError = () => {
    const currentUrl = getCurrentUrl();
    console.error('Image failed to load:', currentUrl);
    
    // Try the next alternative URL if available
    if (currentUrlIndex < alternativeUrls.length - 1) {
      setCurrentUrlIndex(prevIndex => prevIndex + 1);
      console.log('Trying alternative URL:', alternativeUrls[currentUrlIndex + 1]);
    } else {
      // If we've tried all alternatives, show error state
      console.log('All alternative URLs failed. Showing error state.');
      setImgError(true);
    }
  };
  
  const tryPlaceholder = () => {
    setIsPlaceholder(true);
    setImgError(false);
  };
  
  if (!imageUrl) return null;
  
  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          className="p-0 h-auto w-full hover:bg-transparent block rounded-lg overflow-hidden border border-input"
        >
          <div className="relative group">
            <img 
              src={getCurrentUrl()} 
              alt={alt} 
              className="w-full object-contain max-h-64 transition-all rounded-lg" 
              onError={handleImageError}
              ref={imgRef}
            />
            {imgError && (
              <div className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center text-red-500 p-4">
                <AlertTriangle className="h-8 w-8 mb-2" />
                <p className="text-xs text-center">Failed to load image</p>
                <p className="text-xs text-center mt-1 font-mono break-all">{getCurrentUrl()}</p>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Search className="h-8 w-8 text-white drop-shadow-md" />
            </div>
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{title || alt}</DialogTitle>
        </DialogHeader>
        
        <div 
          className="flex-1 overflow-hidden relative bg-black/5"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          style={{ cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default' }}
        >
          {isPlaceholder ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 p-12">
              <Image className="h-32 w-32 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground text-center">Placeholder image</p>
            </div>
          ) : imgError ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-red-500 p-8">
              <AlertTriangle className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">Failed to load image</p>
              <div className="mt-4 p-4 bg-gray-100 rounded-md w-full max-w-md overflow-auto">
                <p className="text-xs font-mono break-all">{getCurrentUrl()}</p>
                {typeof image === 'object' && image.file_id && (
                  <div className="mt-2 text-xs">
                    <p>File ID: {image.file_id}</p>
                    <a 
                      href={`https://files.podio.com/d/${image.file_id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center mt-2"
                    >
                      Try direct Podio link <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm mb-2">Alternative options:</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={tryPlaceholder}
                    className="mb-2 w-full"
                  >
                    Show placeholder image
                  </Button>
                  
                  {alternativeUrls.length > 0 && alternativeUrls.map((url, idx) => (
                    <Button 
                      key={idx}
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setCurrentUrlIndex(idx);
                        setImgError(false);
                      }}
                      className="mb-2 w-full text-xs"
                    >
                      Try URL format {idx + 1}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <img 
              src={getCurrentUrl()} 
              alt={alt} 
              className="max-h-[70vh] w-auto mx-auto object-contain transition-transform"
              style={{ 
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transformOrigin: 'center',
                willChange: 'transform',
              }}
              draggable="false"
              onError={handleImageError}
            />
          )}
        </div>
        
        <div className="p-3 border-t flex justify-between items-center gap-2 bg-muted/20">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={scale <= 0.5 || imgError || isPlaceholder}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={scale >= 3 || imgError || isPlaceholder}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center">
            {scale > 1 && !imgError && !isPlaceholder && (
              <span className="flex items-center text-xs text-muted-foreground mr-2">
                <Move className="h-3 w-3 mr-1" />
                Drag to move
              </span>
            )}
            <Button variant="secondary" size="sm" onClick={resetView} disabled={(scale === 1 && position.x === 0 && position.y === 0 && !imgError && !isPlaceholder)}>
              Reset View
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDialogChange(false)} className="ml-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedImageViewer;
