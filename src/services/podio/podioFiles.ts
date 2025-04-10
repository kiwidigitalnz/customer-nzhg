
import { callPodioApi, PACKING_SPEC_FIELD_IDS } from './podioAuth';

/**
 * Uploads a file to a Podio item, specifically for the packing spec
 * @param itemId The Podio item ID to attach the file to
 * @param file The file to upload
 * @returns The file ID of the uploaded file
 */
export const uploadFileToPodio = async (itemId: number, file: File): Promise<number> => {
  try {
    console.log(`Uploading file to Podio item ${itemId}...`);
    console.log(`File details: name=${file.name}, size=${file.size}bytes, type=${file.type}`);
    
    // Create FormData for the file upload
    const formData = new FormData();
    formData.append('file', file);
    
    // First step: Upload the file to Podio's general file storage
    const uploadResponse = await callPodioApi('/file', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type; browser will set with boundary for FormData
      },
    });
    
    if (!uploadResponse || !uploadResponse.file_id) {
      console.error('Upload response from Podio:', uploadResponse);
      throw new Error('Failed to upload file to Podio');
    }
    
    const fileId = uploadResponse.file_id;
    console.log(`File uploaded successfully to Podio with file ID: ${fileId}`);
    
    // Second step: Attach the file to the item's signature field
    // Find the correct field ID for signature
    const signatureFieldId = PACKING_SPEC_FIELD_IDS?.signature;
    
    if (!signatureFieldId) {
      console.error('Signature field ID not found in configuration');
      return fileId; // Return the file ID even if we can't attach it to the specific field
    }
    
    console.log(`Attaching file ID ${fileId} to signature field ID ${signatureFieldId}`);
    
    // Attach the file to the specific field
    const attachResponse = await callPodioApi(`/item/${itemId}/value/${signatureFieldId}`, {
      method: 'PUT',
      body: JSON.stringify({
        value: fileId
      })
    });
    
    console.log('File attached to signature field successfully:', attachResponse);
    
    return fileId;
  } catch (error) {
    console.error('Error uploading file to Podio:', error);
    throw error;
  }
};

/**
 * Determines if we should proceed with approval if the signature upload fails
 * @returns boolean indicating if we should proceed without a signature
 */
export const shouldProceedWithoutSignature = (): boolean => {
  // For now, always return true to avoid blocking the approval process
  // This can be enhanced with config options in the future
  return true;
};
