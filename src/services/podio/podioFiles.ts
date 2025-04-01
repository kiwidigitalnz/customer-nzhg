// Service for handling file uploads to Podio

// Import the renamed function from podioAuth
import { callPodioApi, hasValidPodioTokens } from '../podioApi';

// Function to upload a file to Podio
export const uploadFileToPodio = async (file: File): Promise<number | null> => {
  try {
    // Check if we have valid Podio tokens
    if (!hasValidPodioTokens()) {
      console.error('Not authenticated with Podio');
      return null;
    }

    // Create FormData to send the file
    const formData = new FormData();
    formData.append('filename', file.name);
    formData.append('source', file);

    // Call the Podio API to upload the file
    const response = await callPodioApi('file/', {
      method: 'POST',
      body: formData,
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
