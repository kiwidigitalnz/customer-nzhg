/**
 * Image proxy service for Podio files
 * Handles authenticated requests to Podio's file API
 */

import { callPodioApi, refreshPodioToken } from './podioApi';

interface ImageData {
  blob: Blob;
  contentType: string;
}

/**
 * Fetches a file from Podio by its ID
 * Returns the file data as a blob that can be displayed directly
 */
export const getFileFromPodio = async (fileId: string | number): Promise<ImageData> => {
  if (!fileId) {
    throw new Error('File ID is required');
  }
  
  console.log(`Fetching Podio file with ID: ${fileId}`);
  
  // Simply attempt to refresh the token if needed - we no longer check validity
  try {
    await refreshPodioToken();
  } catch (error) {
    console.error('Failed to refresh Podio token:', error);
    // Continue anyway as the token might still be valid
  }
  
  try {
    // Use the official Podio API to get the file
    const accessToken = localStorage.getItem('podio_access_token');
    
    // Direct fetch with proper authorization
    const response = await fetch(`https://api.podio.com/file/${fileId}/raw`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    // Get content type for proper header
    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    
    // Get file as blob and return it
    const blob = await response.blob();
    return { blob, contentType };
  } catch (error) {
    console.error('Error fetching file from Podio:', error);
    throw error;
  }
};

/**
 * Extract file ID from various Podio URL formats
 */
export const extractPodioFileId = (url: string): string | null => {
  if (!url) return null;
  
  // Try different regex patterns to extract file ID
  const patterns = [
    /\/d\/(\d+)$/,        // https://files.podio.com/d/12345
    /\/(\d+)$/,           // https://files.podio.com/12345
    /file\/(\d+)/,        // https://podio.com/file/12345
    /\/get\/(\d+)/,       // https://files.podio.com/get/12345
    /^(\d+)$/             // Just the ID itself
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

/**
 * Create a proxy URL for our API
 */
export const createProxyImageUrl = (fileId: string | number): string => {
  return `/api/podio-image/${fileId}`;
};
