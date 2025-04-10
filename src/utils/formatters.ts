
import { format } from 'date-fns';
import { extractPodioFileId, createProxyImageUrl } from '../services/imageProxy';

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
 * Safely formats text content by removing HTML tags while preserving line breaks
 */
export const formatTextContent = (content?: string | null): string => {
  if (!content) return '';
  
  // Ensure content is a string before attempting to use string methods
  if (typeof content !== 'string') {
    // If it's an object, try to convert it to a string
    if (typeof content === 'object') {
      try {
        return formatTextContent(JSON.stringify(content));
      } catch (e) {
        console.warn('Failed to stringify object in formatTextContent:', e);
        return '';
      }
    }
    // Try to convert other types to string
    try {
      return String(content);
    } catch (e) {
      console.warn('Failed to convert content to string in formatTextContent:', e);
      return '';
    }
  }
  
  // Now we can safely use string methods
  // Replace <br>, <p>, and other common tags with newlines first
  let processed = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<\/div>\s*<div>/gi, '\n')
    .replace(/<\/li>\s*<li>/gi, '\n• ');
  
  // Remove the remaining HTML tags
  processed = processed.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  processed = processed
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Normalize whitespace (collapse multiple spaces but preserve line breaks)
  processed = processed.replace(/[ \t]+/g, ' ');
  
  // Trim leading/trailing whitespace
  return processed.trim();
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
 * Handles Podio image format using our proxy service for authenticated access
 */
export const getImageUrl = (image: any): string | null => {
  if (!image) return null;
  
  console.log('Getting image URL for:', image);
  
  // Extract the file ID first regardless of format
  let fileId: string | number | null = null;
  
  // Direct file ID as string or number
  if (typeof image === 'string') {
    if (/^\d+$/.test(image)) {
      fileId = image;
    } else {
      // Try to extract ID from URL
      fileId = extractPodioFileId(image);
      
      // If we couldn't extract an ID, just return the string as-is
      // (might be non-Podio URL)
      if (!fileId) return image;
    }
  }
  // Handle arrays - extract first valid image
  else if (Array.isArray(image)) {
    for (const item of image) {
      const url = getImageUrl(item);
      if (url) return url;
    }
    return null;
  }
  // Object with Podio file data
  else if (typeof image === 'object') {
    // Extract file ID and use a consistent format
    fileId = image.file_id || image.id || 
             (image.hosted_by === 'podio' && image.hosted_by_id) ||
             (image.value && image.value.file_id);
    
    // If no file ID found but URL exists, return the URL
    if (!fileId) {
      if (image.url) {
        const extractedId = extractPodioFileId(image.url);
        if (extractedId) {
          fileId = extractedId;
        } else {
          return image.url; // Non-Podio URL
        }
      }
      else if (image.value && image.value.link) {
        const extractedId = extractPodioFileId(image.value.link);
        if (extractedId) {
          fileId = extractedId;
        } else {
          return image.value.link; // Non-Podio URL
        }
      }
      else if (image.link) {
        const extractedId = extractPodioFileId(image.link);
        if (extractedId) {
          fileId = extractedId;
        } else {
          return image.link; // Non-Podio URL
        }
      }
      
      // Check for values array with file data (common in Podio API responses)
      if (image.values && Array.isArray(image.values) && image.values.length > 0) {
        // Try to extract file info from values
        for (const val of image.values) {
          if (val.file) {
            if (val.file.file_id) {
              fileId = val.file.file_id;
              break;
            }
            
            if (val.file.link) {
              const extractedId = extractPodioFileId(val.file.link);
              if (extractedId) {
                fileId = extractedId;
                break;
              } else {
                return val.file.link; // Non-Podio URL
              }
            }
          }
        }
      }
    }
  }
  
  // If we have a file ID, create proxy URL
  if (fileId) {
    const proxyUrl = createProxyImageUrl(fileId);
    console.log(`Created proxy URL for file ID ${fileId}:`, proxyUrl);
    return proxyUrl;
  }
  
  return null;
};

/**
 * Generate alternative Podio URLs to try if the main one fails
 */
export const getPodioImageAlternatives = (primaryUrl: string | null): string[] => {
  if (!primaryUrl) return [];
  
  const alternatives: string[] = [];
  
  // Check if it's already a proxy URL
  if (primaryUrl.startsWith('/api/podio-image/')) {
    // Already using our proxy, no alternatives needed
    return [];
  }
  
  // Extract file ID using our utility
  const fileId = extractPodioFileId(primaryUrl);
  if (!fileId) return [];
  
  // Add some variations for potential ID interpretations
  // Sometimes Podio might have different IDs for the same file
  alternatives.push(createProxyImageUrl(fileId));
  
  // Try with different number formats if it's a large number
  // (sometimes API returns different formats)
  if (fileId.length > 8) {
    // Try truncating leading zeros
    const numericId = parseInt(fileId, 10);
    if (!isNaN(numericId) && numericId.toString() !== fileId) {
      alternatives.push(createProxyImageUrl(numericId));
    }
  }
  
  return alternatives.filter(url => url !== primaryUrl);
};

/**
 * Format multiline text with proper line breaks
 */
export const formatMultilineText = (text?: string): string => {
  if (!text) return '';
  
  // Use our formatTextContent function
  return formatTextContent(text);
};
