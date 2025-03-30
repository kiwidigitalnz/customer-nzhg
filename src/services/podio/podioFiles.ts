
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
    
    // Upload the file
    const uploadResponse = await fetch('https://api.podio.com/file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('podio_access_token')}`,
      },
      body: formData,
    });
    
    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to Podio');
    }
    
    const fileData = await uploadResponse.json() as FileUploadResponse;
    return fileData.file_id;
  } catch (error) {
    console.error('Error uploading file to Podio:', error);
    throw new Error('Failed to upload file to Podio');
  }
};
