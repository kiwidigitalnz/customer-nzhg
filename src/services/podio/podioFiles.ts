
import { callPodioApi } from './podioAuth';

// Upload a file to Podio
export const uploadFileToPodio = async (fileDataUrl: string, fileName: string): Promise<number | null> => {
  try {
    // Extract the base64 part from the data URL
    const base64Data = fileDataUrl.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid file data');
    }
    
    // Convert base64 to binary
    const binaryData = atob(base64Data);
    
    // Create a typed array from the binary data
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    
    // Create a Blob from the binary data
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    
    // Create FormData with the blob
    const formData = new FormData();
    formData.append('file', blob, fileName);
    
    // Use stub mode for now, but prepared for real implementation
    console.log('Mock file upload:', fileName);
    
    // In a real implementation, we would call the Podio API:
    // const response = await callPodioApi('/file', {
    //   method: 'POST',
    //   body: formData
    // });
    // return response.file_id;
    
    // Return a mock file ID
    return 12345;
  } catch (error) {
    console.error('Error uploading file to Podio:', error);
    throw error;
  }
};

// Helper function to determine if we should proceed without a signature
export const shouldProceedWithoutSignature = (error: any): boolean => {
  // Check if the error is related to file upload but not critical
  if (error && typeof error.message === 'string') {
    const errorMsg = error.message.toLowerCase();
    
    // Non-critical file upload errors
    if (errorMsg.includes('file') && 
        (errorMsg.includes('format') || 
         errorMsg.includes('size') || 
         errorMsg.includes('upload'))) {
      return true;
    }
  }
  
  return false;
};
