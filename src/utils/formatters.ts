
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
 */
export const getImageUrl = (image: any): string | null => {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (typeof image === 'object' && image.url) return image.url;
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
