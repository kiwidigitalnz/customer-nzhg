
/**
 * Image proxy service for Podio files
 * Handles authenticated requests to Podio's file API
 */

import { callPodioApi, hasValidPodioTokens, refreshPodioToken } from './podioApi';

/**
 * Fetches a file from Podio by its ID
 * Returns the file data as a blob URL that can be displayed in the UI
 */
export const getFileFromPodio = async (fileId: string | number): Promise<string> => {
  if (!fileId) {
    throw new Error('File ID is required');
  }
  
  console.log(`Fetching Podio file with ID: ${fileId}`);
  
  // Ensure we have valid tokens
  if (!hasValidPodioTokens() && !await refreshPodioToken()) {
    throw new Error('Not authenticated with Podio API');
  }
  
  try {
    // Use the official Podio API to get the file (not a direct URL request)
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
    
    // Get file as blob and create a URL
    const blob = await response.blob();
    return URL.createObjectURL(blob);
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
