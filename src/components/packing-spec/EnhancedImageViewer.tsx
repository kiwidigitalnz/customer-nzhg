
import React, { useState, useRef, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, Search, Move, AlertTriangle, ExternalLink, Image, RefreshCw, Maximize, Download, X } from 'lucide-react';
import { getImageUrl, getPodioImageAlternatives } from '@/utils/formatters';
import { extractPodioFileId } from '@/services/imageProxy';
import { 
  TooltipProvider, 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent 
} from '@/components/ui/tooltip';

interface EnhancedImageViewerProps {
  image: any;
  alt: string;
  title?: string;
  maxHeight?: string;
  className?: string;
}

// Define position interface for pan functionality
interface Position {
  x: number;
  y: number;
}

// Helper to determine if a URL is from Podio
const isPodioUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('podio.com') || url.includes('d2slcw3kip6qmk.cloudfront.net');
};

const EnhancedImageViewer: React.FC<EnhancedImageViewerProps> = ({
  image,
  alt,
  title,
  maxHeight = "max-h-80",
  className = ""
}) => {
  // State for the image viewer
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [alternativeUrls, setAlternativeUrls] = useState<string[]>([]);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(-1);
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  
  // Get the image URL, handling both direct URL objects and Podio image objects
  const imageUrl = React.useMemo(() => {
    if (!image) return null;
    return image?.isUrl ? image.url : getImageUrl(image);
  }, [image]);
  
  // Get alternative URLs for Podio images
  useEffect(() => {
    if (image && !image.isUrl && imageUrl) {
      // Check if this is a Podio image by examining the URL
      if (typeof imageUrl === 'string' && isPodioUrl(imageUrl)) {
        try {
          // Extract alternatives from the image object
          const alternatives = getPodioImageAlternatives(imageUrl);
          setAlternativeUrls(alternatives);
        } catch (e) {
          console.error('Error extracting alternative URLs:', e);
          setAlternativeUrls([]);
        }
      }
    }
  }, [image, imageUrl]);
  
  // Function to get the current URL to display
  const getCurrentUrl = (): string => {
    if (currentUrlIndex >= 0 && currentUrlIndex < alternativeUrls.length) {
      return alternativeUrls[currentUrlIndex];
    }
    return imageUrl || '';
  };
  
  // Function to cycle through available URLs
  const cycleUrl = () => {
    if (alternativeUrls.length > 0) {
      setCurrentUrlIndex((prev) => {
        const next = (prev + 1) % (alternativeUrls.length + 1);
        return next === alternativeUrls.length ? -1 : next;
      });
      // Reset zoom and position when changing URLs
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };
  
  // Reset image when dialog opens or closes
  useEffect(() => {
    if (!open) {
      // Reset zoom and position when closing
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setCurrentUrlIndex(-1); // Reset to primary URL
    } else {
      // Reset loading state when opening
      setIsLoading(true);
      setIsPlaceholder(false);
    }
  }, [open]);
  
  // Handle image loading states
  const handleImageLoad = () => {
    setIsLoading(false);
    setIsPlaceholder(false);
  };
  
  const handleImageError = () => {
    setIsLoading(false);
    setIsPlaceholder(true);
    
    // Try alternative URL if available
    if (alternativeUrls.length > 0 && currentUrlIndex === -1) {
      setCurrentUrlIndex(0);
    }
  };
  
  // Zoom functions
  const zoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.25, 5));
  };
  
  const zoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.25, 0.5));
  };
  
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };
  
  // Download function
  const downloadImage = () => {
    const url = getCurrentUrl();
    if (!url) return;
    
    // Create an anchor and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = extractFilenameFromUrl(url);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  // Helper to extract filename from URL
  const extractFilenameFromUrl = (url: string): string => {
    try {
      // Try to get filename from URL
      const parts = url.split('/');
      let filename = parts[parts.length - 1];
      
      // Remove query parameters if any
      if (filename.includes('?')) {
        filename = filename.split('?')[0];
      }
      
      // If extraction failed, use a default name
      if (!filename || filename.trim() === '') {
        filename = `image-${Date.now()}.jpg`;
      }
      
      return filename;
    } catch (e) {
      return `image-${Date.now()}.jpg`;
    }
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!fullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen(); // Safari support
      } else if ((containerRef.current as any).msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen(); // IE/Edge support
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen(); // Safari support
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen(); // IE/Edge support
      }
    }
  };
  
  // Effect to listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
    document.addEventListener('MSFullscreenChange', handleFullscreenChange); // IE/Edge
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);
  
  // Wheel event handler for zooming
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    }
  };
  
  // Touch event handling for mobile devices
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Two-finger gesture - prepare for pinch/zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1 && scale > 1) {
      // Single finger - prepare for panning when zoomed in
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent default to stop browser gestures
    
    if (e.touches.length === 2 && lastTouchDistance !== null) {
      // Handle pinch gesture for zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const delta = distance - lastTouchDistance;
      if (Math.abs(delta) > 5) { // Threshold to avoid jittery zooming
        if (delta > 0) {
          setScale(prev => Math.min(prev + 0.05, 5));
        } else {
          setScale(prev => Math.max(prev - 0.05, 0.5));
        }
        setLastTouchDistance(distance);
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Handle single finger panning when zoomed in
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.x;
      const dy = touch.clientY - dragStart.y;
      
      setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: touch.clientX, y: touch.clientY });
    }
  };
  
  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouchDistance(null);
  };
  
  // Mouse handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Handle keyboard for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case '+':
      case '=':
        zoomIn();
        break;
      case '-':
        zoomOut();
        break;
      case '0':
        resetZoom();
        break;
      case 'Escape':
        setOpen(false);
        break;
      default:
        break;
    }
  };
  
  // Main render
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div 
          className={`cursor-pointer ${className}`} 
          onClick={() => setOpen(true)}
        >
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={alt}
              className={`w-auto mx-auto ${maxHeight} object-contain rounded-md`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            <div className="flex items-center justify-center bg-muted h-40 rounded-md">
              <Image className="h-12 w-12 text-muted-foreground opacity-40" />
            </div>
          )}
        </div>
      </DialogTrigger>
      
      <DialogContent 
        className="max-w-6xl max-h-[95vh] w-[95vw] flex flex-col p-0 gap-0 overflow-hidden" 
        onWheel={handleWheel}
        hideCloseButton={true}
      >
        <DialogHeader className="p-4 border-b flex flex-row justify-between items-center">
          <DialogTitle>{title || alt}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={toggleFullscreen} title="Toggle fullscreen">
              <Maximize className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={downloadImage} title="Download image">
              <Download className="h-4 w-4" />
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        
        <div 
          className="flex-1 overflow-hidden relative bg-black/5 dark:bg-white/5" 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Render placeholder for loading or error states */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading image...</p>
              </div>
            </div>
          )}
          
          {isPlaceholder && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
              <div className="text-center p-4">
                <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
                <p className="text-muted-foreground mb-2">Unable to load image</p>
                {alternativeUrls.length > 0 && (
                  <Button variant="outline" size="sm" onClick={cycleUrl}>
                    Try alternative format
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* The actual image */}
          <img 
            ref={imgRef}
            src={getCurrentUrl()} 
            alt={alt} 
            className="w-auto h-auto max-h-[75vh] mx-auto my-auto object-contain transition-transform"
            style={{ 
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transformOrigin: 'center',
              cursor: scale > 1 ? 'move' : 'default',
              opacity: isPlaceholder ? 0 : 1,
              display: isLoading ? 'none' : 'block',
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
            draggable="false"
          />
        </div>
        
        {/* Toolbar at the bottom */}
        <div className="p-3 border-t bg-muted/10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={zoomOut} disabled={scale <= 0.5}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Zoom out</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <div className="w-24 md:w-48">
                <Slider 
                  value={[scale]} 
                  min={0.5} 
                  max={5} 
                  step={0.1} 
                  onValueChange={(vals) => setScale(vals[0])}
                />
              </div>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={zoomIn} disabled={scale >= 5}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Zoom in</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <span className="text-sm text-muted-foreground hidden md:inline-block ml-2">
                {Math.round(scale * 100)}%
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {alternativeUrls.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={cycleUrl}
                  className="text-xs flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Switch Format
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetZoom}
                className="text-xs"
                disabled={scale === 1 && position.x === 0 && position.y === 0}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedImageViewer;
