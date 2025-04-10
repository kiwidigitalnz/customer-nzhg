
import React from 'react';
import { getImageUrl } from '@/utils/formatters';
import { ImageIcon } from 'lucide-react';
import EnhancedImageViewer from './EnhancedImageViewer';

interface ImagePreviewProps {
  image: any;
  alt: string;
  maxHeight?: string;
  placeholderText?: string;
}

/**
 * Component for displaying image previews with fallback
 */
const ImagePreview: React.FC<ImagePreviewProps> = ({ 
  image, 
  alt, 
  maxHeight = "max-h-80",
  placeholderText = "No image available"
}) => {
  // Handle both direct URL objects and Podio image objects
  const imageUrl = image?.isUrl ? image.url : getImageUrl(image);
  
  if (!imageUrl) {
    return (
      <div className="bg-muted/20 rounded-md p-8 flex flex-col items-center justify-center text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-2 opacity-30" />
        <p>{placeholderText}</p>
      </div>
    );
  }
  
  // For direct URL-based images, show a simple image
  if (image?.isUrl) {
    return (
      <div className="bg-muted/20 rounded-md p-4 flex justify-center">
        <a 
          href={imageUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`block ${maxHeight} overflow-hidden`}
        >
          <img 
            src={imageUrl} 
            alt={alt}
            className={`object-contain ${maxHeight} max-w-full mx-auto`}
          />
        </a>
      </div>
    );
  }
  
  // For Podio images, use the EnhancedImageViewer
  return (
    <div className="bg-muted/20 rounded-md p-4 flex justify-center">
      <EnhancedImageViewer image={image} alt={alt} />
    </div>
  );
};

export default ImagePreview;
