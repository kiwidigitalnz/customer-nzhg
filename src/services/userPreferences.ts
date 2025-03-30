// Service to handle user preferences, including signature storage

interface UserSignature {
  dataUrl: string;
  name: string;
  timestamp: number;
}

/**
 * Save a user's signature for reuse in approvals
 * @param dataUrl Signature image as data URL
 * @param name Name associated with the signature
 * @returns boolean indicating success
 */
export const saveUserSignature = (dataUrl: string, name: string): boolean => {
  try {
    // Save the current signature
    const signature: UserSignature = {
      dataUrl,
      name,
      timestamp: Date.now()
    };
    
    // Store in localStorage
    localStorage.setItem('user_signature', JSON.stringify(signature));
    
    // Keep a history of signatures (up to 5)
    const signatureHistory = getUserSignatureHistory();
    
    // Add current signature to history if it's not already there (compare by image data)
    const exists = signatureHistory.some(sig => sig.dataUrl === dataUrl);
    
    if (!exists) {
      // Add to beginning of array
      signatureHistory.unshift(signature);
      
      // Keep only the 5 most recent signatures
      const trimmedHistory = signatureHistory.slice(0, 5);
      
      // Save the updated history
      localStorage.setItem('user_signature_history', JSON.stringify(trimmedHistory));
    }
    
    return true;
  } catch (error) {
    console.error('Error saving user signature:', error);
    return false;
  }
};

/**
 * Get the user's most recently saved signature
 * @returns The signature object or null if none exists
 */
export const getUserSignature = (): UserSignature | null => {
  try {
    const signature = localStorage.getItem('user_signature');
    return signature ? JSON.parse(signature) : null;
  } catch (error) {
    console.error('Error retrieving user signature:', error);
    return null;
  }
};

/**
 * Get the user's signature history
 * @returns Array of signature objects
 */
export const getUserSignatureHistory = (): UserSignature[] => {
  try {
    const history = localStorage.getItem('user_signature_history');
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error retrieving user signature history:', error);
    return [];
  }
};

/**
 * Clear all saved signatures
 */
export const clearSignatures = (): void => {
  localStorage.removeItem('user_signature');
  localStorage.removeItem('user_signature_history');
};
