
import { format } from 'date-fns';

/**
 * Formats date strings
 */
export const formatDate = (dateString?: string) => {
  if (!dateString) return 'Not specified';
  try {
    return format(new Date(dateString), 'PPP');
  } catch (e) {
    return dateString;
  }
};

/**
 * Safely formats text content by removing HTML tags
 */
export const formatTextContent = (content?: string) => {
  if (!content) return '';
  
  // Remove HTML tags if present
  return content.replace(/<[^>]*>/g, ' ').trim();
};

/**
 * Helper to check if a value exists and is not empty
 */
export const hasValue = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'object') {
    if (Array.isArray(value)) return value.length > 0;
    return Object.keys(value).length > 0;
  }
  return true;
};

/**
 * Safely gets the URL from various image field formats
 * Handles Podio image format which can be:
 * - String URL directly
 * - Object with url property
 * - Object with value property containing URL
 * - Podio file object with file_id
 * - Array of any of the above
 */
export const getImageUrl = (image: any): string | null => {
  if (!image) return null;
  
  // Direct URL as string
  if (typeof image === 'string') return image;
  
  // Handle arrays - extract first valid image
  if (Array.isArray(image)) {
    for (const item of image) {
      const url = getImageUrl(item);
      if (url) return url;
    }
    return null;
  }
  
  // Object with url property
  if (typeof image === 'object') {
    // Check for standard URL property
    if (image.url) return image.url;
    
    // Check for value.link property (Podio format)
    if (image.value && image.value.link) return image.value.link;
    
    // Check for embedded link property
    if (image.link) return image.link;
    
    // Check for hosted_by and hosted_by_id (Podio format)
    if (image.hosted_by === 'podio' && image.hosted_by_id) {
      return `https://files.podio.com/${image.hosted_by_id}`;
    }
    
    // Check for file_id which needs to be constructed into a proper Podio URL
    if (image.file_id) {
      // Construct a proper URL for Podio files that works with their download service
      return `https://files.podio.com/${image.file_id}`;
    }
    
    // Check if it's a Podio reference with ID
    if (image.id) {
      // For Podio embedded files
      return `https://files.podio.com/${image.id}`;
    }
    
    // Check for values array with file data (common in Podio API responses)
    if (image.values && Array.isArray(image.values) && image.values.length > 0) {
      // Try to extract file info from values
      for (const val of image.values) {
        if (val.file) {
          if (val.file.file_id) {
            return `https://files.podio.com/${val.file.file_id}`;
          }
          
          if (val.file.link) {
            return val.file.link;
          }
        }
      }
    }
  }
  
  return null;
};

/**
 * Format multiline text with proper line breaks
 */
export const formatMultilineText = (text?: string): string => {
  if (!text) return '';
  
  // First remove HTML tags
  const cleanText = formatTextContent(text);
  
  // Replace newlines with <br> for JSX
  return cleanText.replace(/\n/g, '\n');
};
