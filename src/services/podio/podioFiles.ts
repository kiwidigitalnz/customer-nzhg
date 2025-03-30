
// This module handles file uploads to Podio

import { callPodioApi, hasValidPodioTokens, refreshPodioToken } from './podioAuth';

interface FileUploadResponse {
  file_id: number;
}

// Upload a file to Podio
export const uploadFileToPodio = async (fileDataUrl: string, fileName: string): Promise<number | null> => {
  try {
    if (!hasValidPodioTokens() && !await refreshPodioToken()) {
      throw new Error('Not authenticated with Podio API');
    }
    
    console.log(`Preparing to upload file: ${fileName}`);
    
    // Convert data URL to blob
    const response = await fetch(fileDataUrl);
    const blob = await response.blob();
    
    // Create FormData object
    const formData = new FormData();
    formData.append('file', blob, fileName);
    // Add source parameter that was missing from previous implementation
    formData.append('source', 'web');
    
    // Use direct fetch with proper headers instead of relying on callPodioApi
    // The upload endpoint is different from regular API endpoints
    const accessToken = localStorage.getItem('podio_access_token');
    
    if (!accessToken) {
      throw new Error('Missing Podio access token');
    }
    
    console.log('Attempting to upload file to Podio API...');
    const uploadResponse = await fetch('https://api.podio.com/file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      console.error('Podio upload error response:', errorData);
      console.error('Status:', uploadResponse.status, uploadResponse.statusText);
      
      if (uploadResponse.status === 404) {
        throw new Error('Podio file upload endpoint not found. The API may have changed.');
      } else if (uploadResponse.status === 400) {
        // This is likely an API parameter issue
        console.error('API validation error, likely missing required parameter in the request');
        throw new Error('File upload failed: API validation error');
      } else if (uploadResponse.status === 401) {
        // Try to refresh token and retry once
        if (await refreshPodioToken()) {
          return uploadFileToPodio(fileDataUrl, fileName);
        } else {
          throw new Error('Unauthorized access to Podio file upload API');
        }
      } else {
        throw new Error(`Podio file upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }
    }
    
    const fileData = await uploadResponse.json() as FileUploadResponse;
    console.log('File uploaded successfully with ID:', fileData.file_id);
    return fileData.file_id;
  } catch (error) {
    console.error('Error uploading file to Podio:', error);
    
    // Implement fallback mechanism - if we can't upload the signature,
    // we should still allow the user to approve the spec without a signature
    console.log('Implementing fallback: approval will proceed without signature');
    return null;
  }
};

// Fallback function to handle approvals without signatures
export const shouldProceedWithoutSignature = (error: any): boolean => {
  // Determine if we should proceed with approval even if signature upload failed
  console.log('Checking if approval should proceed without signature');
  return true; // Allow approval to proceed even if signature upload fails
};
