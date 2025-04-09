// This file serves as the main entry point for Podio API services

// Export authentication-related functions
export {
  authenticateUser,
  isPodioConfigured,
  refreshPodioToken,
  callPodioApi,
  authenticateWithClientCredentials,
  validateContactsAppAccess,
  clearTokens as clearPodioTokens,
  PODIO_CONTACTS_APP_ID,
  PODIO_PACKING_SPEC_APP_ID,
  CONTACT_FIELD_IDS,
  PACKING_SPEC_FIELD_IDS,
  isRateLimited,
  isRateLimitedWithInfo,
  setRateLimit,
  clearRateLimit,
  clearRateLimitInfo,
  cacheUserData,
  getCachedUserData
} from './podio/podioAuth';

// Export OAuth-related functions
export {
  getPodioClientId,
  getPodioClientSecret,
  getPodioRedirectUri,
  generatePodioAuthState,
  getPodioAuthUrl,
  validatePodioAuthState
} from './podio/podioOAuth';

// Export packing specs related functions, types and constants
export {
  getPackingSpecsForContact,
  getPackingSpecDetails,
  updatePackingSpecStatus,
  PODIO_CATEGORIES,
  type PackingSpec
} from './podio/podioPackingSpecs';

// Export field helper functions from the correct file
export {
  getFieldValueByExternalId,
  getFieldIdValue,
  getDateFieldValue,
  extractPodioImages,
  mapPodioStatusToAppStatus
} from './podio/podioFieldHelpers';

// Export comment functions
export const getCommentsFromPodio = async (itemId: number) => {
  console.log('Placeholder: getCommentsFromPodio called with ID:', itemId);
  return [];
};

export const addCommentToPodio = async (itemId: number, comment: string) => {
  console.log('Placeholder: addCommentToPodio called', { itemId, comment });
  return true;
};

export const addCommentToPackingSpec = async (specId: number, comment: string) => {
  console.log('Placeholder: addCommentToPackingSpec called', { specId, comment });
  return true;
};

// Placeholder comment item type
export interface CommentItem {
  id: number;
  text: string;
  createdBy: string;
  createdAt: string;
}

// Placeholder file upload related functions
export const uploadFileToPodio = async (file: File, itemId: number, fieldId: number) => {
  console.log('Placeholder: uploadFileToPodio called', { itemId, fieldId });
  return { fileId: 12345, name: file.name };
};

export const shouldProceedWithoutSignature = () => {
  return false;
};
