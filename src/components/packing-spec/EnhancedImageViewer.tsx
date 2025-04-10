import React, { useState, useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, Search, X, Move, AlertTriangle, ExternalLink, Image, RefreshCw, Maximize, Download } from 'lucide-react';
import { getImageUrl, getPodioImageAlternatives } from '@/utils/formatters';
import { extractPodioFileId } from '@/services/imageProxy';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EnhancedImageViewerProps {
  image: any;
  alt: string;
  title?: string;
  maxHeight?: string;
  className?: string;
}

const EnhancedImageViewer: React.FC<EnhancedImageViewerProps> = ({ 
  image, 
  alt,
  title,
  maxHeight = "max-h-64",
  className = ""
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [alternativeUrls, setAlternativeUrls] = useState<string[]>([]);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(-1); // -1 means using the primary URL
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  
  useEffect(() => {
    const url = image?.isUrl ? image.url : getImageUrl(image);
    setImageUrl(url);
    setIsLoading(!!url);
    
    console.log('EnhancedImageViewer received image:', image);
    console.log('Generated primary image URL:', url);
    
    if (typeof image === 'object') {
      console.log('Image object properties:', Object.keys(image));
      if (image.file_id) {
        console.log('File ID from image:', image.file_id);
      }
    }
    
    if (url) {
      const alternatives = getPodioImageAlternatives(url);
      setAlternativeUrls(alternatives);
      console.log('Generated alternative URLs:', alternatives);
    }
  }, [image]);
  
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setImgError(false);
    setCurrentUrlIndex(-1);
    setIsPlaceholder(false);
  };
  
  const getCurrentUrl = () => {
    if (currentUrlIndex === -1) return imageUrl;
    return alternativeUrls[currentUrlIndex];
  };
  
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 5));
  };
  
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };
  
  const handleZoomSlider = (value: number[]) => {
    setScale(value[0]);
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
      setFullscreen(false);
    }
  };
  
  const handleImageError = () => {
    const currentUrl = getCurrentUrl();
    console.error('Image failed to load:', currentUrl);
    
    if (currentUrlIndex < alternativeUrls.length - 1) {
      setCurrentUrlIndex(prevIndex => prevIndex + 1);
      console.log('Trying alternative URL:', alternativeUrls[currentUrlIndex + 1]);
    } else {
      console.log('All alternative URLs failed. Showing error state.');
      setImgError(true);
    }
    
    setIsLoading(false);
  };
  
  const handleImageLoad = () => {
    setIsLoading(false);
    setImgError(false);
  };
  
  const tryRefreshImage = () => {
    setImgError(false);
    setIsLoading(true);
    setCurrentUrlIndex(-1);
    
    if (imageUrl && imageUrl.includes('/api/podio-image/')) {
      const refreshedUrl = `${imageUrl}?t=${Date.now()}`;
      setImageUrl(refreshedUrl);
    }
  };
  
  const tryPlaceholder = () => {
    setIsPlaceholder(true);
    setImgError(false);
    setIsLoading(false);
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    if (open) {
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      const newScale = Math.max(0.5, Math.min(5, scale + delta));
      setScale(newScale);
    }
  };
  
  const toggleFullscreen = () => {
    if (containerRef.current) {
      setFullscreen(!fullscreen);
      
      if (!fullscreen) {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }
  };
  
  const downloadImage = () => {
    const url = getCurrentUrl();
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${alt || 'image'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  if (!imageUrl) {
    return (
      <div className="bg-muted/20 rounded-md p-8 flex flex-col items-center justify-center text-muted-foreground">
        <Image className="h-12 w-12 mb-2 opacity-30" />
        <p>No image available</p>
      </div>
    );
  }
  
  const fileId = imageUrl ? extractPodioFileId(imageUrl) : null;
  
  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <div className={`relative group cursor-pointer hover:opacity-95 ${className}`}>
          {isLoading && !imgError && !isPlaceholder && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <div className="flex flex-col items-center">
                <RefreshCw className="h-8 w-8 text-primary/60 animate-spin" />
                <p className="text-xs text-muted-foreground mt-2">Loading image...</p>
              </div>
            </div>
          )}
          
          <img 
            src={getCurrentUrl() || ''} 
            alt={alt} 
            className={`w-full object-contain rounded-lg ${maxHeight} transition-all`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            ref={imgRef}
            style={{ display: isLoading || imgError || isPlaceholder ? 'none' : 'block' }}
          />
          
          {imgError && (
            <div className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center text-red-500 p-4">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p className="text-xs text-center">Failed to load image</p>
              {fileId && (
                <p className="text-xs text-center mt-1 font-mono">File ID: {fileId}</p>
              )}
            </div>
          )}
          
          {isPlaceholder && (
            <div className="w-full h-64 flex flex-col items-center justify-center bg-muted/30 p-4">
              <Image className="h-16 w-16 text-muted-foreground/40 mb-2" />
              <p className="text-muted-foreground text-center text-sm">Placeholder image</p>
            </div>
          )}
          
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Search className="h-8 w-8 text-white drop-shadow-md" />
          </div>
        </div>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden" onWheel={handleWheel}>
        <DialogHeader className="p-4 border-b flex flex-row justify-between items-center">
          <DialogTitle>{title || alt}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={toggleFullscreen} title="Toggle fullscreen">
              <Maximize className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={downloadImage} title="Download image">
              <Download className="h-4 w-4" />
            </Button>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </div>
        </DialogHeader>
        
        <div 
          className="flex-1 overflow-hidden relative bg-black/5"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          ref={containerRef}
          style={{ cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default' }}
        >
          {isLoading && !imgError && !isPlaceholder && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <RefreshCw className="h-16 w-16 text-primary/60 animate-spin" />
                <p className="text-muted-foreground mt-4">Loading image...</p>
              </div>
            </div>
          )}
          
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
                <p className="text-xs font-mono break-all">Current URL: {getCurrentUrl()}</p>
                {fileId && (
                  <div className="mt-2 text-xs">
                    <p>File ID: {fileId}</p>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm mb-2">Options:</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={tryRefreshImage}
                    className="mb-2 w-full flex items-center justify-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry loading image
                  </Button>
                  
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
                        setIsLoading(true);
                      }}
                      className="mb-2 w-full text-xs"
                    >
                      Try alternative format {idx + 1}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <img 
              src={getCurrentUrl() || ''} 
              alt={alt} 
              className="max-h-[70vh] w-auto mx-auto object-contain transition-transform"
              style={{ 
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transformOrigin: 'center',
                willChange: 'transform',
                display: isLoading ? 'none' : 'block'
              }}
              draggable="false"
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          )}
        </div>
        
        <div className="p-3 border-t flex justify-between items-center gap-2 bg-muted/20">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={scale <= 0.5 || imgError || isPlaceholder || isLoading}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <div className="w-40 hidden md:block">
              <Slider
                defaultValue={[1]}
                min={0.5}
                max={5}
                step={0.1}
                value={[scale]}
                onValueChange={handleZoomSlider}
                disabled={imgError || isPlaceholder || isLoading}
              />
            </div>
            
            <span className="px-2 text-sm">{Math.round(scale * 100)}%</span>
            
            <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={scale >= 5 || imgError || isPlaceholder || isLoading}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center">
            {scale > 1 && !imgError && !isPlaceholder && !isLoading && (
              <span className="hidden md:flex items-center text-xs text-muted-foreground mr-2">
                <Move className="h-3 w-3 mr-1" />
                Drag to move
              </span>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:flex">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Open
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-3">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Image options</h3>
                  <a 
                    href={getCurrentUrl() || ''}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Open in new tab
                  </a>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadImage}
                    className="w-full text-sm justify-start"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Download image
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="secondary" size="sm" onClick={resetView} disabled={(scale === 1 && position.x === 0 && position.y === 0 && !imgError && !isPlaceholder)}>
              Reset View
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedImageViewer;
