
import React, { useState, useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Search, X, Move, AlertTriangle, ExternalLink } from 'lucide-react';
import { getImageUrl } from '@/utils/formatters';

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
  
  // Reset zoom and position when dialog opens/closes
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setImgError(false);
  };
  
  // Log image info for debugging
  useEffect(() => {
    console.log('EnhancedImageViewer received image:', image);
    console.log('Generated image URL:', imageUrl);
    
    if (typeof image === 'object') {
      console.log('Image object properties:', Object.keys(image));
      if (image.file_id) {
        console.log('File ID from image:', image.file_id);
        console.log('URL constructed:', `https://files.podio.com/d/${image.file_id}`);
      }
    }
  }, [image, imageUrl]);
  
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
    console.error('Image failed to load:', imageUrl);
    console.log('Raw image data:', image);
    setImgError(true);
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
              src={imageUrl} 
              alt={alt} 
              className="w-full object-contain max-h-64 transition-all rounded-lg" 
              onError={handleImageError}
              ref={imgRef}
            />
            {imgError && (
              <div className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center text-red-500 p-4">
                <AlertTriangle className="h-8 w-8 mb-2" />
                <p className="text-xs text-center">Failed to load image</p>
                <p className="text-xs text-center mt-1 font-mono break-all">{imageUrl}</p>
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
          {imgError ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-red-500 p-8">
              <AlertTriangle className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">Failed to load image</p>
              <div className="mt-4 p-4 bg-gray-100 rounded-md w-full max-w-md overflow-auto">
                <p className="text-xs font-mono break-all">{imageUrl}</p>
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
              </div>
            </div>
          ) : (
            <img 
              src={imageUrl} 
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
            <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={scale <= 0.5 || imgError}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={scale >= 3 || imgError}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center">
            {scale > 1 && !imgError && (
              <span className="flex items-center text-xs text-muted-foreground mr-2">
                <Move className="h-3 w-3 mr-1" />
                Drag to move
              </span>
            )}
            <Button variant="secondary" size="sm" onClick={resetView} disabled={(scale === 1 && position.x === 0 && position.y === 0) || imgError}>
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
