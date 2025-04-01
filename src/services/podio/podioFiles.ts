
// Service for handling file uploads to Podio

// Import the renamed function from podioAuth
import { callPodioApi, hasValidTokens } from './podioAuth';

// Function to check if we should proceed without signature
export const shouldProceedWithoutSignature = (manualApproverName: string): boolean => {
  return !!manualApproverName && manualApproverName.trim().length > 0;
};

// Function to upload a file to Podio
export const uploadFileToPodio = async (file: File | string, filename?: string): Promise<number | null> => {
  try {
    // Check if we have valid Podio tokens
    if (!hasValidTokens()) {
      console.error('Not authenticated with Podio');
      return null;
    }
    
    // Create FormData to send the file
    const formData = new FormData();

    // Handle both File objects and data URLs (for signatures)
    if (typeof file === 'string' && file.startsWith('data:')) {
      // Convert data URL to Blob
      const response = await fetch(file);
      const blob = await response.blob();
      formData.append('filename', filename || 'signature.jpg');
      formData.append('source', blob);
    } else if (file instanceof File) {
      formData.append('filename', file.name);
      formData.append('source', file);
    } else {
      throw new Error('Invalid file format');
    }

    // Call the Podio API to upload the file
    const response = await callPodioApi('file/', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set the content-type with boundary for FormData
    });

    // Check if the upload was successful
    if (response && response.file_id) {
      console.log('File uploaded successfully:', response.file_id);
      return response.file_id;
    } else {
      console.error('File upload failed:', response);
      return null;
    }
  } catch (error) {
    console.error('Error uploading file to Podio:', error);
    return null;
  }
};
